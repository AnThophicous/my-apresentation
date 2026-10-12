import * as THREE from 'three';
import { createFullscreenTriangle } from '@/webgl/post/FinalPass';
import vertexShader from '@/webgl/post/fullscreen.vert.glsl?raw';
import type { HorizonLine } from './HorizonLine';
import fragmentShader from './paper.frag.glsl?raw';

export interface PaperState {
  lineY: number;
  reveal: number;
  originX: number;
  originY: number;
  ink: number;
  time: number;
}

const LINE_WIDTH = 1.5;

export class PaperOverlay {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly waveData: Uint16Array;
  private readonly waveTexture: THREE.DataTexture;
  private height = 1;
  private pixelRatio = 1;

  constructor(private readonly line: HorizonLine) {
    this.waveData = new Uint16Array(line.count);
    this.waveTexture = new THREE.DataTexture(
      this.waveData,
      line.count,
      1,
      THREE.RedFormat,
      THREE.HalfFloatType,
    );
    this.waveTexture.magFilter = THREE.LinearFilter;
    this.waveTexture.minFilter = THREE.LinearFilter;
    this.waveTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uLineY: { value: 0 },
        uLineWidth: { value: LINE_WIDTH },
        uWave: { value: this.waveTexture },
        uReveal: { value: 0 },
        uOrigin: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uInk: { value: 0 },
        uRipples: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
      },
    });
    this.mesh = new THREE.Mesh(createFullscreenTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.material.uniforms.uResolution!.value.set(width * pixelRatio, height * pixelRatio);
    this.material.uniforms.uPixelRatio!.value = pixelRatio;
    this.material.uniforms.uLineWidth!.value = LINE_WIDTH * pixelRatio;
  }

  update(state: PaperState): void {
    const u = this.material.uniforms;
    const ratio = this.pixelRatio;
    u.uLineY!.value = (this.height - state.lineY) * ratio;
    u.uReveal!.value = state.reveal;
    u.uOrigin!.value.set(state.originX * ratio, (this.height - state.originY) * ratio);
    u.uTime!.value = state.time;
    u.uInk!.value = state.ink;
    this.mesh.visible = state.reveal < 0.999;
    this.uploadWave();
    this.uploadRipples();
  }

  private uploadWave(): void {
    const { samples } = this.line;
    for (let i = 0; i < samples.length; i += 1) this.waveData[i] = THREE.DataUtils.toHalfFloat(samples[i]!);
    this.waveTexture.needsUpdate = true;
  }

  private uploadRipples(): void {
    const slots = this.material.uniforms.uRipples!.value as THREE.Vector4[];
    slots.forEach((slot, index) => {
      const ripple = this.line.ripples[index];
      if (!ripple) slot.set(0, 0, 0, 0);
      else
        slot.set(
          ripple.x * this.pixelRatio,
          (this.height - ripple.y) * this.pixelRatio,
          ripple.age,
          ripple.strength,
        );
    });
  }
}
