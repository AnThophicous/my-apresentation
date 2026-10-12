import * as THREE from 'three';
import type { QualityProfile } from '@/core/Quality';
import type { ViewportSize } from '@/core/Viewport';
import type { View } from '@/webgl/View';
import { createShardGeometry } from './shards';
import shardFragment from './shard.frag.glsl?raw';
import shardVertex from './shard.vert.glsl?raw';

const FOV = 40;
const PLANE_DISTANCE = 10;

export interface GlassState {
  lean: number;
  crack: number;
  explode: number;
  boost: number;
}

export class GlassView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
  private readonly target: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private source: View | null = null;
  private frozen = false;
  private size: ViewportSize | null = null;

  constructor(private readonly quality: QualityProfile) {
    this.scene.background = new THREE.Color(0, 0, 0);
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
    this.material = new THREE.ShaderMaterial({
      vertexShader: shardVertex,
      fragmentShader: shardFragment,
      uniforms: {
        uScene: { value: this.target.texture },
        uExplode: { value: 0 },
        uCrack: { value: 0 },
        uImpact: { value: new THREE.Vector2() },
        uScale: { value: 1 },
      },
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.camera.position.set(0, 0, PLANE_DISTANCE);
  }

  setSource(view: View): void {
    this.source = view;
  }

  shatterAt(x: number, y: number, size: ViewportSize, pixelRatio: number, seed: number): void {
    const { planeWidth, planeHeight } = this.plane(size.aspect);
    this.mesh.geometry.dispose();
    this.mesh.geometry = createShardGeometry(
      {
        width: size.width,
        height: size.height,
        impactX: x,
        impactY: y,
        count: this.quality.shardCount,
        seed,
      },
      planeWidth,
      planeHeight,
    );
    this.material.uniforms.uImpact!.value.set(
      (x / size.width - 0.5) * planeWidth,
      (0.5 - y / size.height) * planeHeight,
    );
    this.material.uniforms.uScale!.value = planeHeight * 0.55;
    this.target.setSize(Math.round(size.width * pixelRatio), Math.round(size.height * pixelRatio));
  }

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  resize(size: ViewportSize): void {
    this.size = size;
    this.camera.aspect = size.aspect;
    this.camera.updateProjectionMatrix();
  }

  update(state: GlassState): void {
    this.material.uniforms.uCrack!.value = state.crack;
    this.material.uniforms.uExplode!.value = state.explode;
    const boost = state.boost;
    this.camera.position.z = PLANE_DISTANCE * (1 - state.lean * 0.07) - boost * PLANE_DISTANCE * 3.2;
    this.camera.fov = FOV + boost * 40;
    this.camera.updateProjectionMatrix();
  }

  beforeRender(renderer: THREE.WebGLRenderer): void {
    if (this.frozen || !this.source || !this.size) return;
    this.source.beforeRender?.(renderer);
    renderer.setRenderTarget(this.target);
    renderer.render(this.source.scene, this.source.camera);
    renderer.setRenderTarget(null);
  }

  private plane(aspect: number): { planeWidth: number; planeHeight: number } {
    const planeHeight = 2 * PLANE_DISTANCE * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return { planeWidth: planeHeight * aspect, planeHeight };
  }
}
