import * as THREE from 'three';
import noise from '@/webgl/glsl/noise.glsl?raw';
import atmosphere from './atmosphere.glsl?raw';
import fragmentMain from './ocean.frag.glsl?raw';
import vertexShader from './ocean.vert.glsl?raw';
import { packWaves, type Wave } from './waves';

export interface OceanGrid {
  rings: number;
  segments: number;
  innerRadius: number;
  outerRadius: number;
}

const ORIGIN_SNAP = 4;

export function createPolarGrid({
  rings,
  segments,
  innerRadius,
  outerRadius,
}: OceanGrid): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const radius = innerRadius * Math.pow(outerRadius / innerRadius, ring / (rings - 1));
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + ((segment + 1) % segments), 1 + segment);
  }
  for (let ring = 0; ring < rings - 1; ring += 1) {
    const current = 1 + ring * segments;
    const next = current + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const a = current + segment;
      const b = current + ((segment + 1) % segments);
      const c = next + segment;
      const d = next + ((segment + 1) % segments);
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export class OceanSurface {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor(grid: OceanGrid, waves: readonly Wave[], sharedUniforms: Record<string, THREE.IUniform>) {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: [noise, atmosphere, fragmentMain].join('\n'),
      defines: { WAVE_COUNT: waves.length },
      side: THREE.DoubleSide,
      uniforms: {
        ...sharedUniforms,
        uWaves: { value: packWaves(waves) },
        uWaveTime: { value: 0 },
        uWaveScale: { value: 1 },
        uRingDensity: { value: (grid.rings - 1) / Math.log(grid.outerRadius / grid.innerRadius) },
        uOrigin: { value: new THREE.Vector2() },
        uDeepTone: { value: 0.012 },
        uScatterTone: { value: 0.05 },
        uFoamAmount: { value: 0.7 },
        uCloudShadow: { value: 0.85 },
        uHazeDensity: { value: 0.0011 },
        uSunIntensity: { value: 1 },
        uDetailScale: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(createPolarGrid(grid), this.material);
    this.mesh.frustumCulled = false;
  }

  follow(camera: THREE.Camera): void {
    const origin = this.material.uniforms.uOrigin!.value as THREE.Vector2;
    origin.set(
      Math.round(camera.position.x / ORIGIN_SNAP) * ORIGIN_SNAP,
      Math.round(camera.position.z / ORIGIN_SNAP) * ORIGIN_SNAP,
    );
  }
}
