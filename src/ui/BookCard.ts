import type { BookEntry } from '@/content/books';
import { Emitter } from '@/core/Emitter';
import { formatIndex } from '@/core/math';
import { paintCoverImage } from '@/webgl/books/coverArt';
import './book-card.css';

const GHOST_CLICK_WINDOW = 400;

export class BookCard {
  readonly closed = new Emitter<void>();
  private readonly root: HTMLElement;
  private readonly cover: HTMLImageElement;
  private readonly index: HTMLElement;
  private readonly title: HTMLElement;
  private readonly author: HTMLElement;
  private readonly takeaway: HTMLElement;
  private readonly meta: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly covers = new Map<string, string>();
  private returnFocus: HTMLElement | null = null;
  private openedAt = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'book-card';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'book-card-title');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="book-card__backdrop" data-close></div>
      <article class="book-card__panel">
        <figure class="book-card__cover"><img alt="" /></figure>
        <div class="book-card__body">
          <span class="book-card__index caption"></span>
          <h2 class="book-card__title" id="book-card-title"></h2>
          <p class="book-card__author"></p>
          <blockquote class="book-card__takeaway"></blockquote>
          <p class="book-card__meta caption"></p>
        </div>
        <button class="book-card__close pill" type="button" data-close data-cursor="Close">Close</button>
      </article>`;
    this.cover = this.root.querySelector('img')!;
    this.index = this.root.querySelector('.book-card__index')!;
    this.title = this.root.querySelector('.book-card__title')!;
    this.author = this.root.querySelector('.book-card__author')!;
    this.takeaway = this.root.querySelector('.book-card__takeaway')!;
    this.meta = this.root.querySelector('.book-card__meta')!;
    this.closeButton = this.root.querySelector('.book-card__close')!;
    this.root.addEventListener('click', (event) => {
      if (performance.now() - this.openedAt < GHOST_CLICK_WINDOW) return;
      if ((event.target as HTMLElement).closest('[data-close]')) this.close();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) this.close();
    });
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(entry: BookEntry, position: number): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.cover.src = this.coverFor(entry, position);
    this.cover.alt = `Cover of ${entry.title}, redesigned`;
    this.index.textContent = `${formatIndex(position + 1)} / Library`;
    this.title.textContent = entry.title;
    this.author.textContent = entry.author;
    this.takeaway.textContent = entry.takeaway;
    this.meta.textContent = `${entry.subject} / Read in ${entry.readIn}`;
    this.openedAt = performance.now();
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('is-open'));
    this.closeButton.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    window.setTimeout(() => {
      this.root.hidden = true;
      this.returnFocus?.focus({ preventScroll: true });
    }, 500);
    this.closed.emit();
  }

  private coverFor(entry: BookEntry, position: number): string {
    const cached = this.covers.get(entry.slug);
    if (cached) return cached;
    const url = paintCoverImage(entry, position, 900).toDataURL('image/webp', 0.92);
    this.covers.set(entry.slug, url);
    return url;
  }
}
