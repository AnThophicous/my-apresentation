import { Emitter } from '@/core/Emitter';
import type { SectionId, SectionSpec } from '@/story/sections';

export interface MeterReading {
  label: string;
  value: string;
}

export class Hud {
  readonly soundToggled = new Emitter<boolean>();
  readonly brandPressed = new Emitter<void>();
  readonly sectionRequested = new Emitter<SectionId>();
  private readonly chapterIndex: HTMLElement;
  private readonly chapterTitle: HTMLElement;
  private readonly meterLabel: HTMLElement;
  private readonly meterValue: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly soundButton: HTMLButtonElement;
  private readonly soundLabel: HTMLElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly links = new Map<SectionId, HTMLButtonElement>();
  private soundOn = false;
  private lastMeter = '';

  constructor(root: HTMLElement, menu: HTMLElement, sections: readonly SectionSpec[]) {
    this.chapterIndex = root.querySelector('.hud__chapter-index')!;
    this.chapterTitle = root.querySelector('.hud__chapter-title')!;
    this.meterLabel = root.querySelector('.hud__meter-label')!;
    this.meterValue = root.querySelector('.hud__meter-value')!;
    this.progress = root.querySelector('.hud__progress')!;
    this.soundButton = root.querySelector('.hud__sound')!;
    this.soundLabel = root.querySelector('.hud__sound-label')!;
    this.menuButton = root.querySelector('.hud__menu')!;
    this.menu = menu;
    this.buildMenu(sections);
    root.querySelector('.hud__brand')!.addEventListener('click', () => this.brandPressed.emit());
    this.soundButton.addEventListener('click', () => this.soundToggled.emit(!this.soundOn));
    this.menuButton.addEventListener('click', () => this.toggleMenu());
    window.addEventListener('keydown', (event) => event.key === 'Escape' && this.closeMenu());
  }

  setSound(on: boolean): void {
    this.soundOn = on;
    this.soundButton.setAttribute('aria-pressed', String(on));
    this.soundLabel.textContent = on ? 'Sound on' : 'Sound off';
  }

  setSection(spec: SectionSpec): void {
    this.chapterIndex.textContent = spec.index;
    this.chapterTitle.textContent = spec.title;
    this.links.forEach((link, id) => link.classList.toggle('is-current', id === spec.id));
  }

  setMeter(reading: MeterReading): void {
    const key = `${reading.label}|${reading.value}`;
    if (key === this.lastMeter) return;
    this.lastMeter = key;
    this.meterLabel.textContent = reading.label;
    this.meterValue.textContent = reading.value;
  }

  setProgress(overall: number): void {
    this.progress.style.setProperty('--progress', overall.toFixed(4));
  }

  private buildMenu(sections: readonly SectionSpec[]): void {
    const list = this.menu.querySelector('.index__list')!;
    sections.forEach((spec, position) => {
      const item = document.createElement('li');
      item.className = 'index__item';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'index__link';
      link.style.setProperty('--i', String(position));
      link.dataset.cursor = 'Go';
      link.innerHTML = `<small>${spec.index}</small><span>${spec.title}</span>`;
      link.addEventListener('click', () => {
        this.closeMenu();
        this.sectionRequested.emit(spec.id);
      });
      item.append(link);
      list.append(item);
      this.links.set(spec.id, link);
    });
  }

  private toggleMenu(): void {
    if (this.menu.classList.contains('is-open')) this.closeMenu();
    else this.openMenu();
  }

  private openMenu(): void {
    this.menu.hidden = false;
    requestAnimationFrame(() => this.menu.classList.add('is-open'));
    this.menuButton.setAttribute('aria-expanded', 'true');
    this.menuButton.textContent = 'Close';
  }

  private closeMenu(): void {
    this.menu.classList.remove('is-open');
    this.menuButton.setAttribute('aria-expanded', 'false');
    this.menuButton.textContent = 'Index';
  }
}
