import { createLayer, type Context } from '@/app/Context';
import { pentatonicNote } from '@/audio/music';
import { FALL_ROWS, HELLO_HINT, HELLO_ROWS } from '@/content/copy';
import { clamp, damp, easeOutCubic, progressBetween, smoothstep } from '@/core/math';
import { MagnifyText, type MagnifyFocus } from '@/ui/MagnifyText';
import { FabricView } from '@/webgl/fabric/FabricView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import './hello.css';

const GREETING_TYPED = 3;
const TYPE_WINDOW = [0.015, 0.12] as const;
const RISE_WINDOWS = [
  [0.14, 0.2],
  [0.21, 0.27],
  [0.25, 0.31],
  [0.34, 0.4],
] as const;
const HINT_WINDOW = [0.4, 0.6] as const;
const DROP_WINDOW = [0.6, 0.7] as const;
const FALL_WINDOWS = [
  [0.68, 0.74],
  [0.75, 0.81],
] as const;
const FORM_WINDOW = [0.78, 0.88] as const;
const PULL_WINDOW = [0.86, 0.97] as const;
const SWALLOW_WINDOW = [0.9, 0.995] as const;
const FORMED_HORIZON = 46;
const SINGULARITY_HEIGHT = 0.6;
const NOTE_INTERVAL = 0.075;

export class HelloChapter implements Chapter {
  readonly id = 'hello' as const;
  readonly view = new FabricView();
  private readonly layer: HTMLElement;
  private readonly greeting: MagnifyText;
  private readonly invitation: MagnifyText;
  private readonly caret: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly focus: MagnifyFocus = { x: -9999, y: -9999, strength: 0 };
  private active = false;
  private measured = false;
  private lastNote = -1;
  private noteAt = 0;
  private heartbeatPlayed = false;
  private whooshPlayed = false;

  constructor(private readonly context: Context) {
    this.layer = createLayer(context, 'hello');
    this.greeting = new MagnifyText(this.layer, HELLO_ROWS, 'hello__greeting');
    this.invitation = new MagnifyText(this.layer, FALL_ROWS, 'hello__invitation');
    this.caret = document.createElement('span');
    this.caret.className = 'hello__caret';
    this.layer.append(this.caret);
    this.hint = document.createElement('p');
    this.hint.className = 'hello__hint caption';
    this.hint.textContent = context.viewport.isTouch ? HELLO_HINT.touch : HELLO_HINT.pointer;
    this.layer.append(this.hint);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => {
      this.view.resize(size);
      if (this.active) this.measure();
    });
  }

  async prepare(): Promise<void> {
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.active = true;
    this.layer.classList.add('is-active');
    this.measure();
  }

  leave(): void {
    this.active = false;
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    if (!this.measured) this.measure();
    const { width, height } = frame.size;
    this.revealGreeting(progress);
    this.revealInvitation(progress);
    this.updateFocus(progress, frame);
    const centerX = width / 2;
    const centerY = height * SINGULARITY_HEIGHT;
    const reach = Math.hypot(width, height);
    const pull = progressBetween(PULL_WINDOW[0], PULL_WINDOW[1], progress);
    this.greeting.pull(pull, centerX, centerY, reach * 0.5);
    this.invitation.pull(pull, centerX, centerY, reach * 0.5);
    const focused = this.greeting.update(frame.delta, this.focus);
    const invited = this.invitation.update(frame.delta, this.focus);
    this.playNote(focused >= 0 ? focused : invited >= 0 ? 40 + invited : -1, frame);
    this.updateCaret(progress);
    this.hint.style.opacity = String(
      smoothstep(HINT_WINDOW[0], HINT_WINDOW[0] + 0.03, progress) *
        (1 - smoothstep(HINT_WINDOW[1] - 0.03, HINT_WINDOW[1], progress)),
    );
    const horizon = this.horizonRadius(progress, reach);
    this.view.setResolution(width, height, this.context.renderer.pixelRatio);
    this.view.update({
      time: frame.time,
      reveal: smoothstep(0, 0.06, progress),
      centerX,
      centerY,
      horizon,
      twist: 1.4 + pull * 2.2,
      focusX: this.focus.x,
      focusY: this.focus.y,
      focusStrength: this.focus.strength,
    });
    this.playCues(progress);
    this.mix(progress);
    this.writeOutput(progress, horizon, reach, output);
  }

  private measure(): void {
    const { width, height, isCompact } = this.context.viewport.size;
    const maxWidth = width - (isCompact ? 40 : 160);
    this.greeting.measure(height, maxWidth);
    this.invitation.measure(height, maxWidth);
    this.measured = true;
  }

  private revealGreeting(progress: number): void {
    const typed = progressBetween(TYPE_WINDOW[0], TYPE_WINDOW[1], progress);
    this.greeting.reveal(0, typed, 'type', GREETING_TYPED);
    RISE_WINDOWS.forEach(([start, end], index) => {
      this.greeting.reveal(index + 1, progressBetween(start, end, progress), 'rise');
    });
    const drop = progressBetween(DROP_WINDOW[0], DROP_WINDOW[1], progress);
    for (let row = 0; row < this.greeting.rowCount; row += 1) {
      this.greeting.drop(row, clamp(drop * 1.25 - (this.greeting.rowCount - 1 - row) * 0.06));
    }
  }

  private revealInvitation(progress: number): void {
    FALL_WINDOWS.forEach(([start, end], index) => {
      this.invitation.reveal(index, progressBetween(start, end, progress), 'rise');
    });
  }

  private updateFocus(progress: number, frame: Frame): void {
    const { pointer } = frame;
    const settled = progress > RISE_WINDOWS[3][0] && progress < DROP_WINDOW[0];
    const autoScan =
      this.context.viewport.isTouch &&
      !pointer.isActive &&
      settled &&
      !this.context.viewport.prefersReducedMotion;
    if (pointer.isActive) {
      this.focus.x = pointer.x;
      this.focus.y = pointer.y;
    } else if (autoScan) {
      const { width, height } = frame.size;
      this.focus.x = width * (0.5 + Math.sin(frame.time * 0.55) * 0.42);
      this.focus.y = height * (0.5 + Math.sin(frame.time * 0.31 + 1.2) * 0.16);
    }
    const target = (pointer.isActive ? 1 : autoScan ? 0.75 : 0) * (1 - progressBetween(0.84, 0.9, progress));
    this.focus.strength = damp(this.focus.strength, target, 4, frame.delta);
  }

  private updateCaret(progress: number): void {
    const typedCount = Math.max(
      GREETING_TYPED,
      Math.floor(
        progressBetween(TYPE_WINDOW[0], TYPE_WINDOW[1], progress) * HELLO_ROWS[0]!.text.length + 0.0001,
      ),
    );
    const caret = this.greeting.caret(0, typedCount);
    const visible = progress < RISE_WINDOWS[0][1];
    this.caret.style.opacity = visible ? '' : '0';
    this.caret.style.height = `${caret.height.toFixed(1)}px`;
    this.caret.style.transform = `translate3d(${(caret.x + caret.height * 0.06).toFixed(1)}px, ${(caret.y - caret.height / 2).toFixed(1)}px, 0)`;
  }

  private horizonRadius(progress: number, reach: number): number {
    const formed = easeOutCubic(progressBetween(FORM_WINDOW[0], FORM_WINDOW[1], progress)) * FORMED_HORIZON;
    const swallow = Math.pow(progressBetween(SWALLOW_WINDOW[0], SWALLOW_WINDOW[1], progress), 3) * reach;
    return formed + swallow;
  }

  private playNote(glyph: number, frame: Frame): void {
    if (glyph === this.lastNote) return;
    this.lastNote = glyph;
    if (glyph < 0 || frame.time - this.noteAt < NOTE_INTERVAL) return;
    this.noteAt = frame.time;
    const pan = clamp((this.focus.x / frame.size.width) * 2 - 1, -1, 1) * 0.6;
    this.context.sound.cue('note', { pitch: pentatonicNote(glyph * 3) - 12, gain: 0.35, pan });
  }

  private playCues(progress: number): void {
    const { sound } = this.context;
    const forming = progress > FORM_WINDOW[0] + 0.01;
    if (forming && !this.heartbeatPlayed) sound.cue('heartbeat');
    this.heartbeatPlayed = forming;
    const swallowing = progress > SWALLOW_WINDOW[0];
    if (swallowing && !this.whooshPlayed) sound.cue('whoosh', { gain: 1.2 });
    this.whooshPlayed = swallowing;
  }

  private mix(progress: number): void {
    const fall = smoothstep(FORM_WINDOW[0], 1, progress);
    this.context.sound.mix({
      air: 0.25 * (1 - fall),
      waves: 0,
      underwater: 0,
      depth: fall * 0.6,
      pad: 0.45 * (1 - fall * 0.5),
      shimmer: 0.35 * (1 - fall),
      tension: fall,
      room: 0,
      pulse: smoothstep(0.84, 1, progress) * 0.8,
      motion: 0.25 * (1 - fall),
      silence: 0,
    });
  }

  private writeOutput(progress: number, horizon: number, reach: number, output: ChapterOutput): void {
    output.post.toneMapping = 0;
    output.post.vignette = 0.08 + smoothstep(FORM_WINDOW[0], 1, progress) * 0.3;
    output.post.grain = 0.04;
    output.post.contrast = 1.04;
    output.post.zoomBlur = smoothstep(SWALLOW_WINDOW[0], 1, progress) * 0.9;
    output.post.zoomCenterY = 1 - SINGULARITY_HEIGHT;
    output.theme = horizon > reach * 0.3 ? 'dark' : 'light';
    output.meter = { label: 'Gravity', value: this.gravityReading(progress) };
  }

  private gravityReading(progress: number): string {
    if (progress > SWALLOW_WINDOW[1]) return '∞';
    const strength = 1 + Math.pow(progressBetween(FORM_WINDOW[0], SWALLOW_WINDOW[1], progress), 4) * 9999;
    return `${strength < 10 ? strength.toFixed(2) : Math.round(strength)} g`;
  }
}
