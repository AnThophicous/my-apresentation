import { Emitter } from './Emitter';
import { damp } from './math';
import type { Viewport } from './Viewport';

export interface PointerState {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  isDown: boolean;
  isActive: boolean;
}

export class Pointer {
  readonly pressed = new Emitter<PointerEvent>();
  readonly released = new Emitter<PointerEvent>();
  readonly state: PointerState = {
    x: -9999,
    y: -9999,
    normalizedX: 0,
    normalizedY: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    isDown: false,
    isActive: false,
  };
  readonly smooth = { normalizedX: 0, normalizedY: 0 };
  private previousX = 0;
  private previousY = 0;
  private hasPrevious = false;

  constructor(private readonly viewport: Viewport) {
    window.addEventListener('pointermove', this.handleMove, { passive: true });
    window.addEventListener('pointerdown', this.handleDown, { passive: true });
    window.addEventListener('pointerup', this.handleUp, { passive: true });
    window.addEventListener('pointercancel', this.handleUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => (this.state.isActive = false));
  }

  update(delta: number): void {
    const { state } = this;
    if (this.hasPrevious && delta > 0) {
      const instantX = (state.x - this.previousX) / delta;
      const instantY = (state.y - this.previousY) / delta;
      state.velocityX = damp(state.velocityX, instantX, 18, delta);
      state.velocityY = damp(state.velocityY, instantY, 18, delta);
      state.speed = Math.hypot(state.velocityX, state.velocityY);
    }
    this.previousX = state.x;
    this.previousY = state.y;
    this.hasPrevious = state.isActive;
    this.smooth.normalizedX = damp(this.smooth.normalizedX, state.normalizedX, 3, delta);
    this.smooth.normalizedY = damp(this.smooth.normalizedY, state.normalizedY, 3, delta);
  }

  private readonly handleMove = (event: PointerEvent): void => {
    this.track(event);
  };

  private readonly handleDown = (event: PointerEvent): void => {
    this.track(event);
    this.state.isDown = true;
    this.pressed.emit(event);
  };

  private readonly handleUp = (event: PointerEvent): void => {
    this.state.isDown = false;
    if (event.pointerType !== 'mouse') this.state.isActive = false;
    this.released.emit(event);
  };

  private track(event: PointerEvent): void {
    const { width, height } = this.viewport.size;
    this.state.x = event.clientX;
    this.state.y = event.clientY;
    this.state.normalizedX = (event.clientX / width) * 2 - 1;
    this.state.normalizedY = -((event.clientY / height) * 2 - 1);
    this.state.isActive = true;
  }
}
