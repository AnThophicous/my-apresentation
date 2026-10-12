import * as THREE from 'three';
import { createLayer, type Context } from '@/app/Context';
import { OCEAN_BEATS } from '@/content/copy';
import { clamp, damp, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import type { BookCard } from '@/ui/BookCard';
import { BookShoal } from '@/webgl/books/BookShoal';
import { OceanView } from '@/webgl/ocean/OceanView';
import { HorizonInteraction } from '@/webgl/surface/HorizonInteraction';
import type { HorizonLine } from '@/webgl/surface/HorizonLine';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import { OCEAN_TIMING, sampleOceanPose, type OceanPose } from './oceanPath';
import './ocean.css';

const BOB_STRENGTH = 0.55;
const WATERLINE_BAND = 0.7;
const DEPTH_SCALE = 8;
const BOOKS_FROM = 0.38;
const BOOKS_UNTIL = 0.9;
const RECYCLE_FROM = 0.42;
const RECYCLE_UNTIL = 0.86;
const ATLAS_SIZE = { low: 1024, medium: 1280, high: 1536 } as const;

export class OceanChapter implements Chapter {
  readonly id = 'ocean' as const;
  readonly view: OceanView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly interaction: HorizonInteraction;
  private readonly pose: OceanPose = { position: new THREE.Vector3(), pitch: 0, yaw: 0 };
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly doorPosition = new THREE.Vector3();
  private shoal: BookShoal | null = null;
  private wasUnderwater = false;
  private scattered = false;
  private active = false;
  private progress = 0;
  private lookX = 0;
  private lookY = 0;

  constructor(
    private readonly context: Context,
    line: HorizonLine,
    private readonly card: BookCard,
  ) {
    this.view = new OceanView(context.quality, line);
    this.interaction = new HorizonInteraction(line, context.sound);
    this.layer = createLayer(context, 'ocean');
    this.beats = new Beats(this.layer, OCEAN_BEATS);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
    context.pointer.pressed.on(this.handlePress);
    context.pointer.released.on(this.handleRelease);
    window.addEventListener('pointermove', this.handleMove, { passive: true });
    card.closed.on(() => this.active && context.scroll.unlock());
  }

  async prepare(): Promise<void> {
    await Promise.all(
      ['400 1em "Impostor Pro"', '500 1em "Impostor Pro"'].map((face) => document.fonts.load(face)),
    );
    const { quality, renderer } = this.context;
    this.shoal = new BookShoal(ATLAS_SIZE[quality.tier], renderer.gl.capabilities.getMaxAnisotropy());
    this.shoal.grabbed.on(() => this.context.sound.cue('page'));
    this.shoal.released.on(() => this.context.sound.cue('bubbles', { gain: 0.4 }));
    this.shoal.opened.on((book) => {
      this.context.sound.cue('page');
      this.context.scroll.lock();
      requestAnimationFrame(() => this.card.open(book.entry, book.index));
    });
    this.view.content.add(this.shoal.group);
    sampleOceanPose(0, this.pose);
    this.applyCamera(0, 0, 0);
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.active = true;
    this.layer.classList.add('is-active');
    this.wasUnderwater = this.view.isUnderwater;
  }

  leave(): void {
    this.active = false;
    this.layer.classList.remove('is-active');
    if (this.shoal?.isHolding) {
      this.shoal.release();
      this.context.scroll.unlock();
    }
  }

  get bookMeshes(): THREE.Mesh[] {
    return this.shoal?.books.map((book) => book.mesh) ?? [];
  }

  private get booksInteractive(): boolean {
    return (
      this.active &&
      this.view.isUnderwater &&
      this.progress > BOOKS_FROM &&
      this.progress < BOOKS_UNTIL &&
      !this.card.isOpen
    );
  }

  private readonly handleMove = (event: PointerEvent): void => {
    this.shoal?.drag(event.clientX, event.clientY);
  };

  private readonly handlePress = (event: PointerEvent): void => {
    if (!this.booksInteractive || !this.shoal) return;
    if (!(event.target instanceof HTMLCanvasElement)) return;
    const { width, height } = this.context.viewport.size;
    this.shoal.pointAt(
      (event.clientX / width) * 2 - 1,
      -(event.clientY / height) * 2 + 1,
      this.view.camera,
      true,
    );
    if (this.shoal.press(event.clientX, event.clientY, this.view.camera)) this.context.scroll.lock();
  };

  private readonly handleRelease = (): void => {
    if (!this.shoal?.isHolding) return;
    this.context.scroll.unlock();
    this.shoal.release();
  };

  private updateBooks(progress: number, frame: Frame, output: ChapterOutput): void {
    const shoal = this.shoal;
    if (!shoal) return;
    const camera = this.view.camera;
    if (!this.scattered && this.view.isUnderwater && progress > BOOKS_FROM) {
      this.scattered = true;
      shoal.scatterAround(camera);
    }
    shoal.pointAt(
      frame.pointer.normalizedX,
      frame.pointer.normalizedY,
      camera,
      this.booksInteractive && frame.pointer.isActive,
    );
    const recycle = this.view.isUnderwater && progress > RECYCLE_FROM && progress < RECYCLE_UNTIL;
    const time = frame.time;
    shoal.update(time, frame.delta, camera, (x, z) => this.view.waterHeightAt(x, z, time), recycle);
    shoal.caustics.uCausticStrength.value = this.view.isUnderwater ? Math.exp(-this.view.depth * 0.045) : 0;
    if (shoal.isHolding) output.cursor = 'Release';
    else if (shoal.hoveredBook && this.booksInteractive) output.cursor = 'Pull';
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    this.progress = progress;
    const reveal = smoothstep(0, OCEAN_TIMING.revealEnd, progress);
    const freedom = smoothstep(OCEAN_TIMING.revealEnd, OCEAN_TIMING.revealEnd + 0.06, progress);
    this.lookX = damp(this.lookX, frame.parallaxX * freedom, 2.5, frame.delta);
    this.lookY = damp(this.lookY, frame.parallaxY * freedom, 2.5, frame.delta);
    sampleOceanPose(progress, this.pose);
    this.applyCamera(progress, frame.time, freedom);
    this.view.update({
      time: frame.time,
      pixelRatio: this.context.renderer.pixelRatio,
      shafts: 1,
      snow: 1,
    });
    this.detectCrossing(frame.time);
    this.updateDoorway(progress);
    this.updatePaper(progress, reveal, frame);
    this.beats.update(progress);
    this.mixSound(progress);
    this.writeOutput(progress, output);
    this.updateBooks(progress, frame, output);
  }

  private applyCamera(progress: number, time: number, freedom: number): void {
    const { camera } = this.view;
    const { position, pitch, yaw } = this.pose;
    const surfaceWeight = 1 - smoothstep(OCEAN_TIMING.descentStart, OCEAN_TIMING.crossing, progress);
    const water = this.view.waterHeightAt(position.x, position.z, time);
    camera.position.copy(position);
    camera.position.y += water * BOB_STRENGTH * surfaceWeight;
    const slope =
      this.view.waterHeightAt(position.x + 1.5, position.z, time) -
      this.view.waterHeightAt(position.x - 1.5, position.z, time);
    const roll = slope * 0.05 * surfaceWeight * freedom;
    this.euler.set(
      pitch + this.lookY * THREE.MathUtils.degToRad(2.5),
      yaw * freedom - this.lookX * THREE.MathUtils.degToRad(4),
      roll,
    );
    camera.quaternion.setFromEuler(this.euler);
  }

  private detectCrossing(time: number): void {
    const underwater = this.view.isUnderwater;
    if (underwater === this.wasUnderwater) return;
    this.wasUnderwater = underwater;
    if (!underwater) return;
    this.view.bubbles.trigger(time, this.view.camera);
    this.context.sound.cue('splash');
  }

  private updateDoorway(progress: number): void {
    const intensity = smoothstep(OCEAN_TIMING.doorwayStart, 0.95, progress);
    const final = sampleOceanPose(1, { position: this.doorPosition, pitch: 0, yaw: 0 }).position;
    final.z -= 1.4;
    final.y -= 0.3;
    this.view.doorway.update(final, this.view.camera.position, intensity);
  }

  private updatePaper(progress: number, reveal: number, frame: Frame): void {
    const { width, height } = frame.size;
    this.interaction.update(frame.delta, frame.pointer, frame.size, reveal < 0.98);
    this.view.paper.resize(width, height, this.context.renderer.pixelRatio);
    this.view.paper.update({
      lineY: height * 0.5,
      reveal: progress <= 0 ? 0 : reveal,
      originX: width / 2,
      originY: height * 0.5,
      ink: 0,
      time: frame.time,
    });
  }

  private mixSound(progress: number): void {
    const under = this.view.isUnderwater ? 1 : 0;
    const depth = this.view.depth;
    const door = smoothstep(OCEAN_TIMING.doorwayStart, 1, progress);
    this.context.sound.mix({
      air: (1 - under) * 0.45,
      waves: under ? 0.45 : 1,
      underwater: under,
      depth: clamp(depth / 45),
      pad: 0.3 + under * 0.25,
      shimmer: under * clamp(1 - depth / 30) * 0.35 + door * 0.8,
      tension: 0,
      room: 0,
      pulse: 0,
      motion: 0,
      silence: 0,
    });
  }

  private writeOutput(progress: number, output: ChapterOutput): void {
    const relative = this.view.clearance;
    const under = this.view.isUnderwater;
    output.post.exposure = under ? 1.25 : 1.15;
    output.post.contrast = under ? 1.15 : 1.05;
    output.post.vignette = under ? 0.45 : 0.28;
    output.post.grain = 0.07;
    output.post.waterline =
      Math.abs(relative) < WATERLINE_BAND ? clamp(0.5 - relative / (WATERLINE_BAND * 2)) : -1;
    output.post.fade = smoothstep(OCEAN_TIMING.fadeStart, 1, progress);
    output.post.fadeTone = 1;
    output.post.toneMapping = 1 - smoothstep(0.9, 1, progress);
    output.theme = under ? 'dark' : 'light';
    output.meter = { label: 'Depth', value: `${Math.round(this.view.depth * DEPTH_SCALE)} m` };
  }
}
