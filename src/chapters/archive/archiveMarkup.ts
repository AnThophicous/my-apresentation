import { ARCHIVE_INTRO, CONTACT, KOEMI, LAB, LIBRARY, PRINCIPLES, TOOLBOX } from '@/content/archive';
import { BOOKS } from '@/content/books';
import { formatIndex } from '@/core/math';
import { SECTIONS } from '@/story/sections';

const ARROW = '<span class="archive__arrow" aria-hidden="true">↗</span>';

export function renderArchive(root: HTMLElement): void {
  const index = SECTIONS.find((section) => section.id === 'archive')!.index;
  root.innerHTML = [intro(index), koemi(), library(), principles(), lab(), toolbox(), contact()].join('');
}

function heading(caption: string, title: string, id: string): string {
  return `
    <header class="archive__heading" data-reveal>
      <p class="archive__caption caption">${escape(caption)}</p>
      <h3 class="archive__title" id="${id}">${escape(title)}</h3>
    </header>`;
}

function intro(index: string): string {
  return `
    <section class="archive__intro" aria-labelledby="archive-title">
      <p class="archive__caption caption" data-reveal>${index} — ${escape(ARCHIVE_INTRO.caption)}</p>
      <h2 class="archive__display" id="archive-title" data-reveal>${escape(ARCHIVE_INTRO.title)}</h2>
      <p class="archive__lede" data-reveal>${escape(ARCHIVE_INTRO.lede)}</p>
    </section>`;
}

function koemi(): string {
  const rows = KOEMI.models
    .map(
      (model) => `
      <li class="koemi__row${model.featured ? ' is-featured' : ''}" data-reveal>
        <a class="koemi__link" href="${model.url}" target="_blank" rel="noopener" data-cursor="Open">
          <span class="koemi__generation caption">Gen ${model.generation}</span>
          <span class="koemi__name">${escape(model.name)}</span>
          <span class="koemi__description">${escape(model.description)}</span>
          <span class="koemi__stack caption">${escape(model.stack)}</span>
          ${ARROW}
        </a>
      </li>`,
    )
    .join('');
  return `
    <section class="archive__block koemi" aria-labelledby="koemi-title">
      ${heading(KOEMI.caption, KOEMI.title, 'koemi-title')}
      <div class="koemi__intro" data-reveal>
        <p class="archive__lede">${escape(KOEMI.lede)}</p>
        <p class="archive__quote">${escape(KOEMI.question)}</p>
        <a class="archive__pill pill" href="${KOEMI.url}" target="_blank" rel="noopener" data-cursor="Open">${escape(KOEMI.urlLabel)} ${ARROW}</a>
      </div>
      <ol class="koemi__list">${rows}</ol>
    </section>`;
}

function library(): string {
  const rows = BOOKS.map(
    (book, index) => `
      <li class="library__row" data-reveal data-book="${index}">
        <span class="library__number caption">${formatIndex(index + 1)}</span>
        <span class="library__title">${escape(book.title)}</span>
        <span class="library__author caption">${escape(book.author)}</span>
        <span class="library__takeaway">${escape(book.takeaway)}</span>
      </li>`,
  ).join('');
  return `
    <section class="archive__block library" aria-labelledby="library-title">
      ${heading(LIBRARY.caption, LIBRARY.title, 'library-title')}
      <ol class="library__list">${rows}</ol>
      <p class="archive__outro" data-reveal>${escape(LIBRARY.outro)}</p>
    </section>`;
}

function principles(): string {
  const items = PRINCIPLES.items
    .map(
      (item, index) => `
      <li class="principle" data-reveal>
        <span class="principle__number caption">${formatIndex(index + 1)}</span>
        <h4 class="principle__title">${escape(item.title)}</h4>
        <p class="principle__body">${escape(item.body)}</p>
      </li>`,
    )
    .join('');
  return `
    <section class="archive__block principles" aria-labelledby="principles-title">
      ${heading(PRINCIPLES.caption, PRINCIPLES.title, 'principles-title')}
      <ol class="principles__list">${items}</ol>
    </section>`;
}

function lab(): string {
  const cards = LAB.specimens
    .map(
      (specimen) => `
      <li class="specimen" data-reveal>
        <div class="specimen__stage" data-specimen="${specimen.id}" data-cursor="Touch"></div>
        <div class="specimen__text">
          <h4 class="specimen__name">${escape(specimen.name)}</h4>
          <p class="specimen__body">${escape(specimen.body)}</p>
          <button class="specimen__jump caption" type="button" data-jump="${specimen.chapter}" data-cursor="Go">Seen in ${escape(specimen.chapterTitle)} ↑</button>
        </div>
      </li>`,
    )
    .join('');
  return `
    <section class="archive__block lab" aria-labelledby="lab-title">
      ${heading(LAB.caption, LAB.title, 'lab-title')}
      <p class="archive__lede" data-reveal>${escape(LAB.lede)}</p>
      <ul class="lab__grid">${cards}</ul>
    </section>`;
}

function toolbox(): string {
  const groups = TOOLBOX.groups
    .map(
      (group) => `
      <li class="toolbox__group" data-reveal>
        <p class="toolbox__name caption">${escape(group.name)}</p>
        <p class="toolbox__tools">${group.tools.map((tool) => `<span>${escape(tool)}</span>`).join('')}</p>
      </li>`,
    )
    .join('');
  return `
    <section class="archive__block toolbox" aria-labelledby="toolbox-title">
      ${heading(TOOLBOX.caption, TOOLBOX.title, 'toolbox-title')}
      <ul class="toolbox__list">${groups}</ul>
    </section>`;
}

function contact(): string {
  const links = CONTACT.links
    .map(
      (link) =>
        `<li><a class="contact__link" href="${link.url}" target="_blank" rel="noopener" data-cursor="Open">${escape(link.label)} ${ARROW}</a></li>`,
    )
    .join('');
  return `
    <section class="archive__block contact" aria-labelledby="contact-title">
      ${heading(CONTACT.caption, CONTACT.title, 'contact-title')}
      <p class="archive__lede" data-reveal>${escape(CONTACT.lede)}</p>
      <a class="contact__email" href="mailto:${CONTACT.email}" data-reveal data-cursor="Write">${escape(CONTACT.email)}</a>
      <div class="contact__actions" data-reveal>
        <button class="pill contact__copy" type="button" data-copy="${CONTACT.email}" data-cursor="Copy">${escape(CONTACT.copy)}</button>
        <ul class="contact__links">${links}</ul>
      </div>
    </section>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
