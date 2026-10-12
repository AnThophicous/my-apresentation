import * as THREE from 'three';
import { Track } from '@/core/Track';

export const OCEAN_TIMING = {
  revealEnd: 0.085,
  descentStart: 0.3,
  crossing: 0.352,
  doorwayStart: 0.8,
  fadeStart: 0.955,
} as const;

const HEIGHT = new Track([
  [0, 2.4],
  [0.3, 2.1],
  [0.335, 0.7],
  [0.36, -1.1],
  [0.42, -4.5],
  [0.6, -17],
  [0.78, -35],
  [0.9, -50],
  [1, -57],
]);

const PITCH = new Track([
  [0, 0],
  [0.09, 0],
  [0.27, -1.5],
  [0.33, -10],
  [0.37, -3],
  [0.44, 24],
  [0.56, 15],
  [0.7, 3],
  [0.82, -7],
  [0.92, -9],
  [1, -2],
]);

const TRAVEL = new Track([
  [0, 0],
  [0.3, 16],
  [0.42, 24],
  [0.85, 58],
  [1, 84],
]);

export interface OceanPose {
  position: THREE.Vector3;
  pitch: number;
  yaw: number;
}

export function sampleOceanPose(progress: number, pose: OceanPose): OceanPose {
  pose.position.set(Math.sin(progress * 5) * 1.4, HEIGHT.sample(progress), -TRAVEL.sample(progress));
  pose.pitch = THREE.MathUtils.degToRad(PITCH.sample(progress));
  pose.yaw = Math.sin(progress * 4.2) * THREE.MathUtils.degToRad(5);
  return pose;
}
