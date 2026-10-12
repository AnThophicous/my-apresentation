import type { NoiseColor } from './buffers';
import { midiToFrequency } from './music';
import type { Cue, CueOptions } from './SoundScape';

export interface CueContext {
  readonly context: AudioContext;
  readonly sfx: GainNode;
  readonly reverbSend: GainNode;
  readonly noise: Record<NoiseColor, AudioBuffer>;
}

interface ToneSpec {
  frequency: number;
  endFrequency?: number;
  type?: OscillatorType;
  start?: number;
  attack?: number;
  decay: number;
  gain: number;
  wet?: number;
}

interface NoiseSpec {
  color?: NoiseColor;
  filter: BiquadFilterType;
  frequency: number;
  endFrequency?: number;
  q?: number;
  start?: number;
  attack?: number;
  decay: number;
  gain: number;
  wet?: number;
}

function output(cue: CueContext, pan: number, wet: number): AudioNode {
  const panner = cue.context.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(cue.sfx);
  if (wet > 0) {
    const send = cue.context.createGain();
    send.gain.value = wet;
    panner.connect(send).connect(cue.reverbSend);
  }
  return panner;
}

function envelope(param: AudioParam, at: number, attack: number, peak: number, decay: number): void {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

function tone(cue: CueContext, spec: ToneSpec, pan = 0): void {
  const ctx = cue.context;
  const at = ctx.currentTime + (spec.start ?? 0);
  const attack = spec.attack ?? 0.005;
  const oscillator = ctx.createOscillator();
  oscillator.type = spec.type ?? 'sine';
  oscillator.frequency.setValueAtTime(spec.frequency, at);
  if (spec.endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(spec.endFrequency, at + attack + spec.decay);
  const amp = ctx.createGain();
  envelope(amp.gain, at, attack, spec.gain, spec.decay);
  oscillator.connect(amp).connect(output(cue, pan, spec.wet ?? 0));
  oscillator.start(at);
  oscillator.stop(at + attack + spec.decay + 0.05);
}

function noise(cue: CueContext, spec: NoiseSpec, pan = 0): void {
  const ctx = cue.context;
  const at = ctx.currentTime + (spec.start ?? 0);
  const attack = spec.attack ?? 0.003;
  const source = ctx.createBufferSource();
  source.buffer = cue.noise[spec.color ?? 'white'];
  const filter = ctx.createBiquadFilter();
  filter.type = spec.filter;
  filter.frequency.setValueAtTime(spec.frequency, at);
  if (spec.endFrequency)
    filter.frequency.exponentialRampToValueAtTime(spec.endFrequency, at + attack + spec.decay);
  filter.Q.value = spec.q ?? 0.8;
  const amp = ctx.createGain();
  envelope(amp.gain, at, attack, spec.gain, spec.decay);
  source
    .connect(filter)
    .connect(amp)
    .connect(output(cue, pan, spec.wet ?? 0));
  source.start(at, Math.random() * 1.5);
  source.stop(at + attack + spec.decay + 0.05);
}

const random = (min: number, max: number): number => min + Math.random() * (max - min);

const CUES: Record<Cue, (cue: CueContext, gain: number, options: CueOptions) => void> = {
  tick: (cue, gain) =>
    noise(cue, { filter: 'bandpass', frequency: 4600, q: 2.2, decay: 0.03, gain: 0.22 * gain }),
  drip: (cue, gain, options) => {
    const frequency = random(900, 1400) * Math.pow(2, (options.pitch ?? 0) / 12);
    tone(
      cue,
      { frequency, endFrequency: frequency * 2.4, attack: 0.002, decay: 0.09, gain: 0.07 * gain, wet: 0.7 },
      options.pan ?? 0,
    );
  },
  hover: (cue, gain) =>
    tone(cue, { frequency: 2300, endFrequency: 1750, decay: 0.05, gain: 0.025 * gain, attack: 0.004 }),
  press: (cue, gain) => {
    tone(cue, { frequency: 190, endFrequency: 55, decay: 0.14, gain: 0.32 * gain });
    noise(cue, { filter: 'bandpass', frequency: 2400, q: 1.4, decay: 0.05, gain: 0.18 * gain });
  },
  splash: (cue, gain) => {
    noise(cue, {
      color: 'white',
      filter: 'lowpass',
      frequency: 7000,
      endFrequency: 260,
      attack: 0.02,
      decay: 1.6,
      gain: 0.55 * gain,
      wet: 0.4,
    });
    noise(cue, {
      color: 'brown',
      filter: 'lowpass',
      frequency: 300,
      attack: 0.05,
      decay: 1.2,
      gain: 0.7 * gain,
    });
    CUES.bubbles(cue, gain * 0.8, {});
  },
  bubbles: (cue, gain) => {
    for (let i = 0; i < 16; i += 1) {
      const frequency = random(380, 980);
      tone(
        cue,
        {
          frequency,
          endFrequency: frequency * random(1.8, 2.6),
          start: 0.15 + Math.pow(Math.random(), 1.6) * 1.8,
          attack: 0.004,
          decay: random(0.05, 0.11),
          gain: random(0.02, 0.06) * gain,
          wet: 0.5,
        },
        random(-0.7, 0.7),
      );
    }
  },
  page: (cue, gain) => {
    noise(cue, { filter: 'bandpass', frequency: 2600, q: 0.7, attack: 0.03, decay: 0.22, gain: 0.16 * gain });
    noise(cue, { filter: 'highpass', frequency: 5200, start: 0.06, decay: 0.12, gain: 0.08 * gain });
  },
  step: (cue, gain, options) => {
    noise(
      cue,
      { color: 'brown', filter: 'lowpass', frequency: 180, decay: 0.16, gain: 0.5 * gain },
      options.pan ?? 0,
    );
    noise(
      cue,
      { filter: 'bandpass', frequency: 1600, q: 1.2, decay: 0.04, gain: 0.05 * gain },
      options.pan ?? 0,
    );
  },
  keys: (cue, gain) => {
    let time = 0;
    for (let i = 0; i < 18; i += 1) {
      time += random(0.06, 0.19);
      noise(
        cue,
        {
          filter: 'bandpass',
          frequency: random(2600, 5200),
          q: 3,
          start: time,
          decay: 0.022,
          gain: 0.12 * gain,
        },
        random(-0.2, 0.2),
      );
    }
  },
  boot: (cue, gain) => {
    [60, 64, 67, 71, 74, 79].forEach((note, index) => {
      tone(cue, {
        frequency: midiToFrequency(note),
        type: index % 2 ? 'triangle' : 'sine',
        start: index * 0.025,
        attack: 0.03,
        decay: 3.6,
        gain: 0.06 * gain,
        wet: 0.8,
      });
    });
  },
  swell: (cue, gain) => {
    noise(cue, {
      filter: 'bandpass',
      frequency: 260,
      endFrequency: 6200,
      q: 1.6,
      attack: 2.6,
      decay: 0.9,
      gain: 0.3 * gain,
      wet: 0.6,
    });
    tone(cue, { frequency: 36, endFrequency: 44, attack: 2.4, decay: 2.4, gain: 0.45 * gain });
  },
  note: (cue, gain, options) => {
    const frequency = midiToFrequency(options.pitch ?? 69);
    tone(cue, { frequency, decay: 2.2, gain: 0.09 * gain, wet: 0.7 }, options.pan ?? 0);
    tone(cue, { frequency: frequency * 2, decay: 0.9, gain: 0.03 * gain, wet: 0.7 }, options.pan ?? 0);
    tone(cue, { frequency: frequency * 3.01, decay: 0.4, gain: 0.012 * gain, wet: 0.7 }, options.pan ?? 0);
  },
  shatter: (cue, gain) => {
    tone(cue, { frequency: 70, endFrequency: 32, decay: 0.5, gain: 0.7 * gain });
    noise(cue, {
      filter: 'lowpass',
      frequency: 2200,
      endFrequency: 400,
      decay: 0.35,
      gain: 0.5 * gain,
      wet: 0.3,
    });
    for (let i = 0; i < 46; i += 1) {
      noise(
        cue,
        {
          filter: 'bandpass',
          frequency: random(2800, 9500),
          q: random(4, 12),
          start: Math.pow(Math.random(), 2.2) * 1.1,
          decay: random(0.015, 0.09),
          gain: random(0.05, 0.22) * gain,
          wet: 0.35,
        },
        random(-0.9, 0.9),
      );
    }
    for (let i = 0; i < 12; i += 1) {
      tone(
        cue,
        {
          frequency: random(2400, 7200),
          start: random(0, 0.8),
          decay: random(0.4, 1.4),
          gain: random(0.006, 0.02) * gain,
          wet: 0.6,
        },
        random(-0.8, 0.8),
      );
    }
  },
  freeze: (cue, gain) => {
    tone(cue, { frequency: 2960, attack: 0.06, decay: 3.2, gain: 0.012 * gain, wet: 0.2 });
    tone(cue, { frequency: 2967, attack: 0.06, decay: 3.2, gain: 0.008 * gain, wet: 0.2 }, 0.4);
  },
  whoosh: (cue, gain) => {
    noise(cue, {
      filter: 'bandpass',
      frequency: 180,
      endFrequency: 3200,
      q: 1.1,
      attack: 0.7,
      decay: 0.6,
      gain: 0.42 * gain,
      wet: 0.4,
    });
    tone(cue, { frequency: 92, endFrequency: 30, attack: 0.3, decay: 1.4, gain: 0.5 * gain });
  },
  heartbeat: (cue, gain) => {
    tone(cue, { frequency: 62, endFrequency: 40, decay: 0.16, gain: 0.55 * gain });
    tone(cue, { frequency: 58, endFrequency: 38, start: 0.24, decay: 0.2, gain: 0.35 * gain });
  },
  resolve: (cue, gain) => {
    [38, 50, 57, 62, 66, 69, 74].forEach((note, index) => {
      tone(cue, {
        frequency: midiToFrequency(note),
        type: 'triangle',
        start: index * 0.06,
        attack: 1.2,
        decay: 6,
        gain: 0.045 * gain,
        wet: 0.9,
      });
    });
  },
};

export function playCue(cue: CueContext, name: Cue, options: CueOptions): void {
  CUES[name](cue, options.gain ?? 1, options);
}
