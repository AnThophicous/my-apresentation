export interface MixParams {
  air: number;
  waves: number;
  underwater: number;
  depth: number;
  pad: number;
  tension: number;
  shimmer: number;
  pulse: number;
  motion: number;
  room: number;
  silence: number;
}

export type Cue =
  | 'tick'
  | 'drip'
  | 'hover'
  | 'press'
  | 'splash'
  | 'bubbles'
  | 'page'
  | 'step'
  | 'keys'
  | 'boot'
  | 'swell'
  | 'note'
  | 'shatter'
  | 'freeze'
  | 'whoosh'
  | 'heartbeat'
  | 'resolve';

export interface CueOptions {
  pitch?: number;
  gain?: number;
  pan?: number;
}

export interface SoundScape {
  readonly enabled: boolean;
  setEnabled(on: boolean): Promise<void>;
  mix(params: Partial<MixParams>): void;
  cue(name: Cue, options?: CueOptions): void;
}

export const SILENT_MIX: Readonly<MixParams> = {
  air: 0,
  waves: 0,
  underwater: 0,
  depth: 0,
  pad: 0,
  tension: 0,
  shimmer: 0,
  pulse: 0,
  motion: 0,
  room: 0,
  silence: 0,
};
