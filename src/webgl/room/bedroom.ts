import * as THREE from 'three';
import { seededRandom } from '@/core/math';
import { mesh, place, type ClayPalette } from './clay';
import { BED, BED_FOOT_Z, INNER } from './layout';
import { cushion, draped, foliage, roundedBox, type Foliage, type LeafCluster } from './shapes';
import { horizonPrint, seascapePrint, woven } from './textures';

const TREE_LEAVES: readonly LeafCluster[] = [
  { center: [0.04, 1.62, 0.05], radius: 0.27, count: 220 },
  { center: [0.27, 1.42, 0.08], radius: 0.19, count: 110 },
  { center: [-0.1, 1.38, 0.2], radius: 0.18, count: 100 },
  { center: [0.12, 1.2, 0.26], radius: 0.14, count: 70 },
  { center: [-0.02, 1.86, 0.0], radius: 0.14, count: 60 },
];

const TREE_BRANCHES = [
  [
    new THREE.Vector3(0.02, 1.05, 0.03),
    new THREE.Vector3(0.15, 1.27, 0.06),
    new THREE.Vector3(0.27, 1.42, 0.08),
  ],
  [
    new THREE.Vector3(0.0, 1.12, 0.04),
    new THREE.Vector3(-0.05, 1.27, 0.12),
    new THREE.Vector3(-0.1, 1.38, 0.2),
  ],
  [
    new THREE.Vector3(0.03, 0.95, 0.03),
    new THREE.Vector3(0.08, 1.08, 0.16),
    new THREE.Vector3(0.12, 1.2, 0.26),
  ],
];

const SPRIG_LEAVES: readonly LeafCluster[] = [{ center: [0, 0.2, 0], radius: 0.07, count: 36 }];

export interface Bedroom {
  group: THREE.Group;
  lampLight: THREE.PointLight;
}

export function buildBedroom(palette: ClayPalette): Bedroom {
  const group = new THREE.Group();
  group.add(buildBed(palette));
  group.add(place(buildNightstand(palette), BED.x - BED.width / 2 - 0.36, 0, -INNER + 0.26));
  group.add(place(buildNightstand(palette), BED.x + BED.width / 2 + 0.36, 0, -INNER + 0.26));
  const lamp = buildLamp(palette);
  group.add(place(lamp.group, BED.x + BED.width / 2 + 0.36, 0.46, -INNER + 0.22));
  group.add(place(buildPottedSprig(palette), BED.x - BED.width / 2 - 0.42, 0.46, -INNER + 0.24));
  group.add(place(buildBookStack(palette, 3, 11), BED.x - BED.width / 2 - 0.28, 0.46, -INNER + 0.3, 0.3));
  group.add(buildFrames(palette));
  group.add(place(buildTree(palette), -INNER + 0.34, 0, -INNER + 0.36));
  const rug = mesh(
    roundedBox(2.4, 0.014, 1.5, 0.006),
    palette.get(0.9, { map: woven(), roughness: 1 }),
    false,
  );
  rug.position.set(BED.x - 0.1, 0.008, BED_FOOT_Z + 0.42);
  group.add(rug);
  return { group, lampLight: lamp.light };
}

function buildBed(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const centerZ = -INNER + BED.length / 2;
  const frame = mesh(
    roundedBox(BED.width, BED.frameHeight, BED.length, 0.05),
    palette.get(0.2, { roughness: 0.8 }),
  );
  frame.position.set(BED.x, BED.frameHeight / 2 + 0.03, centerZ);
  group.add(frame);
  const mattressHeight = BED.mattressTop - BED.frameHeight - 0.03;
  const mattress = mesh(
    roundedBox(BED.width - 0.1, mattressHeight, BED.length - 0.1, 0.07, 4),
    palette.get(0.92, { roughness: 0.95 }),
  );
  mattress.position.set(BED.x, BED.frameHeight + 0.03 + mattressHeight / 2, centerZ);
  group.add(mattress);
  const duvetDepth = BED.length * 0.66;
  const duvet = mesh(
    draped(BED.width - 0.02, duvetDepth, 0.3, 0.035, 4),
    palette.get(0.42, { roughness: 0.92, side: THREE.DoubleSide }),
  );
  duvet.position.set(BED.x, BED.mattressTop, BED_FOOT_Z - 0.04 - duvetDepth / 2);
  group.add(duvet);
  const fold = mesh(roundedBox(BED.width - 0.02, 0.05, 0.16, 0.025), palette.get(0.4, { roughness: 0.9 }));
  fold.position.set(BED.x, BED.mattressTop + 0.03, BED_FOOT_Z - 0.04 - duvetDepth + 0.02);
  group.add(fold);
  for (const side of [-1, 1]) {
    const board = mesh(
      roundedBox(BED.width / 2 - 0.03, 0.66, 0.11, 0.05, 4),
      palette.get(0.27, { roughness: 0.85 }),
    );
    board.position.set(BED.x + side * (BED.width / 4), 0.74, -INNER + 0.07);
    group.add(board);
    const pillow = mesh(cushion(0.62, 0.12, 0.42, 0.05, 2 + side), palette.get(0.88, { roughness: 0.95 }));
    pillow.position.set(BED.x + side * 0.38, BED.mattressTop + 0.12, -INNER + 0.32);
    pillow.rotation.x = -0.42;
    group.add(pillow);
    const accent = mesh(cushion(0.5, 0.11, 0.32, 0.045, 5 + side), palette.get(0.36, { roughness: 0.9 }));
    accent.position.set(BED.x + side * 0.33, BED.mattressTop + 0.1, -INNER + 0.56);
    accent.rotation.set(-0.5, side * 0.12, 0);
    group.add(accent);
  }
  return group;
}

function buildNightstand(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const body = mesh(roundedBox(0.5, 0.44, 0.44, 0.025), palette.get(0.16, { roughness: 0.75 }));
  body.position.y = 0.24;
  group.add(body);
  const drawer = mesh(roundedBox(0.44, 0.012, 0.01, 0.004), palette.get(0.05));
  drawer.position.set(0, 0.32, 0.222);
  group.add(drawer);
  const legsMaterial = palette.get(0.12);
  for (const [x, z] of [
    [-0.2, -0.17],
    [0.2, -0.17],
    [-0.2, 0.17],
    [0.2, 0.17],
  ] as const) {
    const leg = mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.04, 10), legsMaterial);
    leg.position.set(x, 0.02, z);
    group.add(leg);
  }
  return group;
}

function buildLamp(palette: ClayPalette): { group: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();
  const metal = palette.get(0.75, { roughness: 0.35 });
  const base = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.025, 28), metal);
  base.position.y = 0.0125;
  const stem = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 12), metal);
  stem.position.y = 0.17;
  const shade = mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.2, 36, 1, true),
    palette.get(0.97, { emissive: 0.7, side: THREE.DoubleSide }),
  );
  shade.position.y = 0.36;
  const light = new THREE.PointLight(0xffffff, 1.6, 3.2, 1.6);
  light.position.y = 0.36;
  group.add(base, stem, shade, light);
  return { group, light };
}

function buildPottedSprig(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 24), palette.get(0.82, { roughness: 0.6 }));
  pot.position.y = 0.06;
  group.add(pot, ...leafMeshes(palette, foliage(SPRIG_LEAVES, 0.07, 9)));
  return group;
}

function leafMeshes(palette: ClayPalette, leaves: Foliage): THREE.Mesh[] {
  return [
    mesh(leaves.shade, palette.get(0.2, { roughness: 0.7, side: THREE.DoubleSide })),
    mesh(leaves.light, palette.get(0.34, { roughness: 0.66, side: THREE.DoubleSide })),
  ];
}

export function buildBookStack(palette: ClayPalette, count: number, seed: number): THREE.Group {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  let y = 0;
  for (let i = 0; i < count; i += 1) {
    const thickness = 0.025 + random() * 0.025;
    const book = mesh(
      roundedBox(0.16 + random() * 0.05, thickness, 0.22 + random() * 0.04, 0.004),
      palette.get(random() > 0.5 ? 0.12 : 0.85),
    );
    book.position.y = y + thickness / 2;
    book.rotation.y = (random() - 0.5) * 0.3;
    group.add(book);
    y += thickness;
  }
  return group;
}

function buildFrames(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const prints: readonly [THREE.Texture, number, number, number, number][] = [
    [seascapePrint(), 0.52, 0.66, BED.x - 0.32, 1.62],
    [horizonPrint(), 0.46, 0.58, BED.x + 0.34, 1.56],
  ];
  for (const [texture, width, height, x, y] of prints) {
    const frame = mesh(roundedBox(width, height, 0.035, 0.008), palette.get(0.62, { roughness: 0.6 }));
    frame.position.set(x, y, -INNER + 0.02);
    const art = mesh(
      new THREE.PlaneGeometry(width - 0.07, height - 0.07),
      palette.get(1, { map: texture, roughness: 0.9 }),
      false,
    );
    art.position.set(x, y, -INNER + 0.039);
    group.add(frame, art);
  }
  return group;
}

function buildTree(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.36, 32), palette.get(0.66, { roughness: 0.7 }));
  pot.position.y = 0.18;
  const rim = mesh(new THREE.TorusGeometry(0.195, 0.018, 10, 40), palette.get(0.66, { roughness: 0.7 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.36;
  const soil = mesh(new THREE.CircleGeometry(0.19, 32), palette.get(0.12), false);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.34;
  const trunkPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0.04, 0.8, 0.02),
    new THREE.Vector3(-0.02, 1.25, 0.05),
    new THREE.Vector3(0.03, 1.5, 0.02),
  ]);
  const bark = palette.get(0.22, { roughness: 0.9 });
  const trunk = mesh(new THREE.TubeGeometry(trunkPath, 24, 0.028, 10), bark);
  const branches = TREE_BRANCHES.map((points) =>
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, 0.012, 6), bark),
  );
  group.add(pot, rim, soil, trunk, ...branches, ...leafMeshes(palette, foliage(TREE_LEAVES, 0.11, 21)));
  return group;
}
