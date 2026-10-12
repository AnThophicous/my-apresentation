import { clamp, damp, easeInCubic, easeOutCubic, seededRandom, smoothstep } from '@/core/math';

export type MagnifySize = 'hero' | 'lead';

export interface MagnifyRowSpec {
  text: string;
  size: MagnifySize;
}

export interface MagnifyFocus {
  x: number;
  y: number;
  strength: number;
}

export interface Caret {
  x: number;
  y: number;
  height: number;
}

interface Glyph {
  element: HTMLSpanElement;
  index: number;
  width: number;
  left: number;
  magnify: number;
  reveal: number;
  drop: number;
  pull: number;
  spin: number;
  drift: number;
  scaleX: number;
  offset: number;
  centerX: number;
  rendered: string;
}

interface Row {
  element: HTMLElement;
  text: Text;
  spec: MagnifyRowSpec;
  glyphs: Glyph[];
  left: number;
  top: number;
  height: number;
  fontSize: number;
  visible: boolean;
}

const GROWTH: Record<MagnifySize, { x: number; y: number }> = {
  hero: { x: 0.62, y: 0.3 },
  lead: { x: 0.95, y: 0.42 },
};
const RISE_STAGGER = 0.045;
const DROP_STAGGER = 0.5;

export class MagnifyText {
  readonly element: HTMLElement;
  private readonly rows: Row[];
  private readonly range = document.createRange();
  private pullX = 0;
  private pullY = 0;
  private viewportHeight = 1;

  constructor(parent: HTMLElement, specs: readonly MagnifyRowSpec[], className = '') {
    this.element = document.createElement('div');
    this.element.className = `magnify ${className}`.trim();
    this.rows = specs.map((spec, index) => this.createRow(spec, index));
    parent.append(this.element);
  }

  get rowCount(): number {
    return this.rows.length;
  }

  measure(viewportHeight: number, maxWidth: number): void {
    this.viewportHeight = viewportHeight;
    for (const row of this.rows) {
      row.element.style.fontSize = '';
      const natural = row.text.parentElement!.getBoundingClientRect().width;
      const fontSize = parseFloat(getComputedStyle(row.element).fontSize);
      row.fontSize = natural > maxWidth ? (fontSize * maxWidth) / natural : fontSize;
      row.element.style.fontSize = `${row.fontSize}px`;
    }
    for (const row of this.rows) this.measureRow(row);
  }

  reveal(rowIndex: number, amount: number, mode: 'type' | 'rise', alreadyTyped = 0): void {
    const row = this.rows[rowIndex]!;
    const count = row.glyphs.length;
    row.glyphs.forEach((glyph, index) => {
      if (mode === 'type') {
        glyph.reveal = index < alreadyTyped || index < Math.floor(amount * count + 0.0001) ? 1 : 0;
        return;
      }
      const spread = 1 + RISE_STAGGER * (count - 1);
      glyph.reveal = clamp(amount * spread - RISE_STAGGER * index);
    });
  }

  drop(rowIndex: number, amount: number): void {
    const row = this.rows[rowIndex]!;
    for (const glyph of row.glyphs)
      glyph.drop = clamp(amount * (1 + DROP_STAGGER) - glyph.drift * DROP_STAGGER);
  }

  pull(amount: number, x: number, y: number, reach: number): void {
    this.pullX = x;
    this.pullY = y;
    for (const row of this.rows) {
      const centerY = row.top + row.height / 2;
      for (const glyph of row.glyphs) {
        const distance = Math.hypot(row.left + glyph.centerX - x, centerY - y) / reach;
        glyph.pull = clamp(amount * 1.6 - distance * 0.6);
      }
    }
  }

  caret(rowIndex: number, count: number): Caret {
    const row = this.rows[rowIndex]!;
    const glyph = row.glyphs[Math.max(0, count - 1)];
    const right = glyph && count > 0 ? glyph.centerX + glyph.offset + (glyph.width * glyph.scaleX) / 2 : 0;
    return { x: row.left + right, y: row.top + row.height * 0.5, height: row.fontSize * 0.82 };
  }

  update(delta: number, focus: MagnifyFocus): number {
    let focused = -1;
    let strongest = 0.35;
    let glyphIndex = 0;
    for (const row of this.rows) {
      const shown = row.glyphs.some((glyph) => glyph.reveal > 0 && glyph.pull < 1 && glyph.drop < 1);
      if (shown !== row.visible) {
        row.visible = shown;
        row.element.style.visibility = shown ? '' : 'hidden';
      }
      if (!shown) {
        glyphIndex += row.glyphs.length;
        continue;
      }
      const target = this.applyMagnify(row, delta, focus);
      if (target.value > strongest) {
        strongest = target.value;
        focused = glyphIndex + target.index;
      }
      this.layoutRow(row);
      glyphIndex += row.glyphs.length;
    }
    return focused;
  }

  private applyMagnify(row: Row, delta: number, focus: MagnifyFocus): { value: number; index: number } {
    const radius = clamp(row.fontSize * 1.45, 64, 240);
    const centerY = row.top + row.height / 2;
    const growth = GROWTH[row.spec.size];
    let best = { value: 0, index: -1 };
    for (const glyph of row.glyphs) {
      const dx = focus.x - (row.left + glyph.centerX + glyph.offset);
      const dy = (focus.y - centerY) * 1.25;
      const presence = glyph.reveal * (1 - glyph.drop) * (1 - glyph.pull);
      const target = Math.exp(-(dx * dx + dy * dy) / (radius * radius)) * focus.strength * presence;
      glyph.magnify = damp(glyph.magnify, target, target > glyph.magnify ? 11 : 5, delta);
      glyph.scaleX = 1 + growth.x * glyph.magnify;
      if (target > best.value) best = { value: target, index: glyph.index };
    }
    return best;
  }

  private layoutRow(row: Row): void {
    const growth = GROWTH[row.spec.size];
    let extra = 0;
    for (const glyph of row.glyphs) extra += glyph.width * (glyph.scaleX - 1);
    let cursor = -extra / 2;
    const centerY = row.top + row.height / 2;
    for (const glyph of row.glyphs) {
      const grown = glyph.width * (glyph.scaleX - 1);
      glyph.offset = cursor + grown / 2;
      cursor += grown;
      const scaleY = 1 + growth.y * glyph.magnify;
      this.render(row, glyph, centerY, scaleY);
    }
  }

  private render(row: Row, glyph: Glyph, centerY: number, scaleY: number): void {
    const rise = easeOutCubic(glyph.reveal);
    let x = glyph.offset;
    let y = (1 - rise) * row.fontSize * 0.5;
    let rotation = (1 - rise) * 7 * glyph.spin;
    let scale = 1;
    let opacity = rise;
    if (glyph.drop > 0) {
      const fall = easeInCubic(glyph.drop);
      y += fall * this.viewportHeight * 0.75;
      rotation += fall * 70 * glyph.spin;
      opacity *= 1 - smoothstep(0.55, 1, glyph.drop);
    }
    if (glyph.pull > 0) {
      const fall = easeInCubic(glyph.pull);
      const fromX = row.left + glyph.centerX + glyph.offset - this.pullX;
      const fromY = centerY - this.pullY;
      const angle = fall * fall * 2.6;
      const shrink = 1 - fall;
      const toX = (fromX * Math.cos(angle) - fromY * Math.sin(angle)) * shrink;
      const toY = (fromX * Math.sin(angle) + fromY * Math.cos(angle)) * shrink;
      x += toX - fromX;
      y += toY - fromY;
      rotation += angle * 57.3;
      scale *= Math.pow(shrink, 0.7);
      opacity *= 1 - smoothstep(0.8, 1, glyph.pull);
    }
    const transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) scale(${(glyph.scaleX * scale).toFixed(4)},${(scaleY * scale).toFixed(4)})`;
    const state = `${transform}|${opacity.toFixed(3)}`;
    if (state === glyph.rendered) return;
    glyph.rendered = state;
    glyph.element.style.transform = transform;
    glyph.element.style.opacity = opacity.toFixed(3);
  }

  private measureRow(row: Row): void {
    const rowRect = row.element.getBoundingClientRect();
    row.left = rowRect.left;
    row.top = rowRect.top;
    row.height = rowRect.height;
    for (const glyph of row.glyphs) {
      this.range.setStart(row.text, glyph.index);
      this.range.setEnd(row.text, glyph.index + 1);
      const rect = this.range.getBoundingClientRect();
      glyph.left = rect.left - rowRect.left;
      glyph.width = rect.width;
      glyph.centerX = glyph.left + glyph.width / 2;
      glyph.element.style.left = `${glyph.left.toFixed(2)}px`;
      glyph.rendered = '';
    }
  }

  private createRow(spec: MagnifyRowSpec, rowIndex: number): Row {
    const element = document.createElement('p');
    element.className = 'magnify__row';
    element.dataset.size = spec.size;
    const measure = document.createElement('span');
    measure.className = 'magnify__text';
    const text = document.createTextNode(spec.text);
    measure.append(text);
    const layer = document.createElement('span');
    layer.className = 'magnify__glyphs';
    layer.setAttribute('aria-hidden', 'true');
    const random = seededRandom(rowIndex * 97 + 13);
    const glyphs = [...spec.text].map((character, index) => {
      const glyphElement = document.createElement('span');
      glyphElement.className = 'magnify__glyph';
      glyphElement.textContent = character;
      layer.append(glyphElement);
      return {
        element: glyphElement,
        index,
        width: 0,
        left: 0,
        magnify: 0,
        reveal: 0,
        drop: 0,
        pull: 0,
        spin: random() * 2 - 1,
        drift: random(),
        scaleX: 1,
        offset: 0,
        centerX: 0,
        rendered: '',
      };
    });
    element.append(measure, layer);
    this.element.append(element);
    return { element, text, spec, glyphs, left: 0, top: 0, height: 0, fontSize: 16, visible: true };
  }
}
