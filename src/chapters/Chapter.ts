import type { PointerState } from '@/core/Pointer';
import type { ViewportSize } from '@/core/Viewport';
import type { SectionId } from '@/story/sections';
import type { MeterReading } from '@/ui/Hud';
import type { PostSettings } from '@/webgl/post/FinalPass';
import type { View } from '@/webgl/View';

export interface Frame {
  time: number;
  delta: number;
  pointer: PointerState;
  parallaxX: number;
  parallaxY: number;
  scrollVelocity: number;
  size: ViewportSize;
}

export interface ChapterOutput {
  post: PostSettings;
  meter: MeterReading;
  cursor: string | null;
  theme: 'light' | 'dark';
}

export interface Chapter {
  readonly id: SectionId;
  readonly view: View | null;
  prepare(): Promise<void>;
  enter(): void;
  leave(): void;
  update(progress: number, frame: Frame, output: ChapterOutput): void;
}
