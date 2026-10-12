import * as THREE from 'three';
import type { QualityProfile } from '@/core/Quality';
import { seededRandom } from '@/core/math';
import type { ViewportSize } from '@/core/Viewport';
import type { View } from '@/webgl/View';
import billboardVertex from './billboard.vert.glsl?raw';
import diskVertex from './disk.vert.glsl?raw';
import glowFragment from './glow.frag.glsl?raw';
import lens from './lens.glsl?raw';
import shadowFragment from './shadow.frag.glsl?raw';
import skyFragment from './sky.frag.glsl?raw';
import skyVertex from './sky.vert.glsl?raw';

export const HORIZON = {
  shadow: 2.6,
  inner: 3,
  outer: 15,
} as const;

const RING_COUNT: Record<QualityProfile['tier'], number> = { low: 64, medium: 96, high: 128 };
const RING_SEGMENTS: Record<QualityProfile['tier'], number> = { low: 220, medium: 320, high: 420 };
const STAR_COUNT: Record<QualityProfile['tier'], number> = { low: 1800, medium: 3200, high: 4800 };
const SKY_RADIUS = 320;
const LENS_STRENGTH = 0.62;

export interface BlackHoleState {
  time: number;
  pixelRatio: number;
  intensity: number;
}

export class BlackHoleView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(46, 1, 0.05, 1200);
  private readonly lensUniform = { value: LENS_STRENGTH };
  private readonly timeUniform = { value: 0 };
  private readonly intensityUniform = { value: 1 };
  private readonly pixelRatioUniform = { value: 1 };

  constructor(quality: QualityProfile) {
    this.scene.background = new THREE.Color(0, 0, 0);
    const disk = createDiskGeometry(RING_COUNT[quality.tier], RING_SEGMENTS[quality.tier]);
    const sky = createSkyGeometry(STAR_COUNT[quality.tier]);
    for (const image of [1, -1]) {
      this.scene.add(this.createDisk(disk, image));
      this.scene.add(this.createSky(sky, image));
    }
    this.scene.add(this.createShadow());
    this.scene.add(this.createPhotonRing(HORIZON.shadow * 1.012, 1.6));
    this.scene.add(this.createPhotonRing(HORIZON.shadow * 1.075, 0.35));
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.updateProjectionMatrix();
  }

  update(state: BlackHoleState): void {
    this.timeUniform.value = state.time;
    this.pixelRatioUniform.value = state.pixelRatio;
    this.intensityUniform.value = state.intensity;
  }

  private createDisk(geometry: THREE.BufferGeometry, image: number): THREE.LineSegments {
    const material = new THREE.ShaderMaterial({
      vertexShader: [lens, diskVertex].join('\n'),
      fragmentShader: glowFragment,
      uniforms: {
        uLensStrength: this.lensUniform,
        uTime: this.timeUniform,
        uIntensity: this.intensityUniform,
        uGain: { value: image > 0 ? 1.25 : 0.9 },
        uImage: { value: image },
        uSpin: { value: 1.8 },
        uInner: { value: HORIZON.inner },
        uOuter: { value: HORIZON.outer },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    return lines;
  }

  private createSky(geometry: THREE.BufferGeometry, image: number): THREE.Points {
    const material = new THREE.ShaderMaterial({
      vertexShader: [lens, skyVertex].join('\n'),
      fragmentShader: skyFragment,
      uniforms: {
        uLensStrength: this.lensUniform,
        uTime: this.timeUniform,
        uImage: { value: image },
        uPixelRatio: this.pixelRatioUniform,
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  private createShadow(): THREE.Mesh {
    const material = new THREE.ShaderMaterial({
      vertexShader: billboardVertex,
      fragmentShader: shadowFragment,
      uniforms: { uRadius: { value: HORIZON.shadow } },
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 128), material);
    shadow.frustumCulled = false;
    shadow.renderOrder = -1;
    return shadow;
  }

  private createPhotonRing(radius: number, intensity: number): THREE.LineLoop {
    const points = Array.from({ length: 256 }, (_, index) => {
      const angle = (index / 256) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    });
    const material = new THREE.ShaderMaterial({
      vertexShader: billboardVertex,
      fragmentShader: glowFragment,
      uniforms: {
        uRadius: { value: radius },
        uIntensity: this.intensityUniform,
        uGain: { value: intensity },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
    ring.frustumCulled = false;
    return ring;
  }
}

function createDiskGeometry(rings: number, segments: number): THREE.BufferGeometry {
  const random = seededRandom(31);
  const radius = new Float32Array(rings * segments);
  const angle = new Float32Array(rings * segments);
  const seed = new Float32Array(rings * segments);
  const position = new Float32Array(rings * segments * 3);
  const indices: number[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const t = ring / (rings - 1);
    const ringRadius =
      HORIZON.inner + (HORIZON.outer - HORIZON.inner) * Math.pow(t, 1.55) + (random() - 0.5) * 0.04;
    const ringSeed = random();
    const phase = random() * Math.PI * 2;
    for (let segment = 0; segment < segments; segment += 1) {
      const index = ring * segments + segment;
      const theta = phase + (segment / segments) * Math.PI * 2;
      radius[index] = ringRadius;
      angle[index] = theta;
      seed[index] = ringSeed;
      position[index * 3] = Math.cos(theta) * ringRadius;
      position[index * 3 + 2] = Math.sin(theta) * ringRadius;
      indices.push(index, ring * segments + ((segment + 1) % segments));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setIndex(indices);
  return geometry;
}

function createSkyGeometry(count: number): THREE.BufferGeometry {
  const random = seededRandom(57);
  const position = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const brightness = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const z = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    position[i * 3] = Math.cos(theta) * ring * SKY_RADIUS;
    position[i * 3 + 1] = z * SKY_RADIUS;
    position[i * 3 + 2] = Math.sin(theta) * ring * SKY_RADIUS;
    const magnitude = Math.pow(random(), 6);
    size[i] = 1.6 + magnitude * 5.5;
    brightness[i] = 0.25 + magnitude * 2.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  return geometry;
}
