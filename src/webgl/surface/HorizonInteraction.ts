import type { SoundScape } from '@/audio/SoundScape';
import type { PointerState } from '@/core/Pointer';
import type { ViewportSize } from '@/core/Viewport';
import type { HorizonLine } from './HorizonLine';

export class HorizonInteraction {
  constructor(
    private readonly line: HorizonLine,
    private readonly sound: SoundScape,
  ) {}

  update(delta: number, pointer: PointerState, size: ViewportSize, enabled: boolean): void {
    const lineY = size.height * 0.5;
    const crossed = this.line.update(delta, {
      x: pointer.x / size.width,
      offset: lineY - pointer.y,
      active: enabled && pointer.isActive,
    });
    if (!crossed) return;
    this.line.addRipple(pointer.x, lineY, Math.min(1, 0.4 + Math.abs(pointer.velocityY) / 1600));
    this.sound.cue('drip', { gain: 0.8, pan: (pointer.x / size.width) * 2 - 1 });
  }
}
