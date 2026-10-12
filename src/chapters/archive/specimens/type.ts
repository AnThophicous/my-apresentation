import { damp } from '@/core/math';
import { MagnifyText, type MagnifyFocus } from '@/ui/MagnifyText';
import type { Specimen } from './Specimen';

export class TypeSpecimen implements Specimen {
  private readonly text: MagnifyText;
  private readonly focus: MagnifyFocus = { x: -9999, y: -9999, strength: 0 };
  private measuredLeft = 0;
  private measuredTop = 0;
  private pointerX = 0;
  private pointerY = 0;
  private active = false;
  private visible = false;

  constructor(private readonly stage: HTMLElement) {
    this.text = new MagnifyText(stage, [{ text: 'Closer.', size: 'hero' }], 'specimen__type');
    this.text.reveal(0, 1, 'rise');
    new ResizeObserver(() => this.measure()).observe(stage);
    new IntersectionObserver(([entry]) => {
      this.visible = Boolean(entry?.isIntersecting);
      if (this.visible) this.measure();
    }).observe(stage);
    stage.addEventListener(
      'pointermove',
      (event) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.active = true;
      },
      { passive: true },
    );
    stage.addEventListener('pointerleave', () => (this.active = false), { passive: true });
  }

  update(time: number, delta: number): void {
    if (!this.visible) return;
    const rect = this.stage.getBoundingClientRect();
    const shiftX = rect.left - this.measuredLeft;
    const shiftY = rect.top - this.measuredTop;
    if (this.active) {
      this.focus.x = this.pointerX - shiftX;
      this.focus.y = this.pointerY - shiftY;
    } else {
      this.focus.x = this.measuredLeft + rect.width * (0.5 + Math.sin(time * 0.9) * 0.4);
      this.focus.y = this.measuredTop + rect.height * 0.5;
    }
    this.focus.strength = damp(this.focus.strength, this.active ? 1 : 0.7, 5, delta);
    this.text.update(delta, this.focus);
  }

  private measure(): void {
    const rect = this.stage.getBoundingClientRect();
    this.measuredLeft = rect.left;
    this.measuredTop = rect.top;
    this.text.measure(window.innerHeight, rect.width * 0.62);
  }
}
