import { Emitter } from '@/core/Emitter';
import { clamp } from '@/core/math';
import type { Scroll } from '@/core/Scroll';
import type { Viewport } from '@/core/Viewport';
import { SECTIONS, type GateId, type SectionId, type SectionSpec } from './sections';

export interface SectionLayout {
  spec: SectionSpec;
  element: HTMLElement;
  top: number;
  height: number;
}

export interface StoryState {
  section: SectionLayout;
  progress: number;
  overall: number;
}

export class Story {
  readonly gateOpened = new Emitter<GateId>();
  readonly sectionChanged = new Emitter<SectionLayout>();
  readonly layouts: SectionLayout[];
  private readonly openGates = new Set<GateId>();
  private activeId: SectionId | null = null;
  private state: StoryState;

  constructor(
    container: HTMLElement,
    private readonly viewport: Viewport,
    private readonly scroll: Scroll,
  ) {
    this.layouts = SECTIONS.map((spec) => ({
      spec,
      element: this.resolveElement(container, spec),
      top: 0,
      height: 0,
    }));
    this.layout();
    this.state = { section: this.layouts[0]!, progress: 0, overall: 0 };
    viewport.resized.on(() => this.layout());
  }

  get current(): StoryState {
    return this.state;
  }

  isOpen(gate: GateId): boolean {
    return this.openGates.has(gate);
  }

  open(gate: GateId): void {
    if (this.openGates.has(gate)) return;
    this.openGates.add(gate);
    this.layout();
    this.gateOpened.emit(gate);
  }

  openGatesBefore(id: SectionId): void {
    const targetIndex = this.indexOf(id);
    this.layouts.slice(0, targetIndex).forEach(({ spec }) => spec.gate && this.open(spec.gate.id));
  }

  find(id: SectionId): SectionLayout {
    return this.layouts[this.indexOf(id)]!;
  }

  positionOf(id: SectionId, progress = 0): number {
    const section = this.find(id);
    return section.top + section.height * clamp(progress);
  }

  goTo(id: SectionId, progress = 0, immediate = false): void {
    this.openGatesBefore(id);
    this.scroll.to(this.positionOf(id, progress), { duration: immediate ? 0 : 2.4, immediate });
  }

  layout(): void {
    const vh = this.viewport.size.height;
    const last = this.layouts[this.layouts.length - 1];
    let cursor = 0;
    let gated = false;
    for (const section of this.layouts) {
      const { spec, element } = section;
      element.hidden = gated;
      if (gated) continue;
      section.top = cursor;
      if (spec.kind === 'pinned') {
        section.height = spec.length * vh;
        const closedGate = spec.gate && !this.openGates.has(spec.gate.id) ? spec.gate : null;
        const runway = closedGate ? section.height * closedGate.at : section.height;
        element.style.height = `${runway + (closedGate || section === last ? vh : 0)}px`;
        gated = closedGate !== null;
      } else {
        section.height = element.offsetHeight;
      }
      cursor += section.height;
    }
    document.body.classList.toggle('is-gated', gated);
    this.scroll.refresh();
  }

  update(): StoryState {
    const y = this.scroll.y;
    const section = this.locate(y);
    const progress = section.height > 0 ? clamp((y - section.top) / section.height) : 0;
    const last = this.layouts[this.layouts.length - 1]!;
    const total = last.top + last.height;
    this.state = { section, progress, overall: total > 0 ? clamp(y / total) : 0 };
    if (section.spec.id !== this.activeId) {
      this.activeId = section.spec.id;
      this.sectionChanged.emit(section);
    }
    return this.state;
  }

  private locate(y: number): SectionLayout {
    const visible = this.layouts.filter((section) => !section.element.hidden);
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      if (y >= visible[i]!.top) return visible[i]!;
    }
    return visible[0]!;
  }

  private indexOf(id: SectionId): number {
    return this.layouts.findIndex((section) => section.spec.id === id);
  }

  private resolveElement(container: HTMLElement, spec: SectionSpec): HTMLElement {
    const element = container.querySelector<HTMLElement>(`[data-section="${spec.id}"]`);
    if (!element) throw new Error(`Missing section element for "${spec.id}"`);
    return element;
  }
}
