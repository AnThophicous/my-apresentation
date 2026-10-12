import { Emitter } from '@/core/Emitter';
import { SILENT_MIX, type Cue, type CueOptions, type MixParams, type SoundScape } from './SoundScape';
import { SoundEngine } from './SoundEngine';

export class AudioDirector implements SoundScape {
  readonly changed = new Emitter<boolean>();
  private engine: SoundEngine | null = null;
  private readonly target: MixParams = { ...SILENT_MIX };
  private on = false;

  get enabled(): boolean {
    return this.on;
  }

  async setEnabled(on: boolean): Promise<void> {
    if (on === this.on) return;
    if (on) {
      this.engine ??= new SoundEngine();
      await this.engine.resume();
      this.engine.setMaster(1);
      this.engine.mix(this.target);
    } else {
      this.engine?.setMaster(0);
    }
    this.on = on;
    this.changed.emit(on);
  }

  mix(params: Partial<MixParams>): void {
    Object.assign(this.target, params);
    if (this.on) this.engine?.mix(this.target);
  }

  cue(name: Cue, options?: CueOptions): void {
    if (this.on) this.engine?.cue(name, options);
  }
}
