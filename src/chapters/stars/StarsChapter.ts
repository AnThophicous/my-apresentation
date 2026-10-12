import * as THREE from 'three';
import { createLayer, type Context } from '@/app/Context';
import { pentatonicNote } from '@/audio/music';
import { STARS_BEATS, STARS_HINT } from '@/content/copy';
import { CONSTELLATIONS } from '@/content/stars';
import { clamp, damp, easeInOutSine, progressBetween, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import { StarsView, type MemoryStar } from '@/webgl/stars/StarsView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import './stars.css';

const JOURNEY: readonly (readonly [number, number])[] = [
  [0, 46],
  [0.1, 8],
  [0.36, -20],
  [0.45, -38],
  [0.53, -98],
  [0.66, -114],
  [0.72, -172],
  [0.8, -186],
  [0.86, -234],
  [0.96, -250],
  [1, -252],
];
const HINT_WINDOW = [0.34, 0.52] as const;
const PICK_RADIUS = { pointer: 34, touch: 52 } as const;
const LABEL_RANGE = { near: 9, far: 95 } as const;

interface StarLabel {
  element: HTMLElement;
  opacity: number;
}

export class StarsChapter implements Chapter {
  readonly id = 'stars' as const;
  readonly view: StarsView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly labels: StarLabel[];
  private readonly card: HTMLElement;
  private readonly cardCaption: HTMLElement;
  private readonly cardTitle: HTMLElement;
  private readonly cardLine: HTMLElement;
  private readonly constellationName: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly projected = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly found = new Set<number>();
  private hovered = -1;
  private selected = -1;
  private active = false;
  private screenPositions: { x: number; y: number; visible: boolean; distance: number }[] = [];
  private parallaxX = 0;
  private parallaxY = 0;

  constructor(private readonly context: Context) {
    this.view = new StarsView(context.quality);
    this.layer = createLayer(context, 'stars');
    this.beats = new Beats(this.layer, STARS_BEATS);
    this.labels = this.view.stars.map((star) => this.createLabel(star));
    this.card = document.createElement('div');
    this.card.className = 'stars__card';
    this.card.innerHTML =
      '<p class="stars__card-caption caption"></p><p class="stars__card-title"></p><p class="stars__card-line"></p>';
    this.cardCaption = this.card.children[0] as HTMLElement;
    this.cardTitle = this.card.children[1] as HTMLElement;
    this.cardLine = this.card.children[2] as HTMLElement;
    this.constellationName = document.createElement('p');
    this.constellationName.className = 'stars__constellation caption';
    this.hint = document.createElement('p');
    this.hint.className = 'stars__hint caption';
    this.hint.textContent = context.viewport.isTouch ? STARS_HINT.touch : STARS_HINT.pointer;
    this.layer.append(this.card, this.constellationName, this.hint);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
    context.pointer.pressed.on(this.handlePress);
  }

  async prepare(): Promise<void> {
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.active = true;
    this.layer.classList.add('is-active');
  }

  leave(): void {
    this.active = false;
    this.layer.classList.remove('is-active');
    this.selected = -1;
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    if (this.hovered < 0) {
      this.parallaxX = damp(this.parallaxX, frame.parallaxX, 1.5, frame.delta);
      this.parallaxY = damp(this.parallaxY, frame.parallaxY, 1.5, frame.delta);
    }
    this.placeCamera(progress, frame.time);
    this.projectStars(frame);
    this.pick(frame);
    const focusGroup = this.updateConstellations();
    this.updateFocus(frame.delta);
    this.updateLabels(frame.delta);
    this.updateCard(frame);
    this.view.update({
      time: frame.time,
      pixelRatio: this.context.renderer.pixelRatio,
      reveal: smoothstep(0, 0.05, progress),
      focusGroup,
    });
    this.beats.update(progress);
    this.hint.style.opacity = String(
      smoothstep(HINT_WINDOW[0], HINT_WINDOW[0] + 0.03, progress) *
        (1 - smoothstep(HINT_WINDOW[1] - 0.03, HINT_WINDOW[1], progress)),
    );
    this.mix(progress);
    this.writeOutput(progress, output);
  }

  stage(progress: number, time: number): void {
    this.placeCamera(progress, time);
    this.view.update({ time, pixelRatio: this.context.renderer.pixelRatio, reveal: 1, focusGroup: -1 });
  }

  private placeCamera(progress: number, time: number): void {
    const z = sampleJourney(progress);
    const camera = this.view.camera;
    const drift = Math.sin(time * 0.15) * 0.4;
    camera.position.set(Math.sin(z * 0.021) * 4 + drift, Math.cos(z * 0.017) * 2.2, z);
    this.lookAt.set(
      camera.position.x * 0.4 + this.parallaxX * 1.4,
      camera.position.y * 0.5 - this.parallaxY * 1,
      z - 40,
    );
    camera.lookAt(this.lookAt);
    camera.updateMatrixWorld();
  }

  private projectStars(frame: Frame): void {
    const { camera } = this.view;
    const { width, height } = frame.size;
    this.screenPositions = this.view.stars.map((star) => {
      const distance = camera.position.z - star.position.z;
      this.projected.copy(star.position).project(camera);
      const visible =
        this.projected.z < 1 && Math.abs(this.projected.x) < 1.05 && Math.abs(this.projected.y) < 1.05;
      return {
        x: (this.projected.x * 0.5 + 0.5) * width,
        y: (-this.projected.y * 0.5 + 0.5) * height,
        visible: visible && distance > LABEL_RANGE.near,
        distance,
      };
    });
  }

  private pick(frame: Frame): void {
    const { pointer } = frame;
    const radius = this.context.viewport.isTouch ? PICK_RADIUS.touch : PICK_RADIUS.pointer;
    let best = -1;
    let bestDistance: number = radius;
    if (pointer.isActive && !this.context.viewport.isTouch) {
      this.screenPositions.forEach((screen, index) => {
        if (!screen.visible || screen.distance > LABEL_RANGE.far) return;
        const reach = index === this.hovered ? radius * 1.7 : radius;
        const distance = Math.hypot(screen.x - pointer.x, screen.y - pointer.y);
        if (distance < reach && distance < bestDistance * (index === this.hovered ? 1.7 : 1)) {
          bestDistance = distance;
          best = index;
        }
      });
    }
    const next = best >= 0 ? best : this.isSelectable(this.selected) ? this.selected : -1;
    if (next !== this.hovered && next >= 0) this.remember(next);
    this.hovered = next;
  }

  private isSelectable(index: number): boolean {
    const screen = this.screenPositions[index];
    return Boolean(screen && screen.visible && screen.distance < LABEL_RANGE.far);
  }

  private remember(index: number): void {
    this.found.add(index);
    const star = this.view.stars[index]!;
    const screen = this.screenPositions[index]!;
    const pan = clamp((screen.x / this.context.viewport.size.width) * 2 - 1, -1, 1) * 0.7;
    this.context.sound.cue('note', { pitch: pentatonicNote(index * 2 + star.group), gain: 0.55, pan });
  }

  private updateConstellations(): number {
    const cameraZ = this.view.camera.position.z;
    let focusGroup = -1;
    let nearest = Infinity;
    CONSTELLATIONS.forEach((constellation, group) => {
      const distance = cameraZ - constellation.center[2];
      this.view.setLinkReveal(group, 1 - smoothstep(28, 82, distance));
      if (distance > 12 && distance < 100 && distance < nearest) {
        nearest = distance;
        focusGroup = group;
      }
    });
    const name = focusGroup >= 0 ? `${toRoman(focusGroup + 1)} · ${CONSTELLATIONS[focusGroup]!.name}` : '';
    if (this.constellationName.textContent !== name) this.constellationName.textContent = name;
    this.constellationName.style.opacity = focusGroup >= 0 ? String(1 - smoothstep(60, 95, nearest)) : '0';
    return focusGroup;
  }

  private updateFocus(delta: number): void {
    this.view.stars.forEach((star, index) => {
      star.focus = damp(star.focus, index === this.hovered ? 1 : 0, 9, delta);
    });
  }

  private updateLabels(delta: number): void {
    this.labels.forEach((label, index) => {
      const screen = this.screenPositions[index]!;
      const inRange = screen.visible && screen.distance < LABEL_RANGE.far;
      const fade = inRange ? 1 - smoothstep(LABEL_RANGE.far - 30, LABEL_RANGE.far, screen.distance) : 0;
      const target = index === this.hovered ? 0 : fade * (this.found.has(index) ? 0.45 : 0.85);
      label.opacity = damp(label.opacity, target, 8, delta);
      label.element.style.opacity = label.opacity.toFixed(3);
      if (label.opacity > 0.01) {
        label.element.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`;
      }
    });
  }

  private updateCard(frame: Frame): void {
    const index = this.hovered;
    this.card.classList.toggle('is-visible', index >= 0);
    if (index < 0) return;
    const star = this.view.stars[index]!;
    if (this.card.dataset.star !== String(index)) {
      this.card.dataset.star = String(index);
      this.cardCaption.textContent = star.entry.kicker;
      this.cardTitle.textContent = star.entry.title;
      this.cardLine.textContent = star.entry.line;
    }
    const screen = this.screenPositions[index]!;
    const flip = screen.x > frame.size.width * 0.62;
    this.card.classList.toggle('is-flipped', flip);
    this.card.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`;
  }

  private mix(progress: number): void {
    const arrival = smoothstep(0, 0.12, progress);
    this.context.sound.mix({
      air: 0.12,
      waves: 0,
      underwater: 0,
      depth: 0.5 - arrival * 0.2,
      pad: 0.65,
      shimmer: 0.55,
      tension: 0.25 * (1 - arrival),
      room: 0,
      pulse: 0.2,
      motion: 0.35 * arrival,
      silence: 1 - arrival,
    });
  }

  private writeOutput(progress: number, output: ChapterOutput): void {
    output.post.toneMapping = 1;
    output.post.exposure = 1.1;
    output.post.contrast = 1.06;
    output.post.vignette = 0.32;
    output.post.grain = 0.05;
    output.post.zoomBlur = (1 - smoothstep(0, 0.11, progress)) * 1.3;
    output.post.fade = 1 - smoothstep(0, 0.03, progress);
    output.post.fadeTone = 0;
    output.theme = 'dark';
    output.meter = { label: 'Remembered', value: `${this.found.size} / ${this.view.stars.length}` };
  }

  private createLabel(star: MemoryStar): StarLabel {
    const element = document.createElement('span');
    element.className = 'stars__label caption';
    element.textContent = star.entry.label;
    this.layer.append(element);
    return { element, opacity: 0 };
  }

  private readonly handlePress = (event: PointerEvent): void => {
    if (!this.active || !(event.target instanceof HTMLCanvasElement)) return;
    const radius = this.context.viewport.isTouch ? PICK_RADIUS.touch : PICK_RADIUS.pointer;
    let best = -1;
    let bestDistance: number = radius;
    this.screenPositions.forEach((screen, index) => {
      if (!screen.visible || screen.distance > LABEL_RANGE.far) return;
      const distance = Math.hypot(screen.x - event.clientX, screen.y - event.clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    this.selected = best;
  };
}

function sampleJourney(progress: number): number {
  for (let i = 1; i < JOURNEY.length; i += 1) {
    const [end, to] = JOURNEY[i]!;
    if (progress <= end) {
      const [start, from] = JOURNEY[i - 1]!;
      return from + (to - from) * easeInOutSine(progressBetween(start, end, progress));
    }
  }
  return JOURNEY[JOURNEY.length - 1]![1];
}

function toRoman(value: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][value - 1] ?? String(value);
}
