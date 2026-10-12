import * as THREE from 'three';
import fragmentShader from './final.frag.glsl?raw';
import vertexShader from './fullscreen.vert.glsl?raw';

export interface PostSettings {
  exposure: number;
  toneMapping: number;
  contrast: number;
  grain: number;
  vignette: number;
  dither: number;
  zoomBlur: number;
  zoomCenterX: number;
  zoomCenterY: number;
  fade: number;
  fadeTone: number;
  invert: number;
  flash: number;
  waterline: number;
}

export const DEFAULT_POST: Readonly<PostSettings> = {
  exposure: 1,
  toneMapping: 1,
  contrast: 1,
  grain: 0.06,
  vignette: 0.25,
  dither: 0,
  zoomBlur: 0,
  zoomCenterX: 0.5,
  zoomCenterY: 0.5,
  fade: 0,
  fadeTone: 1,
  invert: 0,
  flash: 0,
  waterline: -1,
};

export function createFullscreenTriangle(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  return geometry;
}

export class FinalPass {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uScene: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uExposure: { value: DEFAULT_POST.exposure },
        uToneMapping: { value: DEFAULT_POST.toneMapping },
        uContrast: { value: DEFAULT_POST.contrast },
        uGrain: { value: DEFAULT_POST.grain },
        uVignette: { value: DEFAULT_POST.vignette },
        uDither: { value: DEFAULT_POST.dither },
        uZoomBlur: { value: 0 },
        uZoomCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uFade: { value: 0 },
        uFadeTone: { value: 1 },
        uInvert: { value: 0 },
        uFlash: { value: 0 },
        uWaterline: { value: -1 },
      },
    });
    const triangle = new THREE.Mesh(createFullscreenTriangle(), this.material);
    triangle.frustumCulled = false;
    this.scene.add(triangle);
  }

  setSize(width: number, height: number): void {
    this.material.uniforms.uResolution!.value.set(width, height);
  }

  render(renderer: THREE.WebGLRenderer, input: THREE.Texture, settings: PostSettings, time: number): void {
    const u = this.material.uniforms;
    u.uScene!.value = input;
    u.uTime!.value = time;
    u.uExposure!.value = settings.exposure;
    u.uToneMapping!.value = settings.toneMapping;
    u.uContrast!.value = settings.contrast;
    u.uGrain!.value = settings.grain;
    u.uVignette!.value = settings.vignette;
    u.uDither!.value = settings.dither;
    u.uZoomBlur!.value = settings.zoomBlur;
    u.uZoomCenter!.value.set(settings.zoomCenterX, settings.zoomCenterY);
    u.uFade!.value = settings.fade;
    u.uFadeTone!.value = settings.fadeTone;
    u.uInvert!.value = settings.invert;
    u.uFlash!.value = settings.flash;
    u.uWaterline!.value = settings.waterline;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }
}
