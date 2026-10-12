import * as THREE from 'three';
import { CONSTELLATIONS, type MemoryEntry } from '@/content/stars';
import type { QualityProfile } from '@/core/Quality';
import { seededRandom } from '@/core/math';
import type { ViewportSize } from '@/core/Viewport';
import type { View } from '@/webgl/View';
import dustFragment from './dust.frag.glsl?raw';
import dustVertex from './dust.vert.glsl?raw';
import linkFragment from './link.frag.glsl?raw';
import linkVertex from './link.vert.glsl?raw';
import memoryFragment from './memory.frag.glsl?raw';
import memoryVertex from './memory.vert.glsl?raw';

const DUST_COUNT: Record<QualityProfile['tier'], number> = { low: 2600, medium: 5200, high: 8000 };
export const STAR_TUNNEL = { start: 60, end: -340, radius: 70 } as const;

export interface MemoryStar {
  position: THREE.Vector3;
  group: number;
  entry: MemoryEntry;
  focus: number;
}

export interface StarsState {
  time: number;
  pixelRatio: number;
  reveal: number;
  focusGroup: number;
}

export class StarsView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  readonly stars: MemoryStar[];
  private readonly time = { value: 0 };
  private readonly pixelRatio = { value: 1 };
  private readonly reveal = { value: 0 };
  private readonly linkReveal = { value: [0, 0, 0, 0] };
  private readonly focusGroup = { value: -1 };
  private readonly dustScale = { value: 60 };
  private readonly focusAttribute: THREE.BufferAttribute;

  constructor(quality: QualityProfile) {
    this.scene.background = new THREE.Color(0, 0, 0);
    this.stars = CONSTELLATIONS.flatMap((constellation, group) =>
      constellation.points.map(([x, y, z], index) => ({
        position: new THREE.Vector3(
          constellation.center[0] + x * constellation.scale[0],
          constellation.center[1] + y * constellation.scale[1],
          constellation.center[2] + z,
        ),
        group,
        entry: constellation.entries[index]!,
        focus: 0,
      })),
    );
    this.scene.add(this.createDust(DUST_COUNT[quality.tier]));
    const memory = this.createMemory();
    this.focusAttribute = memory.geometry.getAttribute('aFocus') as THREE.BufferAttribute;
    this.scene.add(this.createLinks(), memory);
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.fov = size.isPortrait ? 80 : 55;
    this.camera.updateProjectionMatrix();
    this.dustScale.value = size.height / 15;
  }

  setLinkReveal(group: number, value: number): void {
    this.linkReveal.value[group] = value;
  }

  update(state: StarsState): void {
    this.time.value = state.time;
    this.pixelRatio.value = state.pixelRatio;
    this.reveal.value = state.reveal;
    this.focusGroup.value = state.focusGroup;
    this.stars.forEach((star, index) => this.focusAttribute.setX(index, star.focus));
    this.focusAttribute.needsUpdate = true;
  }

  private createDust(count: number): THREE.Points {
    const random = seededRandom(91);
    const position = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const brightness = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = STAR_TUNNEL.radius * Math.sqrt(0.02 + random() * 0.98);
      position[i * 3] = Math.cos(angle) * radius;
      position[i * 3 + 1] = Math.sin(angle) * radius * 0.7;
      position[i * 3 + 2] = STAR_TUNNEL.start + (STAR_TUNNEL.end - STAR_TUNNEL.start) * random();
      const magnitude = Math.pow(random(), 4);
      size[i] = 0.6 + magnitude * 2.6;
      brightness[i] = 0.3 + magnitude * 1.6;
      phase[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: {
        uTime: this.time,
        uPixelRatio: this.pixelRatio,
        uScale: this.dustScale,
        uReveal: this.reveal,
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  private createMemory(): THREE.Points {
    const random = seededRandom(17);
    const geometry = new THREE.BufferGeometry().setFromPoints(this.stars.map((star) => star.position));
    geometry.setAttribute(
      'aMagnitude',
      new THREE.BufferAttribute(new Float32Array(this.stars.map((star) => star.entry.magnitude)), 1),
    );
    geometry.setAttribute('aFocus', new THREE.BufferAttribute(new Float32Array(this.stars.length), 1));
    geometry.setAttribute(
      'aPhase',
      new THREE.BufferAttribute(new Float32Array(this.stars.map(() => random())), 1),
    );
    const material = new THREE.ShaderMaterial({
      vertexShader: memoryVertex,
      fragmentShader: memoryFragment,
      uniforms: { uTime: this.time, uPixelRatio: this.pixelRatio, uReveal: this.reveal },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  private createLinks(): THREE.LineSegments {
    const positions: number[] = [];
    const order: number[] = [];
    const group: number[] = [];
    let offset = 0;
    CONSTELLATIONS.forEach((constellation, index) => {
      const count = constellation.links.length;
      constellation.links.forEach(([from, to], linkIndex) => {
        const start = this.stars[offset + from]!.position;
        const end = this.stars[offset + to]!.position;
        positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
        order.push(linkIndex / count, (linkIndex + 1) / count);
        group.push(index, index);
      });
      offset += constellation.points.length;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aOrder', new THREE.Float32BufferAttribute(order, 1));
    geometry.setAttribute('aGroup', new THREE.Float32BufferAttribute(group, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: linkVertex,
      fragmentShader: linkFragment,
      uniforms: { uReveal: this.linkReveal, uFocusGroup: this.focusGroup, uOpacity: { value: 0.42 } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    return lines;
  }
}
