import type { Context } from '@/app/Context';
import { CONTACT } from '@/content/archive';
import { damp, smoothstep } from '@/core/math';
import type { SectionId } from '@/story/sections';
import { ArchiveView } from '@/webgl/archive/ArchiveView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import type { OceanChapter } from '../ocean/OceanChapter';
import { renderArchive } from './archiveMarkup';
import { DissolvePainter } from './specimens/dissolve';
import { FracturePainter } from './specimens/fracture';
import { LensPainter } from './specimens/lens';
import { ParticlesPainter } from './specimens/particles';
import { CanvasSpecimen, type Specimen, type SpecimenPainter } from './specimens/Specimen';
import { SwellPainter } from './specimens/swell';
import { TypeSpecimen } from './specimens/type';
import './archive.css';

const PAINTERS: Record<string, () => SpecimenPainter> = {
  swell: () => new SwellPainter(),
  dissolve: () => new DissolvePainter(),
  lens: () => new LensPainter(),
  fracture: () => new FracturePainter(),
  particles: () => new ParticlesPainter(),
};
const DEPTH_START = 180;
const DEPTH_SPAN = 240;

export class ArchiveChapter implements Chapter {
  readonly id = 'archive' as const;
  readonly view: ArchiveView;
  private readonly root: HTMLElement;
  private readonly specimens: Specimen[] = [];
  private readonly veil = document.createElement('div');
  private focusedBook = -1;
  private parallaxX = 0;
  private parallaxY = 0;
  private layoutFrame = 0;

  constructor(
    private readonly context: Context,
    private readonly ocean: OceanChapter,
  ) {
    this.view = new ArchiveView(context.quality);
    this.root = context.story.find('archive').element;
    renderArchive(this.root);
    this.veil.className = 'archive-veil';
    this.veil.setAttribute('aria-hidden', 'true');
    document.body.append(this.veil);
    this.observeReveals();
    this.bindInteractions();
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
    new ResizeObserver(this.scheduleLayout).observe(this.root);
  }

  async prepare(): Promise<void> {
    await document.fonts.ready;
    this.root.querySelectorAll<HTMLElement>('[data-specimen]').forEach((stage) => {
      const id = stage.dataset.specimen!;
      this.specimens.push(
        id === 'magnify' ? new TypeSpecimen(stage) : new CanvasSpecimen(stage, PAINTERS[id]!()),
      );
    });
    await this.context.renderer.compile(this.view);
  }

  enter(): void {
    if (!this.view.hasBooks) this.view.adoptBooks(this.ocean.bookMeshes);
    this.veil.classList.add('is-visible');
  }

  leave(): void {
    this.focusedBook = -1;
    this.veil.classList.remove('is-visible');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    if (!this.view.hasBooks && this.ocean.bookMeshes.length) this.view.adoptBooks(this.ocean.bookMeshes);
    this.parallaxX = damp(this.parallaxX, frame.parallaxX, 2, frame.delta);
    this.parallaxY = damp(this.parallaxY, frame.parallaxY, 2, frame.delta);
    this.specimens.forEach((specimen) => specimen.update(frame.time, frame.delta));
    this.view.update({
      time: frame.time,
      delta: frame.delta,
      depth: progress * this.view.depthSpan,
      pixelRatio: this.context.renderer.pixelRatio,
      focus: this.focusedBook,
      parallaxX: this.parallaxX,
      parallaxY: this.parallaxY,
    });
    this.context.sound.mix({
      air: 0,
      waves: 0,
      underwater: 1,
      depth: 0.55,
      pad: 0.45,
      shimmer: 0.2,
      tension: 0,
      room: 0,
      pulse: 0,
      motion: 0,
      silence: 0,
    });
    output.post.toneMapping = 1;
    output.post.exposure = 1.2;
    output.post.contrast = 1.1;
    output.post.vignette = 0.42;
    output.post.grain = 0.06;
    output.post.fade = 1 - smoothstep(0, 0.02, progress);
    output.post.fadeTone = 0;
    output.theme = 'dark';
    output.meter = { label: 'Depth', value: `${Math.round(DEPTH_START + progress * DEPTH_SPAN)} m` };
  }

  private observeReveals(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    this.root.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  }

  private bindInteractions(): void {
    this.root.addEventListener('pointerover', (event) => {
      const row = (event.target as Element).closest<HTMLElement>('[data-book]');
      this.focusedBook = row ? Number(row.dataset.book) : -1;
    });
    this.root.addEventListener('pointerleave', () => (this.focusedBook = -1));
    this.root.addEventListener('click', (event) => {
      const target = event.target as Element;
      const jump = target.closest<HTMLElement>('[data-jump]');
      if (jump) this.context.story.goTo(jump.dataset.jump as SectionId, 0.08);
      const copy = target.closest<HTMLButtonElement>('[data-copy]');
      if (copy) void this.copyEmail(copy);
    });
  }

  private async copyEmail(button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      button.textContent = CONTACT.copied;
      this.context.sound.cue('tick');
    } catch {
      window.location.href = `mailto:${CONTACT.email}`;
      return;
    }
    window.setTimeout(() => (button.textContent = CONTACT.copy), 2200);
  }

  private readonly scheduleLayout = (): void => {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => this.context.story.layout());
  };
}
