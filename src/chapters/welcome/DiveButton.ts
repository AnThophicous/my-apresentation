import { Emitter } from '@/core/Emitter';
import { damp } from '@/core/math';
import type { PointerState } from '@/core/Pointer';

const MAGNET_RADIUS = 170;
const MAGNET_STRENGTH = 0.32;
const RELEASE_DURATION = 520;

export class DiveButton {
  readonly element: HTMLButtonElement;
  readonly pressed = new Emitter<void>();
  private readonly core: HTMLElement;
  private offsetX = 0;
  private offsetY = 0;
  private released = false;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('button');
    this.element.type = 'button';
    this.element.className = 'dive';
    this.element.dataset.cursor = 'Dive';
    this.element.setAttribute('aria-label', 'Dive in');
    this.element.innerHTML = `
      <svg class="dive__ring" viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id="dive-orbit" d="M100,100 m-84,0 a84,84 0 1,1 168,0 a84,84 0 1,1 -168,0" /></defs>
        <text><textPath href="#dive-orbit" textLength="526">More beneath the surface • More beneath the surface •</textPath></text>
      </svg>
      <span class="dive__core"><span class="dive__label">Dive in</span></span>`;
    this.core = this.element.querySelector('.dive__core')!;
    this.element.addEventListener('click', () => this.press());
    parent.append(this.element);
  }

  setVisible(visible: boolean): void {
    if (this.released) return;
    this.element.classList.toggle('is-visible', visible);
    this.element.tabIndex = visible ? 0 : -1;
  }

  reset(): void {
    this.released = false;
    this.element.classList.remove('is-released');
  }

  nudge(): void {
    this.element.classList.remove('is-nudged');
    void this.element.offsetWidth;
    this.element.classList.add('is-nudged');
  }

  update(delta: number, pointer: PointerState): void {
    const bounds = this.element.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const inside = pointer.isActive && Math.hypot(dx, dy) < MAGNET_RADIUS && !this.released;
    this.offsetX = damp(this.offsetX, inside ? dx * MAGNET_STRENGTH : 0, 10, delta);
    this.offsetY = damp(this.offsetY, inside ? dy * MAGNET_STRENGTH : 0, 10, delta);
    this.core.style.transform = `translate3d(${this.offsetX.toFixed(2)}px, ${this.offsetY.toFixed(2)}px, 0)`;
  }

  private press(): void {
    if (this.released || !this.element.classList.contains('is-visible')) return;
    this.released = true;
    this.element.classList.add('is-released');
    window.setTimeout(() => this.pressed.emit(), RELEASE_DURATION);
  }
}
