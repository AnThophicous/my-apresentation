import type { BookEntry } from '@/content/books';
import { formatIndex } from '@/core/math';
import { MOTIFS } from './motifs';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasLayout {
  front: Rect;
  back: Rect;
  spine: Rect;
  pagesAlong: Rect;
  pagesAcross: Rect;
  edge: Rect;
}

export interface Palette {
  paper: string;
  ink: string;
  muted: string;
}

const FONT = '"Impostor Pro", sans-serif';
const COVER_MAX_HEIGHT = 0.68;
const COVER_MAX_WIDTH = 0.48;

export function paletteFor(book: BookEntry): Palette {
  return book.tone === 'dark'
    ? { paper: '#101010', ink: '#efeeea', muted: '#8d8c88' }
    : { paper: '#ecebe6', ink: '#0e0e0e', muted: '#77766f' };
}

export function layoutAtlas(ratio: number): AtlasLayout {
  const width = Math.min(COVER_MAX_WIDTH, COVER_MAX_HEIGHT * ratio);
  const height = width / ratio;
  return {
    front: { x: 0, y: 0, width, height },
    back: { x: 0.5, y: 0, width, height },
    spine: { x: 0, y: 0.71, width: 0.7, height: 0.07 },
    pagesAlong: { x: 0, y: 0.8, width: 0.7, height: 0.07 },
    pagesAcross: { x: 0, y: 0.89, width: 0.7, height: 0.07 },
    edge: { x: 0.76, y: 0.74, width: 0.2, height: 0.2 },
  };
}

export function paintAtlas(book: BookEntry, index: number, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const palette = paletteFor(book);
  const layout = layoutAtlas(book.ratio);
  const px = (rect: Rect): Rect => ({
    x: rect.x * size,
    y: rect.y * size,
    width: rect.width * size,
    height: rect.height * size,
  });
  paintFront(ctx, px(layout.front), book, index, palette);
  paintBack(ctx, px(layout.back), book, palette);
  paintSpine(ctx, px(layout.spine), book, palette);
  paintPages(ctx, px(layout.pagesAlong), 'vertical');
  paintPages(ctx, px(layout.pagesAcross), 'horizontal');
  ctx.fillStyle = palette.paper;
  const edge = px(layout.edge);
  ctx.fillRect(edge.x, edge.y, edge.width, edge.height);
  return canvas;
}

export function paintCoverImage(book: BookEntry, index: number, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width / book.ratio);
  paintFront(
    canvas.getContext('2d')!,
    { x: 0, y: 0, width, height: canvas.height },
    book,
    index,
    paletteFor(book),
  );
  return canvas;
}

function paintFront(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  book: BookEntry,
  index: number,
  palette: Palette,
): void {
  const { x, y, width, height } = rect;
  const margin = width * 0.075;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  addPaperGrain(ctx, rect, book.tone === 'dark' ? 0.035 : 0.05);

  ctx.fillStyle = palette.ink;
  ctx.textBaseline = 'top';
  ctx.font = `500 ${width * 0.045}px ${FONT}`;
  ctx.fillText(formatIndex(index + 1), x + margin, y + margin);
  caption(
    ctx,
    book.subject.toUpperCase(),
    x + width - margin,
    y + margin + width * 0.008,
    width * 0.026,
    palette.muted,
    'right',
  );

  const motifSize = width - margin * 2.6;
  const motifTop = y + margin * 2.2;
  MOTIFS[book.motif](ctx, {
    x: x + margin * 1.3,
    y: motifTop,
    size: motifSize,
    ink: palette.ink,
    paper: palette.paper,
  });

  const ruleY = y + height * 0.7;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(x + margin, ruleY, width - margin * 2, Math.max(1, width * 0.0025));

  const titleSize = width * (book.title.length > 22 ? 0.07 : 0.085);
  ctx.font = `500 ${titleSize}px ${FONT}`;
  const lines = wrap(ctx, book.title, width - margin * 2);
  lines.forEach((line, lineIndex) => {
    ctx.fillText(line, x + margin, ruleY + margin * 0.55 + lineIndex * titleSize * 1.02);
  });
  ctx.font = `400 ${width * 0.04}px ${FONT}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText(book.author, x + margin, y + height - margin - width * 0.04);
}

function paintBack(ctx: CanvasRenderingContext2D, rect: Rect, book: BookEntry, palette: Palette): void {
  const { x, y, width, height } = rect;
  const margin = width * 0.085;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  addPaperGrain(ctx, rect, book.tone === 'dark' ? 0.035 : 0.05);
  ctx.textBaseline = 'top';
  caption(ctx, 'WHAT IT TAUGHT ME', x + margin, y + margin, width * 0.026, palette.muted, 'left');
  const bodySize = width * 0.068;
  ctx.font = `400 ${bodySize}px ${FONT}`;
  ctx.fillStyle = palette.ink;
  wrap(ctx, book.takeaway, width - margin * 2).forEach((line, lineIndex) => {
    ctx.fillText(line, x + margin, y + margin * 2.4 + lineIndex * bodySize * 1.18);
  });
  ctx.font = `500 ${width * 0.034}px ${FONT}`;
  ctx.fillText(book.title, x + margin, y + height - margin - width * 0.09);
  caption(
    ctx,
    `${book.author.toUpperCase()}  /  READ IN ${book.readIn}`,
    x + margin,
    y + height - margin - width * 0.035,
    width * 0.022,
    palette.muted,
    'left',
  );
}

function paintSpine(ctx: CanvasRenderingContext2D, rect: Rect, book: BookEntry, palette: Palette): void {
  const { x, y, width, height } = rect;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = palette.ink;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${height * 0.42}px ${FONT}`;
  ctx.fillText(book.title, x + width * 0.08, y + height * 0.52);
  ctx.font = `400 ${height * 0.3}px ${FONT}`;
  ctx.fillStyle = palette.muted;
  const author = book.author.split(' ').slice(-1)[0] ?? book.author;
  const authorWidth = ctx.measureText(author).width;
  ctx.fillText(author, x + width * 0.94 - authorWidth, y + height * 0.52);
}

function paintPages(ctx: CanvasRenderingContext2D, rect: Rect, direction: 'vertical' | 'horizontal'): void {
  const { x, y, width, height } = rect;
  ctx.fillStyle = '#e4e1d8';
  ctx.fillRect(x, y, width, height);
  const lines = 90;
  for (let i = 0; i < lines; i += 1) {
    const t = i / lines;
    ctx.fillStyle = `rgba(0,0,0,${0.05 + ((i * 37) % 7) * 0.012})`;
    if (direction === 'vertical') ctx.fillRect(x + t * width, y, Math.max(1, width / lines / 3), height);
    else ctx.fillRect(x, y + t * height, width, Math.max(1, height / lines / 3));
  }
}

function caption(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign,
): void {
  ctx.save();
  ctx.font = `500 ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.letterSpacing = `${size * 0.18}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function addPaperGrain(ctx: CanvasRenderingContext2D, rect: Rect, strength: number): void {
  const count = Math.round((rect.width * rect.height) / 900);
  for (let i = 0; i < count; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${strength * Math.random()})`;
    ctx.fillRect(rect.x + Math.random() * rect.width, rect.y + Math.random() * rect.height, 2, 2);
  }
}
