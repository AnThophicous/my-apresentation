import type { Chapter, ChapterOutput, Frame } from '@/chapters/Chapter';
import type { SectionId } from '@/story/sections';
import type { StoryState } from '@/story/Story';
import type { Cursor } from '@/ui/Cursor';
import type { Hud } from '@/ui/Hud';
import { DEFAULT_POST, type PostSettings } from '@/webgl/post/FinalPass';
import type { Renderer } from '@/webgl/Renderer';

export class Director {
  private active: Chapter | null = null;
  private readonly output: ChapterOutput = {
    post: { ...DEFAULT_POST },
    meter: { label: '', value: '' },
    cursor: null,
    theme: 'light',
  };

  constructor(
    private readonly chapters: ReadonlyMap<SectionId, Chapter>,
    private readonly renderer: Renderer,
    private readonly hud: Hud,
    private readonly cursor: Cursor,
    private readonly reducedMotion: boolean,
  ) {}

  update(state: StoryState, frame: Frame): void {
    const chapter = this.chapters.get(state.section.spec.id);
    if (!chapter) return;
    if (chapter !== this.active) this.switchTo(chapter, state);
    this.resetOutput();
    chapter.update(state.progress, frame, this.output);
    if (this.reducedMotion) this.calm(this.output.post);
    if (chapter.view) this.renderer.render(chapter.view, this.output.post, frame.time, frame.delta);
    this.hud.setMeter(this.output.meter);
    this.hud.setProgress(state.overall);
    this.cursor.setSceneLabel(this.output.cursor);
    document.body.dataset.theme = this.output.theme;
  }

  private switchTo(chapter: Chapter, state: StoryState): void {
    this.active?.leave();
    this.active = chapter;
    chapter.enter();
    this.hud.setSection(state.section.spec);
  }

  private calm(post: PostSettings): void {
    post.zoomBlur *= 0.2;
    post.flash *= 0.3;
    post.grain *= 0.5;
  }

  private resetOutput(): void {
    Object.assign(this.output.post, DEFAULT_POST);
    this.output.cursor = null;
    this.output.theme = 'light';
  }
}
