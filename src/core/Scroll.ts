import Lenis from 'lenis';
import { Emitter } from './Emitter';
import { easeInOutCubic } from './math';
import type { Ticker } from './Ticker';

export interface ScrollState {
  y: number;
  velocity: number;
  direction: number;
}

export class Scroll {
  readonly changed = new Emitter<ScrollState>();
  readonly state: ScrollState = { y: 0, velocity: 0, direction: 1 };
  private readonly lenis: Lenis;
  private lockCount = 0;

  constructor(ticker: Ticker, reducedMotion: boolean) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    this.lenis = new Lenis({
      autoRaf: false,
      lerp: reducedMotion ? 1 : 0.075,
      smoothWheel: !reducedMotion,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      syncTouch: false,
    });
    this.lenis.on('scroll', this.handleScroll);
    ticker.add(({ time }) => this.lenis.raf(time * 1000), -100);
  }

  get y(): number {
    return this.state.y;
  }

  get isLocked(): boolean {
    return this.lockCount > 0;
  }

  lock(): void {
    this.lockCount += 1;
    this.lenis.stop();
  }

  unlock(): void {
    this.lockCount = Math.max(0, this.lockCount - 1);
    if (this.lockCount === 0) this.lenis.start();
  }

  to(y: number, options: { duration?: number; immediate?: boolean; onComplete?: () => void } = {}): void {
    this.lenis.scrollTo(y, {
      duration: options.duration ?? 1.6,
      immediate: options.immediate ?? false,
      force: true,
      lock: true,
      easing: easeInOutCubic,
      onComplete: () => options.onComplete?.(),
    });
  }

  refresh(): void {
    this.lenis.resize();
  }

  private readonly handleScroll = (lenis: Lenis): void => {
    this.state.y = lenis.scroll;
    this.state.velocity = lenis.velocity;
    this.state.direction = lenis.direction || this.state.direction;
    this.changed.emit(this.state);
  };
}
