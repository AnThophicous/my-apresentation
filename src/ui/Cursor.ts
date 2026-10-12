import { damp } from '@/core/math';
import type { Pointer } from '@/core/Pointer';

export class Cursor {
  private readonly ring: HTMLElement;
  private readonly dot: HTMLElement;
  private readonly label: HTMLElement;
  private readonly enabled: boolean;
  private ringX = -100;
  private ringY = -100;
  private domLabel: string | null = null;
  private sceneLabel: string | null = null;
  private renderedLabel: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly pointer: Pointer,
    isTouch: boolean,
  ) {
    this.ring = root.querySelector('.cursor__ring')!;
    this.dot = root.querySelector('.cursor__dot')!;
    this.label = root.querySelector('.cursor__label')!;
    this.enabled = !isTouch;
    if (!this.enabled) return;
    document.documentElement.classList.add('has-cursor');
    document.addEventListener('pointerover', this.handleOver, { passive: true });
    pointer.pressed.on(() => this.root.classList.add('is-pressed'));
    pointer.released.on(() => this.root.classList.remove('is-pressed'));
  }

  setSceneLabel(label: string | null): void {
    this.sceneLabel = label;
  }

  update(delta: number): void {
    if (!this.enabled) return;
    const { x, y, isActive } = this.pointer.state;
    this.root.classList.toggle('is-visible', isActive);
    this.ringX = damp(this.ringX, x, 14, delta);
    this.ringY = damp(this.ringY, y, 14, delta);
    this.dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0)`;
    this.label.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0) translate(-50%, -50%)`;
    this.renderLabel(this.sceneLabel ?? this.domLabel);
  }

  private renderLabel(label: string | null): void {
    if (label === this.renderedLabel) return;
    this.renderedLabel = label;
    this.root.classList.toggle('is-labelled', Boolean(label));
    if (label) this.label.textContent = label;
  }

  private readonly handleOver = (event: PointerEvent): void => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-cursor]') : null;
    this.domLabel = target?.dataset.cursor ?? null;
  };
}
