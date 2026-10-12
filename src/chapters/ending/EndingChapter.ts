import * as THREE from 'three';
import { createLayer, type Context } from '@/app/Context';
import { ENDING_BEATS, ENDING_FINALE } from '@/content/copy';
import { clamp, damp, smoothstep } from '@/core/math';
import { Track } from '@/core/Track';
import { Beats } from '@/ui/Beats';
import { PALE_DAWN } from '@/webgl/ocean/atmosphere';
import { OceanView } from '@/webgl/ocean/OceanView';
import { HorizonInteraction } from '@/webgl/surface/HorizonInteraction';
import type { HorizonLine } from '@/webgl/surface/HorizonLine';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import './ending.css';

const HEIGHT = new Track([
  [0, -46],
  [0.3, -22],
  [0.5, -4],
  [0.56, -0.9],
  [0.6, 1.5],
  [1, 1.6],
]);
const PITCH = new Track([
  [0, 34],
  [0.3, 24],
  [0.5, 13],
  [0.58, 3],
  [0.66, 0],
  [1, 0],
]);
const CLOSE_WINDOW = [0.86, 0.97] as const;
const FINALE_FROM = 0.9;
const WATERLINE_BAND = 0.7;
const DEPTH_SCALE = 8;
const BOB_STRENGTH = 0.5;

export class EndingChapter implements Chapter {
  readonly id = 'ending' as const;
  readonly view: OceanView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly finale: HTMLElement;
  private readonly interaction: HorizonInteraction;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private wasUnderwater = true;
  private closed = false;
  private lookX = 0;
  private lookY = 0;

  constructor(
    private readonly context: Context,
    line: HorizonLine,
  ) {
    this.view = new OceanView(context.quality, line);
    this.view.setPreset(PALE_DAWN);
    this.interaction = new HorizonInteraction(line, context.sound);
    this.layer = createLayer(context, 'ending');
    this.beats = new Beats(this.layer, ENDING_BEATS);
    this.finale = this.createFinale();
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
  }

  async prepare(): Promise<void> {
    this.placeCamera(0, 0);
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.layer.classList.add('is-active');
    this.wasUnderwater = true;
  }

  leave(): void {
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    this.lookX = damp(this.lookX, frame.parallaxX, 2, frame.delta);
    this.lookY = damp(this.lookY, frame.parallaxY, 2, frame.delta);
    this.placeCamera(progress, frame.time);
    this.view.update({
      time: frame.time,
      pixelRatio: this.context.renderer.pixelRatio,
      shafts: 1.4,
      snow: 1 - smoothstep(0.35, 0.55, progress),
    });
    this.detectSurface(frame.time);
    this.updatePaper(progress, frame);
    this.beats.update(progress);
    this.finale.classList.toggle('is-visible', progress > FINALE_FROM);
    this.mix(progress);
    this.writeOutput(progress, output);
  }

  private placeCamera(progress: number, time: number): void {
    const { camera } = this.view;
    const height = HEIGHT.sample(progress);
    camera.position.set(Math.sin(progress * 3) * 0.8, height, -progress * 26);
    const above = smoothstep(0.58, 0.66, progress);
    camera.position.y +=
      this.view.waterHeightAt(camera.position.x, camera.position.z, time) * BOB_STRENGTH * above;
    this.euler.set(
      THREE.MathUtils.degToRad(PITCH.sample(progress)) + this.lookY * THREE.MathUtils.degToRad(2),
      -this.lookX * THREE.MathUtils.degToRad(3.5),
      0,
    );
    camera.quaternion.setFromEuler(this.euler);
  }

  private detectSurface(time: number): void {
    const underwater = this.view.isUnderwater;
    if (underwater === this.wasUnderwater) return;
    this.wasUnderwater = underwater;
    if (underwater) return;
    this.view.bubbles.trigger(time, this.view.camera);
    this.context.sound.cue('splash', { gain: 0.8 });
  }

  private updatePaper(progress: number, frame: Frame): void {
    const { width, height } = frame.size;
    const close = smoothstep(CLOSE_WINDOW[0], CLOSE_WINDOW[1], progress);
    this.interaction.update(frame.delta, frame.pointer, frame.size, close > 0.98);
    this.view.paper.resize(width, height, this.context.renderer.pixelRatio);
    this.view.paper.update({
      lineY: height * 0.5,
      reveal: 1 - close,
      originX: width / 2,
      originY: height * 0.5,
      ink: 0,
      time: frame.time,
    });
    const closed = close > 0.98;
    if (closed && !this.closed) this.context.sound.cue('resolve');
    this.closed = closed;
  }

  private mix(progress: number): void {
    const under = this.view.isUnderwater ? 1 : 0;
    const close = smoothstep(CLOSE_WINDOW[0], 1, progress);
    this.context.sound.mix({
      air: (1 - under) * (0.5 + close * 0.4),
      waves: under ? 0.35 : 0.9 * (1 - close * 0.6),
      underwater: under,
      depth: clamp(this.view.depth / 45),
      pad: 0.55,
      shimmer: 0.5,
      tension: 0,
      room: 0,
      pulse: 0,
      motion: under ? 0 : 0.15 * (1 - close),
      silence: 0,
    });
  }

  private writeOutput(progress: number, output: ChapterOutput): void {
    const under = this.view.isUnderwater;
    const relative = this.view.clearance;
    const paper = smoothstep(CLOSE_WINDOW[0], CLOSE_WINDOW[1], progress);
    output.post.exposure = THREE.MathUtils.lerp(under ? 1.3 : 1.12, 1, paper);
    output.post.contrast = THREE.MathUtils.lerp(under ? 1.12 : 1.04, 1, paper);
    output.post.vignette = (under ? 0.42 : 0.22) * (1 - paper);
    output.post.grain = THREE.MathUtils.lerp(0.06, 0.035, paper);
    output.post.toneMapping = 1 - paper;
    output.post.waterline =
      Math.abs(relative) < WATERLINE_BAND ? clamp(0.5 - relative / (WATERLINE_BAND * 2)) : -1;
    output.post.fade = 1 - smoothstep(0, 0.03, progress);
    output.post.fadeTone = 0;
    output.theme = under ? 'dark' : 'light';
    output.meter = {
      label: under ? 'Depth' : 'Surface',
      value: under ? `${Math.round(this.view.depth * DEPTH_SCALE)} m` : 'breathe',
    };
  }

  private createFinale(): HTMLElement {
    const finale = document.createElement('div');
    finale.className = 'ending__finale';
    finale.innerHTML = `
      <p class="ending__signature caption">${ENDING_FINALE.signature}</p>
      <button class="pill ending__return" type="button" data-cursor="Surface">${ENDING_FINALE.action}</button>
      <p class="ending__credits">${ENDING_FINALE.credits}</p>`;
    finale.querySelector('button')!.addEventListener('click', () => this.returnToSurface());
    this.layer.append(finale);
    return finale;
  }

  private returnToSurface(): void {
    this.context.sound.cue('press');
    this.context.story.goTo('welcome', 0, true);
  }
}
