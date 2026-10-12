import { createLayer, type Context } from '@/app/Context';
import { IDENTITY_BEATS, IDENTITY_NAME } from '@/content/copy';
import { damp, easeInCubic, progressBetween, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import { IdentityView } from '@/webgl/identity/IdentityView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';

const FORM_WINDOW = [0.2, 0.56] as const;
const SCATTER_WINDOW = [0.88, 1] as const;

export class IdentityChapter implements Chapter {
  readonly id = 'identity' as const;
  readonly view: IdentityView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private pointerStrength = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private resolved = false;

  constructor(private readonly context: Context) {
    this.view = new IdentityView(context.quality, IDENTITY_NAME);
    this.layer = createLayer(context, 'identity');
    const name = document.createElement('h2');
    name.className = 'sr-only';
    name.textContent = IDENTITY_NAME.join(' ');
    this.layer.append(name);
    this.beats = new Beats(this.layer, IDENTITY_BEATS);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
  }

  async prepare(): Promise<void> {
    await Promise.all([
      document.fonts.load('600 1em "Impostor Pro"'),
      document.fonts.load('500 1em "Impostor Pro"'),
    ]);
    this.view.build(this.context.viewport.size);
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.layer.classList.add('is-active');
  }

  leave(): void {
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    const { pointer } = frame;
    this.pointerStrength = damp(this.pointerStrength, pointer.isActive ? 1 : 0, 4, frame.delta);
    this.parallaxX = damp(this.parallaxX, frame.parallaxX, 2, frame.delta);
    this.parallaxY = damp(this.parallaxY, frame.parallaxY, 2, frame.delta);
    const form = progressBetween(FORM_WINDOW[0], FORM_WINDOW[1], progress);
    this.view.update(
      {
        time: frame.time,
        pixelRatio: this.context.renderer.pixelRatio,
        form,
        scatter: easeInCubic(progressBetween(SCATTER_WINDOW[0], SCATTER_WINDOW[1], progress)),
        pointerX: pointer.normalizedX,
        pointerY: pointer.normalizedY,
        pointerStrength: this.pointerStrength,
      },
      this.parallaxX,
      this.parallaxY,
    );
    this.beats.update(progress);
    const formed = form > 0.85;
    if (formed && !this.resolved) this.context.sound.cue('resolve', { gain: 1.2 });
    this.resolved = formed;
    this.mix(progress);
    output.post.toneMapping = 1;
    output.post.exposure = 1.15;
    output.post.contrast = 1.05;
    output.post.vignette = 0.3;
    output.post.grain = 0.05;
    output.post.fade = 1 - smoothstep(0, 0.05, progress);
    output.post.fadeTone = 0;
    output.theme = 'dark';
    output.meter = { label: 'Status', value: form > 0.9 ? 'Found' : 'Searching' };
  }

  private mix(progress: number): void {
    const arrival = smoothstep(0, 0.12, progress);
    this.context.sound.mix({
      air: 0,
      waves: 0,
      underwater: 0,
      depth: 0.25,
      pad: 0.7 * arrival,
      shimmer: 0.45 * arrival,
      tension: 0,
      room: 0,
      pulse: 0,
      motion: 0.2 * arrival,
      silence: 1 - arrival,
    });
  }
}
