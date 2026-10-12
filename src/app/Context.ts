import type { SoundScape } from '@/audio/SoundScape';
import type { Pointer } from '@/core/Pointer';
import type { QualityProfile } from '@/core/Quality';
import type { Scroll } from '@/core/Scroll';
import type { Ticker } from '@/core/Ticker';
import type { Viewport } from '@/core/Viewport';
import type { Story } from '@/story/Story';
import type { Renderer } from '@/webgl/Renderer';

export interface Context {
  readonly viewport: Viewport;
  readonly pointer: Pointer;
  readonly scroll: Scroll;
  readonly story: Story;
  readonly renderer: Renderer;
  readonly quality: QualityProfile;
  readonly sound: SoundScape;
  readonly ticker: Ticker;
  readonly stage: HTMLElement;
}

export function createLayer(context: Context, name: string): HTMLElement {
  const layer = document.createElement('div');
  layer.className = `layer layer--${name}`;
  context.stage.append(layer);
  return layer;
}
