import { Emitter } from './Emitter';

export interface ViewportSize {
  width: number;
  height: number;
  aspect: number;
  pixelRatio: number;
  isPortrait: boolean;
  isCompact: boolean;
}

const COMPACT_BREAKPOINT = 760;
const TOUCH_HEIGHT_TOLERANCE = 160;

export class Viewport {
  readonly resized = new Emitter<ViewportSize>();
  readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  readonly prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private current: ViewportSize = this.measure();
  private pendingFrame = 0;

  constructor() {
    this.applyCssUnits();
    window.addEventListener('resize', this.scheduleResize);
  }

  get size(): ViewportSize {
    return this.current;
  }

  private readonly scheduleResize = (): void => {
    cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = requestAnimationFrame(() => {
      const next = this.measure();
      if (this.isMobileToolbarJitter(next)) return;
      this.current = next;
      this.applyCssUnits();
      this.resized.emit(next);
    });
  };

  private isMobileToolbarJitter(next: ViewportSize): boolean {
    return (
      this.isTouch &&
      next.width === this.current.width &&
      Math.abs(next.height - this.current.height) < TOUCH_HEIGHT_TOLERANCE
    );
  }

  private measure(): ViewportSize {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      aspect: width / height,
      pixelRatio: window.devicePixelRatio || 1,
      isPortrait: height > width,
      isCompact: width < COMPACT_BREAKPOINT,
    };
  }

  private applyCssUnits(): void {
    document.documentElement.style.setProperty('--vh', `${this.current.height / 100}px`);
  }
}
