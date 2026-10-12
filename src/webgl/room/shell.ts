import * as THREE from 'three';
import { mesh, type ClayPalette } from './clay';
import { INNER, SHELL } from './layout';
import { roundedBox } from './shapes';
import { floorPlanks } from './textures';

const WALL_TONE = 0.86;
const SLAB_TONE = 0.95;

export function buildShell(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const { half, wall, height, slab } = SHELL;
  const wallMaterial = palette.get(WALL_TONE, { roughness: 0.95 });
  const slabMesh = mesh(
    roundedBox(half * 2, slab, half * 2, 0.025),
    palette.get(SLAB_TONE, { roughness: 0.9 }),
  );
  slabMesh.position.y = -slab / 2;
  group.add(slabMesh);

  const floor = mesh(
    new THREE.PlaneGeometry(half + INNER, half + INNER),
    palette.get(1, { map: floorPlanks(), roughness: 0.7 }),
    false,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((half - INNER) / 2 + 0.0, 0.002, (half - INNER) / 2);
  group.add(floor);

  const back = mesh(roundedBox(half * 2, height, wall, 0.012), wallMaterial);
  back.position.set(0, height / 2, -half + wall / 2);
  group.add(back);

  const { zStart, zEnd, yStart, yEnd } = SHELL.window;
  const x = -half + wall / 2;
  const segments: readonly [number, number, number, number][] = [
    [-half, half, 0, yStart],
    [-half, half, yEnd, height],
    [-half, zStart, yStart, yEnd],
    [zEnd, half, yStart, yEnd],
  ];
  for (const [z0, z1, y0, y1] of segments) {
    const piece = mesh(roundedBox(wall, y1 - y0, z1 - z0, 0.01), wallMaterial);
    piece.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    group.add(piece);
  }
  group.add(buildWindow(palette, x));
  return group;
}

function buildWindow(palette: ClayPalette, x: number): THREE.Group {
  const group = new THREE.Group();
  const { zStart, zEnd, yStart, yEnd } = SHELL.window;
  const width = zEnd - zStart;
  const tall = yEnd - yStart;
  const centerZ = (zStart + zEnd) / 2;
  const centerY = (yStart + yEnd) / 2;
  const frame = palette.get(0.97, { roughness: 0.6 });
  const bar = (w: number, h: number, d: number, py: number, pz: number): void => {
    const piece = mesh(roundedBox(w, h, d, 0.006), frame);
    piece.position.set(x + 0.02, py, pz);
    group.add(piece);
  };
  bar(0.12, 0.05, width + 0.08, yStart, centerZ);
  bar(0.12, 0.05, width + 0.08, yEnd, centerZ);
  bar(0.12, tall, 0.05, centerY, zStart);
  bar(0.12, tall, 0.05, centerY, zEnd);
  bar(0.08, tall, 0.035, centerY, centerZ);
  bar(0.2, 0.035, width + 0.18, yStart - 0.03, centerZ);
  const glass = mesh(
    new THREE.PlaneGeometry(width, tall),
    palette.get(1, { emissive: 1.25, roughness: 0.2 }),
    false,
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(x - 0.02, centerY, centerZ);
  glass.castShadow = false;
  group.add(glass);
  const slat = palette.get(0.93, { roughness: 0.7 });
  for (let i = 0; i < 11; i += 1) {
    const piece = mesh(roundedBox(0.045, 0.008, width - 0.04, 0.003), slat);
    piece.position.set(x + 0.075, yEnd - 0.06 - i * 0.045, centerZ);
    piece.rotation.z = -0.5;
    group.add(piece);
  }
  const rail = mesh(roundedBox(0.07, 0.05, width + 0.02, 0.01), slat);
  rail.position.set(x + 0.08, yEnd - 0.02, centerZ);
  group.add(rail);
  return group;
}
