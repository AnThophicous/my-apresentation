import { AudioDirector } from '@/audio/AudioDirector';
import type { Chapter, Frame } from '@/chapters/Chapter';
import { createChapters } from '@/chapters/registry';
import { Pointer } from '@/core/Pointer';
import { detectQuality } from '@/core/Quality';
import { Scroll } from '@/core/Scroll';
import { Ticker } from '@/core/Ticker';
import { Viewport } from '@/core/Viewport';
import { SECTIONS, type SectionId } from '@/story/sections';
import { Story } from '@/story/Story';
import { Cursor } from '@/ui/Cursor';
import { Hud } from '@/ui/Hud';
import { Loader } from '@/ui/Loader';
import { Renderer } from '@/webgl/Renderer';
import type { Context } from './Context';
import { Director } from './Director';

const FONT_FACES = [
  '400 1em "Impostor Pro"',
  '500 1em "Impostor Pro"',
  '600 1em "Impostor Pro"',
  '700 1em "Impostor Pro"',
];

export class Experience {
  private readonly viewport = new Viewport();
  private readonly ticker = new Ticker();
  private readonly pointer = new Pointer(this.viewport);
  private readonly quality = detectQuality(this.viewport);
  private readonly scroll = new Scroll(this.ticker, this.viewport.prefersReducedMotion);
  private readonly sound = new AudioDirector();
  private readonly loader = new Loader(query('.loader'));
  private readonly cursor = new Cursor(query('.cursor'), this.pointer, this.viewport.isTouch);
  private readonly hud = new Hud(query('.hud'), query('.index'), SECTIONS);
  private readonly story: Story;
  private readonly renderer: Renderer;
  private readonly chapters: Map<SectionId, Chapter>;
  private readonly director: Director;
  private readonly frame: Frame;

  constructor() {
    this.scroll.lock();
    this.story = new Story(query('.story'), this.viewport, this.scroll);
    this.renderer = new Renderer(query<HTMLCanvasElement>('.gl'), this.viewport, this.quality);
    const context: Context = {
      viewport: this.viewport,
      pointer: this.pointer,
      scroll: this.scroll,
      story: this.story,
      renderer: this.renderer,
      quality: this.quality,
      sound: this.sound,
      ticker: this.ticker,
      stage: query('.stage'),
    };
    this.chapters = createChapters(context);
    this.director = new Director(
      this.chapters,
      this.renderer,
      this.hud,
      this.cursor,
      this.viewport.prefersReducedMotion,
    );
    this.frame = {
      time: 0,
      delta: 0,
      pointer: this.pointer.state,
      parallaxX: 0,
      parallaxY: 0,
      scrollVelocity: 0,
      size: this.viewport.size,
    };
    this.bindControls();
    document.documentElement.dataset.quality = this.quality.tier;
  }

  async start(): Promise<void> {
    const fonts = FONT_FACES.map((face) => document.fonts.load(face).then(() => undefined));
    const chapters = [...this.chapters.values()].map((chapter) => chapter.prepare());
    await this.loader.track([...fonts, ...chapters]);
    this.ticker.add(this.tick);
    this.ticker.start();
    await this.loader.finish();
    document.body.classList.add('is-ready');
    this.scroll.unlock();
    this.followDeepLink();
  }

  private followDeepLink(): void {
    const [id, progress] = window.location.hash.slice(1).split('/');
    const section = SECTIONS.find((spec) => spec.id === id);
    if (!section) return;
    this.story.goTo(section.id, Number(progress) || 0.02, true);
  }

  private readonly tick = ({ time, delta }: { time: number; delta: number }): void => {
    this.pointer.update(delta);
    const state = this.story.update();
    this.frame.time = time;
    this.frame.delta = delta;
    this.frame.parallaxX = this.pointer.smooth.normalizedX;
    this.frame.parallaxY = this.pointer.smooth.normalizedY;
    this.frame.scrollVelocity = this.scroll.state.velocity;
    this.frame.size = this.viewport.size;
    this.director.update(state, this.frame);
    this.cursor.update(delta);
  };

  private bindControls(): void {
    this.hud.soundToggled.on(async (on) => {
      await this.sound.setEnabled(on);
      this.hud.setSound(this.sound.enabled);
    });
    this.sound.changed.on((on) => this.hud.setSound(on));
    this.hud.brandPressed.on(() => this.story.goTo('welcome', 0));
    this.hud.sectionRequested.on((id) => this.story.goTo(id, id === 'archive' ? 0 : 0.02));
  }
}

function query<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element "${selector}"`);
  return element;
}
