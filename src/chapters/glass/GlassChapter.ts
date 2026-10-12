import { createLayer, type Context } from '@/app/Context';
import { GLASS_BEATS } from '@/content/copy';
import { easeInExpo, easeOutCubic, progressBetween, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import { GlassView } from '@/webgl/glass/GlassView';
import type { StarsChapter } from '../stars/StarsChapter';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';

const LOOK_WINDOW = [0, 0.14] as const;
const CRACK_WINDOW = [0.08, 0.16] as const;
const BURST_WINDOW = [0.16, 0.27] as const;
const FREEZE_WINDOW = [0.27, 0.8] as const;
const BOOST_WINDOW = [0.8, 1] as const;
const BURST_REACH = 0.3;
const FREEZE_REACH = 0.4;

export class GlassChapter implements Chapter {
  readonly id = 'glass' as const;
  readonly view: GlassView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private shattered = false;
  private cracked = false;
  private frozen = false;
  private boosted = false;
  private built = false;
  private seed = 1;

  constructor(
    private readonly context: Context,
    private readonly stars: StarsChapter,
  ) {
    this.view = new GlassView(context.quality);
    this.view.setSource(stars.view);
    this.layer = createLayer(context, 'glass');
    this.beats = new Beats(this.layer, GLASS_BEATS);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => {
      this.view.resize(size);
      this.built = false;
    });
  }

  async prepare(): Promise<void> {
    this.build(this.context.viewport.size.width / 2, this.context.viewport.size.height / 2);
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.layer.classList.add('is-active');
    const progress = this.context.story.current.progress;
    if (progress < CRACK_WINDOW[0] || !this.built) this.aim();
  }

  leave(): void {
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    if (!this.built) this.aim();
    const explode = this.explosion(progress);
    this.view.setFrozen(explode > 0);
    if (explode <= 0) this.stars.stage(1, frame.time);
    this.view.update({
      lean: easeOutCubic(progressBetween(LOOK_WINDOW[0], LOOK_WINDOW[1], progress)),
      crack: easeOutCubic(progressBetween(CRACK_WINDOW[0], CRACK_WINDOW[1], progress)) * 0.42,
      explode,
      boost: easeInExpo(progressBetween(BOOST_WINDOW[0], BOOST_WINDOW[1], progress)),
    });
    this.beats.update(progress);
    this.playCues(progress);
    this.mix(progress);
    this.writeOutput(progress, output);
  }

  private explosion(progress: number): number {
    const burst = easeOutCubic(progressBetween(BURST_WINDOW[0], BURST_WINDOW[1], progress)) * BURST_REACH;
    const drift =
      progressBetween(FREEZE_WINDOW[0], FREEZE_WINDOW[1], progress) * (FREEZE_REACH - BURST_REACH);
    const release = progressBetween(BOOST_WINDOW[0], BOOST_WINDOW[1], progress) * 0.9;
    return burst + drift + release;
  }

  private aim(): void {
    const { pointer } = this.context;
    const { width, height } = this.context.viewport.size;
    const active = pointer.state.isActive;
    this.seed += 1;
    this.build(active ? pointer.state.x : width * 0.54, active ? pointer.state.y : height * 0.46);
  }

  private build(x: number, y: number): void {
    this.view.shatterAt(x, y, this.context.viewport.size, this.context.renderer.pixelRatio, this.seed);
    this.built = true;
  }

  private playCues(progress: number): void {
    const { sound } = this.context;
    const cracking = progress > CRACK_WINDOW[0];
    if (cracking && !this.cracked) sound.cue('tick', { pitch: -24, gain: 1.4 });
    this.cracked = cracking;
    const shattering = progress > BURST_WINDOW[0];
    if (shattering && !this.shattered) sound.cue('shatter', { gain: 1.2 });
    this.shattered = shattering;
    const freezing = progress > FREEZE_WINDOW[0];
    if (freezing && !this.frozen) sound.cue('freeze');
    this.frozen = freezing;
    const boosting = progress > BOOST_WINDOW[0];
    if (boosting && !this.boosted) sound.cue('whoosh', { gain: 1.3 });
    this.boosted = boosting;
  }

  private mix(progress: number): void {
    const stillness =
      smoothstep(BURST_WINDOW[0], FREEZE_WINDOW[0], progress) * (1 - smoothstep(0.9, 1, progress));
    this.context.sound.mix({
      air: 0,
      waves: 0,
      underwater: 0,
      depth: 0.3,
      pad: 0.6 * (1 - stillness),
      shimmer: 0.5 * (1 - stillness),
      tension: 0.2,
      room: 0,
      pulse: 0.2 * (1 - stillness),
      motion: 0.3 * (1 - stillness),
      silence: stillness,
    });
  }

  private writeOutput(progress: number, output: ChapterOutput): void {
    const boost = progressBetween(BOOST_WINDOW[0], BOOST_WINDOW[1], progress);
    output.post.toneMapping = 1;
    output.post.exposure = 1.1;
    output.post.contrast = 1.08;
    output.post.vignette = 0.3;
    output.post.grain = 0.05;
    output.post.flash =
      (1 - smoothstep(0, 0.05, progress - BURST_WINDOW[0])) * (progress > BURST_WINDOW[0] ? 0.55 : 0);
    output.post.zoomBlur = smoothstep(0, 0.6, boost) * 1.5;
    output.post.fade = smoothstep(0.9, 1, progress);
    output.post.fadeTone = 0;
    output.theme = 'dark';
    const still = progress > FREEZE_WINDOW[0] && progress < BOOST_WINDOW[0];
    output.meter = {
      label: 'Time',
      value: still ? 'stopped' : progress > BOOST_WINDOW[0] ? 'resuming' : 'running',
    };
  }
}
