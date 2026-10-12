import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '@/core/math';

export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius = 0.02,
  segments = 3,
): THREE.BufferGeometry {
  return new RoundedBoxGeometry(
    width,
    height,
    depth,
    segments,
    Math.min(radius, width / 2, height / 2, depth / 2),
  );
}

export function cushion(
  width: number,
  height: number,
  depth: number,
  puff: number,
  seed: number,
): THREE.BufferGeometry {
  const geometry = roundedBox(width, height, depth, Math.min(height, depth) * 0.45, 6);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const random = seededRandom(seed);
  const wobble = random() * Math.PI;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i) / (width / 2);
    const z = position.getZ(i) / (depth / 2);
    const bulge = (1 - x * x) * (1 - z * z);
    const y = position.getY(i);
    position.setY(i, y + Math.sign(y) * bulge * puff + Math.sin(x * 3 + wobble) * puff * 0.08);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function draped(
  width: number,
  depth: number,
  drop: number,
  thickness: number,
  seed: number,
): THREE.BufferGeometry {
  const segmentsX = 48;
  const segmentsZ = 56;
  const plane = new THREE.PlaneGeometry(width + drop * 2, depth + drop, segmentsX, segmentsZ);
  plane.rotateX(-Math.PI / 2);
  plane.translate(0, 0, drop / 2);
  const position = plane.getAttribute('position') as THREE.BufferAttribute;
  const random = seededRandom(seed);
  const folds = Array.from({ length: 5 }, () => ({
    x: random() * width - width / 2,
    phase: random() * 6,
    amp: 0.008 + random() * 0.016,
  }));
  for (let i = 0; i < position.count; i += 1) {
    let x = position.getX(i);
    let z = position.getZ(i);
    let y = 0;
    const overSide = Math.max(0, Math.abs(x) - width / 2);
    if (overSide > 0) {
      x = Math.sign(x) * (width / 2 + overSide * 0.12);
      y -= overSide * 0.98;
    }
    const overFoot = Math.max(0, z - depth / 2);
    if (overFoot > 0) {
      z = depth / 2 + overFoot * 0.12;
      y -= overFoot * 0.98;
    }
    for (const fold of folds)
      y +=
        Math.pow(Math.sin((x - fold.x) * 9 + fold.phase) * 0.5 + 0.5, 2) *
        fold.amp *
        Math.exp(-Math.abs(z - depth * 0.1) * 0.8);
    y += (Math.sin(z * 6 + x * 2) * 0.5 + 0.5) * 0.006;
    position.setXYZ(i, x, y + thickness, z);
  }
  plane.computeVertexNormals();
  return plane;
}

export interface LeafCluster {
  center: readonly [number, number, number];
  radius: number;
  count: number;
}

export interface Foliage {
  shade: THREE.BufferGeometry;
  light: THREE.BufferGeometry;
}

export function foliage(clusters: readonly LeafCluster[], leafLength: number, seed: number): Foliage {
  const random = seededRandom(seed);
  const blade = leafBlade();
  const shade: THREE.BufferGeometry[] = [];
  const light: THREE.BufferGeometry[] = [];
  const outward = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const along = new THREE.Vector3();
  const side = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i += 1) {
      const height = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - height * height);
      outward.set(ring * Math.cos(angle), height * 0.82, ring * Math.sin(angle)).normalize();
      const depth = Math.cbrt(0.3 + random() * 0.7) * cluster.radius;
      along.set(random() - 0.5, -0.35 - random() * 0.5, random() - 0.5);
      along.addScaledVector(outward, -along.dot(outward));
      if (along.lengthSq() < 1e-4) along.set(1, 0, 0).addScaledVector(outward, -outward.x);
      along.normalize().addScaledVector(outward, 0.55).normalize();
      normal.copy(outward).addScaledVector(along, -outward.dot(along)).normalize();
      side.crossVectors(normal, along);
      const scale = leafLength * (0.72 + random() * 0.5);
      basis.makeBasis(side, normal, along).scale(new THREE.Vector3(scale, scale, scale));
      basis.setPosition(
        cluster.center[0] + outward.x * depth,
        cluster.center[1] + outward.y * depth,
        cluster.center[2] + outward.z * depth,
      );
      (random() < 0.42 ? light : shade).push(blade.clone().applyMatrix4(basis));
    }
  }
  return { shade: mergeGeometries(shade), light: mergeGeometries(light) };
}

function leafBlade(): THREE.BufferGeometry {
  const lengthSegments = 6;
  const widthSegments = 4;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= lengthSegments; i += 1) {
    const u = i / lengthSegments;
    const halfWidth = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.75) * 0.21 * (1 - u * 0.25);
    for (let j = 0; j <= widthSegments; j += 1) {
      const v = (j / widthSegments) * 2 - 1;
      const x = v * halfWidth;
      positions.push(x, Math.abs(x) * 0.55 - u * u * 0.18, u);
    }
  }
  const row = widthSegments + 1;
  for (let i = 0; i < lengthSegments; i += 1) {
    for (let j = 0; j < widthSegments; j += 1) {
      const a = i * row + j;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
