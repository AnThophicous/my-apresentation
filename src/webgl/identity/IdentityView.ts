import * as THREE from 'three';
import type { QualityProfile } from '@/core/Quality';
import { seededRandom } from '@/core/math';
import type { ViewportSize } from '@/core/Viewport';
import type { View } from '@/webgl/View';
import nameFragment from './name.frag.glsl?raw';
import nameVertex from './name.vert.glsl?raw';

const PARTICLES: Record<QualityProfile['tier'], number> = { low: 6500, medium: 11000, high: 16000 };
const CAMERA_DISTANCE = 14;
const FOV = 40;
const FONT = '"Impostor Pro", sans-serif';

export interface IdentityState {
  time: number;
  pixelRatio: number;
  form: number;
  scatter: number;
  pointerX: number;
  pointerY: number;
  pointerStrength: number;
}

export class IdentityView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly hit = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private aspect = 1;

  constructor(
    private readonly quality: QualityProfile,
    private readonly lines: readonly string[],
  ) {
    this.scene.background = new THREE.Color(0, 0, 0);
    this.camera.position.set(0, 0, CAMERA_DISTANCE);
    this.material = new THREE.ShaderMaterial({
      vertexShader: nameVertex,
      fragmentShader: nameFragment,
      uniforms: {
        uForm: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: 2.9 },
        uPointer: { value: new THREE.Vector3(999, 999, 0) },
        uPointerStrength: { value: 0 },
        uPointerRadius: { value: 1.6 },
        uScatter: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  build(size: ViewportSize): void {
    this.aspect = size.aspect;
    const geometry = this.sampleName(size);
    this.points.geometry.dispose();
    this.points.geometry = geometry;
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.updateProjectionMatrix();
    if (Math.abs(size.aspect - this.aspect) > 0.01) this.build(size);
  }

  update(state: IdentityState, parallaxX: number, parallaxY: number): void {
    const { uniforms } = this.material;
    uniforms.uTime!.value = state.time;
    uniforms.uPixelRatio!.value = state.pixelRatio;
    uniforms.uForm!.value = state.form;
    uniforms.uScatter!.value = state.scatter;
    uniforms.uPointerStrength!.value = state.pointerStrength;
    this.camera.position.set(parallaxX * 0.6, -parallaxY * 0.35, CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    this.ndc.set(state.pointerX, state.pointerY);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) uniforms.uPointer!.value.copy(this.hit);
  }

  private sampleName(size: ViewportSize): THREE.BufferGeometry {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const fontSizes = this.lines.map((_, index) => (index === 0 ? 240 : 132));
    const gap = 40;
    const style = (index: number): void => {
      ctx.font = `${index === 0 ? 600 : 500} ${fontSizes[index]}px ${FONT}`;
      ctx.letterSpacing = index === 0 ? '-8px' : '-3px';
    };
    const widths = this.lines.map((line, index) => {
      style(index);
      return ctx.measureText(line).width;
    });
    canvas.width = Math.ceil(Math.max(...widths) + 40);
    canvas.height = Math.ceil(
      fontSizes.reduce((sum, value) => sum + value, 0) + gap * (this.lines.length - 1) + 60,
    );
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    let y = 20;
    this.lines.forEach((line, index) => {
      style(index);
      ctx.fillText(line, (canvas.width - widths[index]!) / 2, y);
      y += fontSizes[index]! + gap;
    });
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let filled = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]! > 128) filled += 1;
    const step = Math.max(1, Math.sqrt(filled / PARTICLES[this.quality.tier]));
    const visibleHeight = 2 * CAMERA_DISTANCE * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const worldWidth = Math.min(visibleHeight * size.aspect * 0.82, visibleHeight * 1.9);
    const scale = worldWidth / canvas.width;
    const random = seededRandom(5);
    const targets: number[] = [];
    const starts: number[] = [];
    const seeds: number[] = [];
    for (let py = 0; py < canvas.height; py += step) {
      for (let px = 0; px < canvas.width; px += step) {
        const x = Math.floor(px + random() * step * 0.6);
        const yy = Math.floor(py + random() * step * 0.6);
        if (x >= canvas.width || yy >= canvas.height) continue;
        if (pixels[(yy * canvas.width + x) * 4 + 3]! < 128) continue;
        targets.push(
          (x - canvas.width / 2) * scale,
          (canvas.height / 2 - yy) * scale + visibleHeight * 0.04,
          (random() - 0.5) * 0.05,
        );
        const angle = random() * Math.PI * 2;
        const radius = worldWidth * (0.6 + random() * 1.3);
        starts.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, -6 - random() * 30);
        seeds.push(random(), random(), random(), (x / canvas.width) * 0.7 + random() * 0.3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(targets, 3));
    geometry.setAttribute('aStart', new THREE.Float32BufferAttribute(starts, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 4));
    return geometry;
  }
}
