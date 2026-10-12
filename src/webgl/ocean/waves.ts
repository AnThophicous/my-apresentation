import * as THREE from 'three';

export interface Wave {
  directionX: number;
  directionZ: number;
  steepness: number;
  wavelength: number;
}

const GRAVITY = 9.81;

export const SWELL: readonly Wave[] = [
  { directionX: 0.05, directionZ: 1, steepness: 0.17, wavelength: 62 },
  { directionX: 0.32, directionZ: 1, steepness: 0.15, wavelength: 34 },
  { directionX: -0.42, directionZ: 1, steepness: 0.13, wavelength: 21 },
  { directionX: 0.72, directionZ: 0.68, steepness: 0.1, wavelength: 12.5 },
  { directionX: -0.81, directionZ: 0.58, steepness: 0.085, wavelength: 7.3 },
  { directionX: 0.22, directionZ: -1, steepness: 0.06, wavelength: 4.6 },
  { directionX: 0.91, directionZ: 0.38, steepness: 0.05, wavelength: 3.1 },
  { directionX: -0.33, directionZ: 0.94, steepness: 0.04, wavelength: 1.9 },
];

export function packWaves(waves: readonly Wave[]): THREE.Vector4[] {
  return waves.map(
    (wave) => new THREE.Vector4(wave.directionX, wave.directionZ, wave.steepness, wave.wavelength),
  );
}

export function waveHeight(
  waves: readonly Wave[],
  x: number,
  z: number,
  time: number,
  scale: number,
): number {
  let height = 0;
  for (const wave of waves) {
    const length = Math.hypot(wave.directionX, wave.directionZ);
    const k = (Math.PI * 2) / wave.wavelength;
    const speed = Math.sqrt(GRAVITY / k);
    const phase = k * ((wave.directionX / length) * x + (wave.directionZ / length) * z - speed * time);
    height += ((wave.steepness * scale) / k) * Math.sin(phase);
  }
  return height;
}
