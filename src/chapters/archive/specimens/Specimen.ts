export interface SpecimenPointer {
  x: number;
  y: number;
  active: boolean;
}

export interface SpecimenPainter {
  resize(width: number, height: number): void;
  draw(ctx: CanvasRenderingContext2D, time: number, pointer: SpecimenPointer): void;
  press?(x: number, y: number, time: number): void;
}

export interface Specimen {
  update(time: number, delta: number): void;
}

const MAX_RATIO = 2;

export class CanvasSpecimen implements Specimen {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pointer: SpecimenPointer = { x: 0, y: 0, active: false };
  private visible = false;
  private width = 1;
  private height = 1;
  private time = 0;

  constructor(
    private readonly stage: HTMLElement,
    private readonly painter: SpecimenPainter,
  ) {
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.className = 'specimen__canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    stage.append(this.canvas);
    new ResizeObserver(() => this.resize()).observe(stage);
    new IntersectionObserver(([entry]) => (this.visible = Boolean(entry?.isIntersecting))).observe(stage);
    stage.addEventListener('pointermove', this.track, { passive: true });
    stage.addEventListener('pointerdown', this.handlePress, { passive: true });
    stage.addEventListener('pointerleave', () => (this.pointer.active = false), { passive: true });
  }

  update(time: number): void {
    this.time = time;
    if (!this.visible) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const ratio = this.canvas.width / this.width;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.painter.draw(this.ctx, time, this.pointer);
  }

  private resize(): void {
    const rect = this.stage.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.painter.resize(this.width, this.height);
  }

  private readonly track = (event: PointerEvent): void => {
    const rect = this.stage.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    this.pointer.active = true;
  };

  private readonly handlePress = (event: PointerEvent): void => {
    this.track(event);
    this.painter.press?.(this.pointer.x, this.pointer.y, this.time);
  };
}

export function ink(alpha: number): string {
  return `rgba(255,255,255,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
