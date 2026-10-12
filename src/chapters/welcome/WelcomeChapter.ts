import { createLayer, type Context } from '@/app/Context';
import { WELCOME_BEATS } from '@/content/copy';
import { Beats } from '@/ui/Beats';
import { HorizonInteraction } from '@/webgl/surface/HorizonInteraction';
import type { HorizonLine } from '@/webgl/surface/HorizonLine';
import { PaperOverlay } from '@/webgl/surface/PaperOverlay';
import { PaperView } from '@/webgl/surface/PaperView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import { DiveButton } from './DiveButton';
import './welcome.css';

const GATE_REVEAL = 0.89;
const GATE_RESET = 0.84;
const HINT_LIMIT = 0.035;
const DESCENT_TARGET = 0.1;
const DESCENT_DURATION = 3.2;

export class WelcomeChapter implements Chapter {
  readonly id = 'welcome' as const;
  readonly view: PaperView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly soundPrompt: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly dive: DiveButton;
  private readonly interaction: HorizonInteraction;
  private progress = 0;
  private active = false;
  private soundAnswered = false;

  constructor(
    private readonly context: Context,
    private readonly line: HorizonLine,
  ) {
    this.view = new PaperView(new PaperOverlay(line));
    this.interaction = new HorizonInteraction(line, context.sound);
    this.layer = createLayer(context, 'welcome');
    this.beats = new Beats(this.layer, WELCOME_BEATS);
    this.soundPrompt = this.createSoundPrompt();
    this.hint = this.createHint();
    this.dive = new DiveButton(this.layer);
    this.dive.pressed.on(() => this.descend());
    context.pointer.pressed.on(this.handlePaperPress);
    window.addEventListener('wheel', this.handleIntent, { passive: true });
    window.addEventListener('touchmove', this.handleIntent, { passive: true });
  }

  async prepare(): Promise<void> {
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    this.active = true;
    this.layer.classList.add('is-active');
    this.soundPrompt.classList.add('is-visible');
  }

  leave(): void {
    this.active = false;
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    this.progress = progress;
    this.beats.update(progress);
    this.hint.style.opacity = progress < HINT_LIMIT ? '1' : '0';
    this.soundPrompt.classList.toggle(
      'is-hidden',
      this.soundAnswered || this.context.sound.enabled || progress > 0.14,
    );
    if (progress < GATE_RESET) this.dive.reset();
    this.dive.setVisible(progress > GATE_REVEAL);
    this.dive.update(frame.delta, frame.pointer);
    this.updateLine(frame);
    this.context.sound.mix({
      air: 1,
      waves: 0.08 + progress * 0.12,
      underwater: 0,
      depth: 0,
      pad: 0.15,
      tension: 0,
      shimmer: 0,
      pulse: 0,
      motion: 0,
      room: 0,
      silence: 0,
    });
    output.post.toneMapping = 0;
    output.post.vignette = 0;
    output.post.grain = 0.035;
    output.meter = { label: 'Depth', value: '0 m' };
  }

  private updateLine(frame: Frame): void {
    const { width, height } = frame.size;
    const lineY = height * 0.5;
    this.interaction.update(frame.delta, frame.pointer, frame.size, this.active);
    this.view.paper.resize(width, height, this.context.renderer.pixelRatio);
    this.view.paper.update({
      lineY,
      reveal: 0,
      originX: width / 2,
      originY: lineY,
      ink: 0,
      time: frame.time,
    });
  }

  private descend(): void {
    const { story, scroll, sound } = this.context;
    sound.cue('splash');
    this.line.impulse(0.5, -900, 0.05);
    story.open('dive');
    scroll.to(story.positionOf('ocean', DESCENT_TARGET), { duration: DESCENT_DURATION });
  }

  private createSoundPrompt(): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'welcome__sound';
    prompt.innerHTML = `
      <span class="caption">Sound on?</span>
      <button class="pill" type="button" data-answer="yes" data-cursor="Listen">Yes</button>
      <button class="pill" type="button" data-answer="no" data-cursor="Quiet">No</button>`;
    prompt.addEventListener('click', (event) => {
      const answer = (event.target as HTMLElement).closest<HTMLElement>('[data-answer]')?.dataset.answer;
      if (!answer) return;
      this.soundAnswered = true;
      void this.context.sound.setEnabled(answer === 'yes');
    });
    this.layer.append(prompt);
    return prompt;
  }

  private createHint(): HTMLElement {
    const hint = document.createElement('div');
    hint.className = 'welcome__hint caption';
    hint.innerHTML = `<span>Scroll</span><span class="welcome__hint-line"></span>`;
    this.layer.append(hint);
    return hint;
  }

  private readonly handlePaperPress = (event: PointerEvent): void => {
    if (!this.active || !(event.target instanceof HTMLCanvasElement)) return;
    const { width, height } = this.context.viewport.size;
    this.line.addRipple(event.clientX, event.clientY, 1);
    this.line.impulse(event.clientX / width, (height * 0.5 - event.clientY) * 6, 0.05);
    this.context.sound.cue('drip', { pitch: -5, pan: (event.clientX / width) * 2 - 1 });
  };

  private readonly handleIntent = (event: Event): void => {
    if (!this.active || this.context.story.isOpen('dive') || this.progress < 0.97) return;
    if (event instanceof WheelEvent && event.deltaY <= 0) return;
    this.dive.nudge();
  };
}
