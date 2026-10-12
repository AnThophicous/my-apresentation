import { clamp, easeInCubic, easeOutCubic, progressBetween } from '@/core/math';

export type BeatVariant = 'display' | 'title' | 'lead' | 'caption';
export type BeatPlacement = 'center' | 'sky' | 'sea' | 'gate' | 'top' | 'bottom';

export interface BeatSpec {
  text: string;
  start: number;
  end: number;
  variant?: BeatVariant;
  place?: BeatPlacement;
  align?: 'center' | 'left' | 'right';
  holdIn?: boolean;
  holdOut?: boolean;
}

interface BeatNode {
  spec: BeatSpec;
  element: HTMLElement;
  words: HTMLElement[];
  visible: boolean;
}

const WORD_STAGGER = 0.14;
const MAX_TRANSITION = 0.07;

export class Beats {
  readonly element: HTMLElement;
  private readonly nodes: BeatNode[];
  private lastProgress = -1;

  constructor(parent: HTMLElement, specs: BeatSpec[], className = '') {
    this.element = document.createElement('div');
    this.element.className = `beats ${className}`.trim();
    this.nodes = specs.map((spec) => this.createNode(spec));
    parent.append(this.element);
  }

  update(progress: number): void {
    if (Math.abs(progress - this.lastProgress) < 0.00001) return;
    this.lastProgress = progress;
    for (const node of this.nodes) this.updateNode(node, progress);
  }

  private updateNode(node: BeatNode, progress: number): void {
    const { start, end, holdIn, holdOut } = node.spec;
    const transition = Math.min(MAX_TRANSITION, (end - start) * 0.35);
    const visible = (holdIn || progress >= start) && (holdOut || progress <= end);
    if (visible !== node.visible) {
      node.visible = visible;
      node.element.hidden = !visible;
    }
    if (!visible) return;
    const enter = holdIn ? 1 : progressBetween(start, start + transition, progress);
    const exit = holdOut ? 0 : progressBetween(end - transition, end, progress);
    const count = node.words.length;
    const spread = 1 + WORD_STAGGER * (count - 1);
    node.words.forEach((word, index) => {
      const wordEnter = easeOutCubic(clamp(enter * spread - WORD_STAGGER * index));
      const wordExit = easeInCubic(clamp(exit * spread - WORD_STAGGER * index));
      const offset = (1 - wordEnter) * 110 - wordExit * 110;
      word.style.transform = `translate3d(0, ${offset.toFixed(2)}%, 0)`;
    });
  }

  private createNode(spec: BeatSpec): BeatNode {
    const element = document.createElement('p');
    element.className = `beat beat--${spec.variant ?? 'title'}`;
    element.dataset.place = spec.place ?? 'center';
    element.dataset.align = spec.align ?? 'center';
    element.hidden = true;
    const words: HTMLElement[] = [];
    spec.text.split('\n').forEach((line, lineIndex) => {
      if (lineIndex > 0) element.append(document.createElement('br'));
      line
        .split(' ')
        .filter(Boolean)
        .forEach((text, wordIndex) => {
          if (wordIndex > 0) element.append(' ');
          const word = document.createElement('span');
          word.className = 'word';
          const inner = document.createElement('span');
          inner.className = 'word__inner';
          inner.textContent = text;
          word.append(inner);
          element.append(word);
          words.push(inner);
        });
    });
    this.element.append(element);
    return { spec, element, words, visible: false };
  }
}
