import * as THREE from 'three';
import { createLayer, type Context } from '@/app/Context';
import { HORIZON_BEATS } from '@/content/copy';
import { damp, easeInCubic, easeOutCubic, progressBetween, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import { BlackHoleView, HORIZON } from '@/webgl/blackhole/BlackHoleView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';

const EMERGE_END = 0.14;
const PLUNGE_START = 0.74;
const PLUNGE_END = 0.97;
const DEGREE = Math.PI / 180;

const ORBIT = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 7 * DEGREE, 30),
  new THREE.Vector3(1.25, 24 * DEGREE, 24),
  new THREE.Vector3(2.7, 52 * DEGREE, 21),
  new THREE.Vector3(4.1, -11 * DEGREE, 24),
  new THREE.Vector3(5.4, 4 * DEGREE, 27),
]);

export class HorizonChapter implements Chapter {
  readonly id = 'horizon' as const;
  readonly view: BlackHoleView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly orbit = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private parallaxX = 0;
  private parallaxY = 0;
  private swelled = false;
  private crossed = false;

  constructor(private readonly context: Context) {
    this.view = new BlackHoleView(context.quality);
    this.layer = createLayer(context, 'horizon');
    this.beats = new Beats(this.layer, HORIZON_BEATS);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
  }

  async prepare(): Promise<void> {
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.layer.classList.add('is-active');
  }

  leave(): void {
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    this.parallaxX = damp(this.parallaxX, frame.parallaxX, 2.5, frame.delta);
    this.parallaxY = damp(this.parallaxY, frame.parallaxY, 2.5, frame.delta);
    const distance = this.placeCamera(progress, frame.size.aspect);
    this.view.update({
      time: frame.time,
      pixelRatio: this.context.renderer.pixelRatio,
      intensity: smoothstep(0, EMERGE_END * 0.6, progress),
    });
    this.beats.update(progress);
    this.playCues(progress);
    this.mix(progress);
    this.writeOutput(progress, distance, output);
  }

  private placeCamera(progress: number, aspect: number): number {
    const emerge = easeOutCubic(progressBetween(0, EMERGE_END, progress));
    const plunge = easeInCubic(progressBetween(PLUNGE_START, PLUNGE_END, progress));
    ORBIT.getPoint(progressBetween(EMERGE_END * 0.5, PLUNGE_START, progress), this.orbit);
    const fit = aspect < 1 ? 1.45 : 1;
    let azimuth = this.orbit.x + plunge * 0.7 + this.parallaxX * 0.1;
    let elevation = this.orbit.y + this.parallaxY * 0.06;
    let distance = this.orbit.z * fit;
    distance = THREE.MathUtils.lerp(HORIZON.shadow * 1.18, distance, emerge);
    elevation = THREE.MathUtils.lerp(0.4 * DEGREE, elevation, emerge);
    distance = THREE.MathUtils.lerp(distance, 0.35, plunge);
    elevation = THREE.MathUtils.lerp(elevation, 1.5 * DEGREE, plunge);
    azimuth -= (1 - emerge) * 0.5;
    const camera = this.view.camera;
    camera.position.set(
      Math.cos(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.sin(azimuth) * Math.cos(elevation) * distance,
    );
    this.target.set(0, 0, 0);
    camera.fov = 46 + plunge * 34 - (1 - emerge) * 8;
    camera.updateProjectionMatrix();
    camera.up.set(Math.sin(plunge * 0.6) * 0.3, 1, 0).normalize();
    camera.lookAt(this.target);
    camera.updateMatrixWorld();
    return distance;
  }

  private playCues(progress: number): void {
    const plunging = progress > PLUNGE_START;
    if (plunging && !this.swelled) this.context.sound.cue('swell', { gain: 1.3 });
    this.swelled = plunging;
    const crossing = progress > PLUNGE_END - 0.02;
    if (crossing && !this.crossed) this.context.sound.cue('whoosh', { gain: 1.4 });
    this.crossed = crossing;
  }

  private mix(progress: number): void {
    const peak = smoothstep(PLUNGE_START - 0.1, PLUNGE_END - 0.01, progress);
    const after = smoothstep(PLUNGE_END - 0.01, 1, progress);
    this.context.sound.mix({
      air: 0,
      waves: 0,
      underwater: 0,
      depth: 0.7,
      pad: 0.55 + peak * 0.3,
      shimmer: 0.35 + peak * 0.4,
      tension: 0.6 + peak * 0.4,
      room: 0,
      pulse: 0.6 + peak * 0.4,
      motion: 0.45 + peak * 0.55,
      silence: after,
    });
  }

  private writeOutput(progress: number, distance: number, output: ChapterOutput): void {
    const plunge = progressBetween(PLUNGE_START, PLUNGE_END, progress);
    output.post.toneMapping = 1;
    output.post.exposure = 1.15;
    output.post.contrast = 1.1;
    output.post.vignette = 0.38;
    output.post.grain = 0.055;
    output.post.zoomBlur = smoothstep(0.2, 1, plunge) * 1.4;
    output.post.fade = Math.max(
      1 - smoothstep(0, 0.035, progress),
      smoothstep(PLUNGE_END - 0.025, PLUNGE_END + 0.01, progress),
    );
    output.post.fadeTone = 0;
    output.theme = 'dark';
    const remaining = Math.max(0, distance - 1);
    output.meter = {
      label: 'To the horizon',
      value: progress > PLUNGE_END ? 'crossed' : `${remaining.toFixed(1)} rs`,
    };
  }
}
