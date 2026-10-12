import * as THREE from 'three';

export const SHELL = {
  half: 2.2,
  wall: 0.14,
  height: 2.7,
  slab: 0.16,
  window: { zStart: -1.65, zEnd: -0.45, yStart: 0.95, yEnd: 2.1 },
} as const;

export const INNER = SHELL.half - SHELL.wall;

export const BED = { x: 0.55, width: 1.72, length: 2.15, frameHeight: 0.26, mattressTop: 0.48 } as const;
export const BED_FOOT_Z = -INNER + BED.length;

export const DESK = { x: -1.7, z: 1.15, depth: 0.72, width: 1.4, height: 0.74 } as const;
export const MONITOR = { x: -1.86, y: 1.1, z: DESK.z, width: 0.62, height: 0.36 } as const;
export const KEYBOARD = new THREE.Vector3(-1.55, 0.771, DESK.z);
export const CHAIR = { x: -1.0, z: DESK.z, seat: 0.5 } as const;

export const SPOTS = {
  bed: { position: new THREE.Vector3(0.42, 0, 0.14), yaw: 0.66, seatDrop: 0.43, seatBack: 0.085 },
  chair: { position: new THREE.Vector3(-1.08, 0, DESK.z), yaw: -Math.PI / 2, seatDrop: 0.44, seatBack: 0.08 },
} as const;

export const WALK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.42, 0, 0.14),
  new THREE.Vector3(0.12, 0, 0.62),
  new THREE.Vector3(-0.45, 0, 0.86),
  new THREE.Vector3(-0.86, 0, 1.06),
  new THREE.Vector3(-1.08, 0, DESK.z),
]);

export const HANDS = {
  left: new THREE.Vector3(-1.53, 0.8, DESK.z + 0.13),
  right: new THREE.Vector3(-1.53, 0.8, DESK.z - 0.13),
  leftPole: new THREE.Vector3(-1.15, 0.55, DESK.z + 0.6),
  rightPole: new THREE.Vector3(-1.15, 0.55, DESK.z - 0.6),
} as const;

export const SCREEN_CENTER = new THREE.Vector3(MONITOR.x + 0.02, MONITOR.y, MONITOR.z);
export const SCREEN_ENTRY = new THREE.Vector3(MONITOR.x + 0.08, MONITOR.y + 0.07, MONITOR.z);
export const SCREEN_FOCUS = new THREE.Vector3(MONITOR.x - 0.4, MONITOR.y + 0.07, MONITOR.z);

export const CAMERA = {
  overviewTarget: new THREE.Vector3(0.05, 0.62, 0.05),
  overviewDirection: new THREE.Vector3(1, 0.86, 1).normalize(),
  overviewDistance: 12.6,
  shoulderPosition: new THREE.Vector3(-0.2, 1.52, 1.72),
  shoulderTarget: new THREE.Vector3(-1.82, 1.04, 1.02),
} as const;
