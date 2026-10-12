import * as THREE from 'three';
import type { ViewportSize } from '@/core/Viewport';
import { createFullscreenTriangle } from '@/webgl/post/FinalPass';
import vertexShader from '@/webgl/post/fullscreen.vert.glsl?raw';
import type { View } from '@/webgl/View';
import fragmentShader from './fabric.frag.glsl?raw';

export interface FabricState {
  time: number;
  reveal: number;
  centerX: number;
  centerY: number;
  horizon: number;
  twist: number;
  focusX: number;
  focusY: number;
  focusStrength: number;
}

export class FabricView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelRatio: { value: 1 },
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2() },
    uHorizon: { value: 0 },
    uTwist: { value: 1.6 },
    uFocus: { value: new THREE.Vector2(-9999, -9999) },
    uFocusStrength: { value: 0 },
    uFocusRadius: { value: 130 },
    uReveal: { value: 0 },
    uSpacing: { value: 22 },
    uDotRadius: { value: 1.05 },
    uDotTone: { value: 0.42 },
  };

  constructor() {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(createFullscreenTriangle(), material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  resize(size: ViewportSize): void {
    this.uniforms.uSpacing.value = size.isCompact ? 18 : 22;
  }

  setResolution(width: number, height: number, pixelRatio: number): void {
    this.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    this.uniforms.uPixelRatio.value = pixelRatio;
  }

  update(state: FabricState): void {
    const { uniforms } = this;
    uniforms.uTime.value = state.time;
    uniforms.uReveal.value = state.reveal;
    uniforms.uCenter.value.set(state.centerX, state.centerY);
    uniforms.uHorizon.value = state.horizon;
    uniforms.uTwist.value = state.twist;
    uniforms.uFocus.value.set(state.focusX, state.focusY);
    uniforms.uFocusStrength.value = state.focusStrength;
  }
}
