import * as THREE from 'three';
import { seededRandom } from '@/core/math';

export interface ShardLayout {
  width: number;
  height: number;
  impactX: number;
  impactY: number;
  count: number;
  seed: number;
}

type Point = readonly [number, number];

const RING_CRACK = 1;
const RAY_CRACK = 2;

interface Triangle {
  corners: readonly [Point, Point, Point];
  cracks: readonly [number, number, number];
}

export function createShardGeometry(
  layout: ShardLayout,
  planeWidth: number,
  planeHeight: number,
): THREE.BufferGeometry {
  const triangles = fracture(layout);
  const reach = farthestCorner(layout);
  const random = seededRandom(layout.seed + 7);
  const count = triangles.length;
  const position = new Float32Array(count * 9);
  const centroid = new Float32Array(count * 9);
  const uv = new Float32Array(count * 6);
  const bary = new Float32Array(count * 9);
  const cracks = new Float32Array(count * 9);
  const seeds = new Float32Array(count * 12);
  const distance = new Float32Array(count * 3);
  const toWorld = (x: number, y: number): [number, number] => [
    (x / layout.width - 0.5) * planeWidth,
    (0.5 - y / layout.height) * planeHeight,
  ];
  triangles.forEach((triangle, t) => {
    const cx = (triangle.corners[0][0] + triangle.corners[1][0] + triangle.corners[2][0]) / 3;
    const cy = (triangle.corners[0][1] + triangle.corners[1][1] + triangle.corners[2][1]) / 3;
    const [worldX, worldY] = toWorld(cx, cy);
    const shardSeeds = [random(), random(), random(), random()];
    const normalizedDistance = Math.hypot(cx - layout.impactX, cy - layout.impactY) / reach;
    triangle.corners.forEach(([x, y], corner) => {
      const vertex = t * 3 + corner;
      const [px, py] = toWorld(x, y);
      position.set([px, py, 0], vertex * 3);
      centroid.set([worldX, worldY, 0], vertex * 3);
      uv.set([x / layout.width, 1 - y / layout.height], vertex * 2);
      bary.set([corner === 0 ? 1 : 0, corner === 1 ? 1 : 0, corner === 2 ? 1 : 0], vertex * 3);
      cracks.set(triangle.cracks, vertex * 3);
      seeds.set(shardSeeds, vertex * 4);
      distance[vertex] = normalizedDistance;
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aCentroid', new THREE.BufferAttribute(centroid, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));
  geometry.setAttribute('aCracks', new THREE.BufferAttribute(cracks, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aDistance', new THREE.BufferAttribute(distance, 1));
  return geometry;
}

function fracture(layout: ShardLayout): Triangle[] {
  const random = seededRandom(layout.seed);
  const rays = Math.round(Math.sqrt(layout.count) * 0.75);
  const rings = Math.max(6, Math.round(layout.count / rays / 4));
  const reach = farthestCorner(layout) * 1.04;
  const innermost = 10;
  const growth = Math.pow(reach / innermost, 1 / (rings - 1));
  const angles = Array.from(
    { length: rays },
    (_, index) => ((index + (random() - 0.5) * 0.7) / rays) * Math.PI * 2,
  );
  const grid = Array.from({ length: rings }, (_, ring) => {
    const radius = innermost * Math.pow(growth, ring);
    return angles.map((angle) => {
      const bend = (random() - 0.5) * 0.09;
      const wobble = radius * (1 + (random() - 0.5) * 0.16);
      return [
        layout.impactX + Math.cos(angle + bend) * wobble,
        layout.impactY + Math.sin(angle + bend) * wobble,
      ] as Point;
    });
  });
  const center: Point = [layout.impactX, layout.impactY];
  const triangles: Triangle[] = [];
  for (let ray = 0; ray < rays; ray += 1) {
    const next = (ray + 1) % rays;
    triangles.push({
      corners: [center, grid[0]![ray]!, grid[0]![next]!],
      cracks: [RING_CRACK, RAY_CRACK, RAY_CRACK],
    });
  }
  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let ray = 0; ray < rays; ray += 1) {
      const next = (ray + 1) % rays;
      const quad: [Point, Point, Point, Point] = [
        grid[ring]![ray]!,
        grid[ring]![next]!,
        grid[ring + 1]![next]!,
        grid[ring + 1]![ray]!,
      ];
      triangles.push(...splitQuad(quad, random));
    }
  }
  return triangles;
}

function splitQuad([a, b, c, d]: [Point, Point, Point, Point], random: () => number): Triangle[] {
  const weights = [random() + 0.4, random() + 0.4, random() + 0.4, random() + 0.4];
  const total = weights[0]! + weights[1]! + weights[2]! + weights[3]!;
  const inner: Point = [
    (a[0] * weights[0]! + b[0] * weights[1]! + c[0] * weights[2]! + d[0] * weights[3]!) / total,
    (a[1] * weights[0]! + b[1] * weights[1]! + c[1] * weights[2]! + d[1] * weights[3]!) / total,
  ];
  return [
    { corners: [inner, a, b], cracks: [RING_CRACK, 0, 0] },
    { corners: [inner, b, c], cracks: [RAY_CRACK, 0, 0] },
    { corners: [inner, c, d], cracks: [RING_CRACK, 0, 0] },
    { corners: [inner, d, a], cracks: [RAY_CRACK, 0, 0] },
  ];
}

function farthestCorner(layout: ShardLayout): number {
  return Math.hypot(
    Math.max(layout.impactX, layout.width - layout.impactX),
    Math.max(layout.impactY, layout.height - layout.impactY),
  );
}
