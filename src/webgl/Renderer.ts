import * as THREE from 'three';
import { AdaptiveResolution, type QualityProfile } from '@/core/Quality';
import type { Viewport } from '@/core/Viewport';
import { FinalPass, type PostSettings } from './post/FinalPass';
import type { View } from './View';

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly finalPass = new FinalPass();
  private readonly adaptive: AdaptiveResolution;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
    readonly quality: QualityProfile,
  ) {
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl.toneMapping = THREE.NoToneMapping;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    this.gl.shadowMap.autoUpdate = false;
    this.gl.setClearColor(0x000000, 1);
    this.adaptive = new AdaptiveResolution(quality, viewport.size.pixelRatio);
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: this.supportsHalfFloatTargets() ? THREE.HalfFloatType : THREE.UnsignedByteType,
      samples: quality.msaaSamples,
      depthBuffer: true,
    });
    this.resize();
    viewport.resized.on(() => this.resize());
  }

  get pixelRatio(): number {
    return this.adaptive.pixelRatio;
  }

  compile(view: View): Promise<void> {
    return this.gl.compileAsync(view.scene, view.camera).then(() => undefined);
  }

  render(view: View, post: PostSettings, time: number, delta: number): void {
    if (this.adaptive.record(delta)) this.resize();
    view.beforeRender?.(this.gl);
    this.gl.setRenderTarget(this.target);
    this.gl.render(view.scene, view.camera);
    this.finalPass.render(this.gl, this.target.texture, post, time);
  }

  private resize(): void {
    const { width, height } = this.viewport.size;
    const ratio = this.adaptive.pixelRatio;
    this.gl.setPixelRatio(ratio);
    this.gl.setSize(width, height, false);
    this.target.setSize(Math.round(width * ratio), Math.round(height * ratio));
    this.finalPass.setSize(width * ratio, height * ratio);
  }

  private supportsHalfFloatTargets(): boolean {
    const extensions = this.gl.extensions;
    return extensions.has('EXT_color_buffer_half_float') || extensions.has('EXT_color_buffer_float');
  }
}
