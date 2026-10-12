import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { buildAnatomy, LAYERS } from './sculpt/anatomy.mjs';
import { composeBody, outsideBounds } from './sculpt/sdf.mjs';
import { extractSurface, gradient, relaxOntoSurface, sampleField } from './sculpt/surfaceNets.mjs';

const SOURCE_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Xbot.glb';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, '../public/models/person.glb');
const CELL = 0.0038;
const BLOCK = 8;
const WEIGHT_FALLOFF = 0.011;
const KEPT_ANIMATIONS = new Set(['idle', 'walk']);
const LAYER_TONES = { skin: 0.42, hair: 0.035, shirt: 0.88, pants: 0.055, sock: 0.7, shoe: 0.92, sole: 0.07 };
const SIMPLIFY_RATIOS = { skin: 0.3, hair: 0.3, shirt: 0.16, pants: 0.12, sock: 0.15, shoe: 0.2, sole: 0.12 };
const SIMPLIFY_ERROR = 0.0007;

async function loadSource() {
  const local = process.argv[2];
  if (local) return new Uint8Array(await readFile(local));
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Could not download the skeleton source (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function invert4(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ];
}

function readBindPositions(skin) {
  const matrices = skin.getInverseBindMatrices().getArray();
  const positions = {};
  skin.listJoints().forEach((joint, index) => {
    const inverse = invert4(Array.from(matrices.slice(index * 16, index * 16 + 16)));
    positions[joint.getName()] = [inverse[12], inverse[13], inverse[14]];
  });
  return positions;
}

function gridAround(parts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { shape } of parts) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], shape.bounds[axis]);
      max[axis] = Math.max(max[axis], shape.bounds[axis + 3]);
    }
  }
  const origin = min.map((value) => value - 0.02);
  const [nx, ny, nz] = max.map((value, axis) => Math.ceil((value + 0.02 - origin[axis]) / CELL) + 1);
  return { nx, ny, nz, origin, step: CELL, block: BLOCK };
}

function describeVertices(positions, body, jointIndex) {
  const count = positions.length / 3;
  const normals = new Float32Array(count * 3);
  const joints = new Uint16Array(count * 4);
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    normals.set(gradient(body.distance, x, y, z, 0.0006), i * 3);
    const nearby = [];
    let closest = Infinity;
    for (const part of body.parts) {
      if (outsideBounds(part.shape.bounds, x, y, z, 0.05)) continue;
      const distance = part.shape.distance(x, y, z);
      nearby.push([part, distance]);
      closest = Math.min(closest, distance);
    }
    const byBone = new Map();
    for (const [part, distance] of nearby) {
      const weight = Math.exp(-Math.max(0, distance - closest) / WEIGHT_FALLOFF);
      if (weight > 0.02) byBone.set(part.bone, (byBone.get(part.bone) ?? 0) + weight);
    }
    const strongest = [...byBone.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = strongest.reduce((sum, [, weight]) => sum + weight, 0);
    strongest.forEach(([bone, weight], slot) => {
      joints[i * 4 + slot] = jointIndex.get(bone);
      weights[i * 4 + slot] = weight / total;
    });
  }
  return { normals, joints, weights };
}

function simplifyMesh(indices, positions, ratio) {
  const target = Math.floor((indices.length * ratio) / 3) * 3;
  const [result] = MeshoptSimplifier.simplify(indices, positions, 3, target, SIMPLIFY_ERROR, []);
  return result;
}

function compact(indices, attributes) {
  const remap = new Map();
  const order = [];
  for (const index of indices) {
    if (remap.has(index)) continue;
    remap.set(index, order.length);
    order.push(index);
  }
  const pick = (source, size, Type) => {
    const target = new Type(order.length * size);
    order.forEach((original, next) =>
      target.set(source.subarray(original * size, original * size + size), next * size),
    );
    return target;
  };
  return {
    indices: Uint32Array.from(indices, (index) => remap.get(index)),
    positions: pick(attributes.positions, 3, Float32Array),
    normals: pick(attributes.normals, 3, Float32Array),
    joints: pick(attributes.joints, 4, Uint16Array),
    weights: pick(attributes.weights, 4, Float32Array),
  };
}

function sculptLayer(name, parts, jointIndex) {
  const layerParts = parts.filter((part) => part.material === name);
  const body = composeBody(layerParts, 0.012);
  const coarse = composeBody(layerParts, 0.09);
  const grid = gridAround(layerParts.filter((part) => !part.carve));
  const field = sampleField(grid, body.distance, coarse.distance);
  const surface = extractSurface(field, grid);
  relaxOntoSurface(surface.positions, body.distance, 3, 0.0005);
  const described = describeVertices(surface.positions, body, jointIndex);
  const simplified = simplifyMesh(surface.indices, surface.positions, SIMPLIFY_RATIOS[name]);
  const layer = compact(simplified, { positions: surface.positions, ...described });
  console.log(`${name}: ${surface.indices.length / 3} -> ${layer.indices.length / 3} triangles`);
  return layer;
}

function replaceMesh(document, skin, layers) {
  const root = document.getRoot();
  const buffer = root.listBuffers()[0];
  const armature = root.listNodes().find((node) => node.getName() === 'Armature');
  for (const node of root.listNodes()) {
    if (!node.getMesh()) continue;
    node.getMesh().dispose();
    node.dispose();
  }
  root.listMaterials().forEach((material) => material.dispose());
  const accessor = (type, array) => document.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const mesh = document.createMesh('Person');
  for (const [name, layer] of layers) {
    const tone = LAYER_TONES[name];
    const material = document
      .createMaterial(name)
      .setBaseColorFactor([tone, tone, tone, 1])
      .setRoughnessFactor(0.7)
      .setMetallicFactor(0);
    mesh.addPrimitive(
      document
        .createPrimitive()
        .setAttribute('POSITION', accessor('VEC3', layer.positions))
        .setAttribute('NORMAL', accessor('VEC3', layer.normals))
        .setAttribute('JOINTS_0', accessor('VEC4', layer.joints))
        .setAttribute('WEIGHTS_0', accessor('VEC4', layer.weights))
        .setIndices(accessor('SCALAR', layer.indices))
        .setMaterial(material),
    );
  }
  armature.addChild(document.createNode('Person').setMesh(mesh).setSkin(skin));
  root
    .listAnimations()
    .forEach((animation) => !KEPT_ANIMATIONS.has(animation.getName()) && animation.dispose());
}

async function main() {
  await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const document = await io.readBinary(await loadSource());
  const skin = document.getRoot().listSkins()[0];
  const jointIndex = new Map(skin.listJoints().map((joint, index) => [joint.getName(), index]));
  const parts = buildAnatomy(readBindPositions(skin));
  const layers = new Map(LAYERS.map((name) => [name, sculptLayer(name, parts, jointIndex)]));
  replaceMesh(document, skin, layers);
  await document.transform(
    prune(),
    dedup(),
    resample(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, await io.writeBinary(document));
  console.log(`wrote ${OUTPUT}`);
}

await main();
