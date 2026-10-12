import { createImpulse, createNoiseBuffer, type NoiseColor } from './buffers';
import { playCue, type CueContext } from './cues';
import { CALM_PROGRESSION, TENSE_PROGRESSION, midiToFrequency } from './music';
import type { Cue, CueOptions, MixParams } from './SoundScape';

const MIX_TIME_CONSTANT = 0.5;
const MIX_EPSILON = 0.002;
const CHORD_SECONDS = 9;
const HEARTBEAT_SECONDS = 1.05;
const ARP_STEP = 0.32;
const ARP_LOOKAHEAD = 0.3;
const ARP_PATTERN = [0, 2, 1, 3, 2, 4, 3, 1] as const;
const OPEN_FILTER = 20000;
const MUFFLED_FILTER = 360;

interface PadVoice {
  primary: OscillatorNode;
  secondary: OscillatorNode;
}

export class SoundEngine implements CueContext {
  readonly context: AudioContext;
  readonly sfx: GainNode;
  readonly reverbSend: GainNode;
  readonly noise: Record<NoiseColor, AudioBuffer>;
  private readonly master: GainNode;
  private readonly duck: GainNode;
  private readonly muffle: BiquadFilterNode;
  private readonly musicBus: GainNode;
  private readonly ambienceBus: GainNode;
  private readonly airGain: GainNode;
  private readonly wavesGain: GainNode;
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly droneGain: GainNode;
  private readonly shimmerGain: GainNode;
  private readonly roomGain: GainNode;
  private readonly riserGain: GainNode;
  private readonly riserFilter: BiquadFilterNode;
  private readonly padVoices: PadVoice[] = [];
  private readonly scheduled = new Map<AudioParam, number>();
  private chordIndex = 0;
  private tension = 0;
  private pulse = 0;
  private motion = 0;
  private nextArp = 0;
  private arpIndex = 0;

  constructor() {
    this.context = new AudioContext({ latencyHint: 'playback' });
    const ctx = this.context;
    this.noise = {
      white: createNoiseBuffer(ctx, 'white', 3),
      pink: createNoiseBuffer(ctx, 'pink', 4),
      brown: createNoiseBuffer(ctx, 'brown', 5),
    };
    this.master = this.gain(0);
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.35;
    this.duck = this.gain(1);
    this.duck.connect(this.master).connect(compressor).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = createImpulse(ctx, 5, 2.6);
    this.reverbSend = this.gain(1);
    this.reverbSend.connect(reverb).connect(this.gain(0.6)).connect(this.duck);

    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = OPEN_FILTER;
    this.muffle.Q.value = 0.6;
    this.muffle.connect(this.duck);

    this.musicBus = this.gain(1);
    this.musicBus.connect(this.muffle);
    this.musicBus.connect(this.gain(0.45)).connect(this.reverbSend);
    this.ambienceBus = this.gain(1);
    this.ambienceBus.connect(this.muffle);
    this.sfx = this.gain(1);
    this.sfx.connect(this.duck);

    this.airGain = this.buildAir();
    this.wavesGain = this.buildWaves();
    this.padFilter = ctx.createBiquadFilter();
    this.padGain = this.buildPad();
    this.droneGain = this.buildDrone();
    this.shimmerGain = this.buildShimmer();
    this.roomGain = this.buildRoom();
    this.riserFilter = ctx.createBiquadFilter();
    this.riserGain = this.buildRiser();
    window.setInterval(() => this.advanceChord(), CHORD_SECONDS * 1000);
    window.setInterval(() => this.beat(), HEARTBEAT_SECONDS * 1000);
    window.setInterval(() => this.scheduleArpeggio(), 100);
  }

  async resume(): Promise<void> {
    if (this.context.state !== 'running') await this.context.resume();
  }

  setMaster(level: number): void {
    this.master.gain.setTargetAtTime(level * 0.9, this.context.currentTime, level > 0 ? 0.8 : 0.2);
  }

  mix(params: MixParams): void {
    const now = this.context.currentTime;
    const ease = (param: AudioParam, value: number, constant = MIX_TIME_CONSTANT): void => {
      const previous = this.scheduled.get(param);
      if (previous !== undefined && Math.abs(previous - value) < MIX_EPSILON * Math.max(1, Math.abs(value)))
        return;
      this.scheduled.set(param, value);
      param.setTargetAtTime(value, now, constant);
    };
    ease(this.airGain.gain, params.air * 0.05);
    ease(this.wavesGain.gain, params.waves * 0.42);
    ease(this.padGain.gain, params.pad * 0.55);
    ease(this.droneGain.gain, params.depth * 0.22);
    ease(this.shimmerGain.gain, params.shimmer * 0.035);
    ease(this.roomGain.gain, params.room * 0.16);
    ease(this.riserGain.gain, params.tension * params.tension * 0.07);
    ease(this.riserFilter.frequency, 300 + params.tension * 4200, 0.9);
    ease(this.padFilter.frequency, 520 + params.tension * 1600 + params.shimmer * 600, 0.9);
    ease(
      this.muffle.frequency,
      OPEN_FILTER * Math.pow(MUFFLED_FILTER / OPEN_FILTER, params.underwater),
      0.35,
    );
    ease(this.duck.gain, 1 - params.silence, params.silence > 0.5 ? 0.04 : 0.6);
    const wasTense = this.tension > 0.5;
    this.tension = params.tension;
    this.pulse = params.pulse;
    this.motion = params.motion;
    if (wasTense !== this.tension > 0.5) this.applyChord(0.8);
  }

  cue(name: Cue, options: CueOptions = {}): void {
    playCue(this, name, options);
  }

  private gain(value: number): GainNode {
    const node = this.context.createGain();
    node.gain.value = value;
    return node;
  }

  private loopNoise(color: NoiseColor): AudioBufferSourceNode {
    const source = this.context.createBufferSource();
    source.buffer = this.noise[color];
    source.loop = true;
    source.loopStart = Math.random();
    source.start(0, Math.random() * 2);
    return source;
  }

  private lfo(frequency: number, depth: number, target: AudioParam): OscillatorNode {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.value = frequency;
    const amount = this.gain(depth);
    oscillator.connect(amount).connect(target);
    oscillator.start();
    return oscillator;
  }

  private buildAir(): GainNode {
    const ctx = this.context;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2200;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 5200;
    band.Q.value = 0.4;
    this.lfo(0.05, 1400, band.frequency);
    const output = this.gain(0);
    this.loopNoise('pink').connect(highpass).connect(band).connect(output).connect(this.ambienceBus);
    return output;
  }

  private buildWaves(): GainNode {
    const ctx = this.context;
    const output = this.gain(0);
    [-0.65, 0.65].forEach((pan, side) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.3;
      this.lfo(0.071 + side * 0.023, 380, filter.frequency);
      const swell = this.gain(0.55);
      this.lfo(0.083 + side * 0.017, 0.42, swell.gain);
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      this.loopNoise('brown').connect(filter).connect(swell).connect(panner).connect(output);
    });
    output.connect(this.ambienceBus);
    return output;
  }

  private buildPad(): GainNode {
    const ctx = this.context;
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 600;
    this.padFilter.Q.value = 0.8;
    this.lfo(0.04, 160, this.padFilter.frequency);
    const output = this.gain(0);
    const chord = CALM_PROGRESSION[0]!;
    chord.forEach((note, index) => {
      const voiceGain = this.gain(index === 0 ? 0.06 : 0.035);
      const primary = ctx.createOscillator();
      primary.type = 'triangle';
      primary.frequency.value = midiToFrequency(note);
      const secondary = ctx.createOscillator();
      secondary.type = 'sawtooth';
      secondary.frequency.value = midiToFrequency(note);
      secondary.detune.value = 6 + index * 2;
      const secondaryGain = this.gain(0.32);
      primary.connect(voiceGain);
      secondary.connect(secondaryGain).connect(voiceGain);
      voiceGain.connect(this.padFilter);
      primary.start();
      secondary.start();
      this.padVoices.push({ primary, secondary });
    });
    this.padFilter.connect(output).connect(this.musicBus);
    return output;
  }

  private buildDrone(): GainNode {
    const output = this.gain(0);
    [41.2, 55, 82.41].forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      oscillator.frequency.value = frequency;
      const level = this.gain(index === 1 ? 0.6 : 0.35);
      this.lfo(0.11 + index * 0.05, 0.18, level.gain);
      oscillator.connect(level).connect(output);
      oscillator.start();
    });
    output.connect(this.musicBus);
    return output;
  }

  private buildShimmer(): GainNode {
    const ctx = this.context;
    const output = this.gain(0);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 900;
    [81, 85, 88, 93].forEach((note, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = midiToFrequency(note);
      const level = this.gain(0.25);
      this.lfo(0.17 + index * 0.09, 0.24, level.gain);
      oscillator.connect(level).connect(highpass);
      oscillator.start();
    });
    highpass.connect(output);
    output.connect(this.musicBus);
    output.connect(this.reverbSend);
    return output;
  }

  private buildRoom(): GainNode {
    const ctx = this.context;
    const output = this.gain(0);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;
    this.loopNoise('brown').connect(lowpass).connect(output);
    const hum = ctx.createOscillator();
    hum.frequency.value = 100;
    hum.connect(this.gain(0.025)).connect(output);
    hum.start();
    output.connect(this.ambienceBus);
    return output;
  }

  private buildRiser(): GainNode {
    this.riserFilter.type = 'bandpass';
    this.riserFilter.frequency.value = 400;
    this.riserFilter.Q.value = 3;
    const output = this.gain(0);
    this.loopNoise('white').connect(this.riserFilter).connect(output).connect(this.musicBus);
    return output;
  }

  private advanceChord(): void {
    this.chordIndex = (this.chordIndex + 1) % CALM_PROGRESSION.length;
    this.applyChord(1.6);
  }

  private applyChord(glide: number): void {
    const progression = this.tension > 0.5 ? TENSE_PROGRESSION : CALM_PROGRESSION;
    const chord = progression[this.chordIndex % progression.length]!;
    const now = this.context.currentTime;
    this.padVoices.forEach((voice, index) => {
      const frequency = midiToFrequency(chord[index % chord.length]!);
      voice.primary.frequency.setTargetAtTime(frequency, now, glide);
      voice.secondary.frequency.setTargetAtTime(frequency, now, glide * 1.2);
    });
  }

  private beat(): void {
    if (this.pulse > 0.02) playCue(this, 'heartbeat', { gain: this.pulse });
  }

  private scheduleArpeggio(): void {
    const now = this.context.currentTime;
    if (this.motion < 0.02) {
      this.nextArp = now + 0.05;
      return;
    }
    this.nextArp = Math.max(this.nextArp, now);
    while (this.nextArp < now + ARP_LOOKAHEAD) {
      this.pluck(this.nextArp);
      this.nextArp += ARP_STEP * (this.tension > 0.75 ? 0.5 : 1);
    }
  }

  private pluck(at: number): void {
    const progression = this.tension > 0.5 ? TENSE_PROGRESSION : CALM_PROGRESSION;
    const chord = progression[this.chordIndex % progression.length]!;
    const degree = ARP_PATTERN[this.arpIndex % ARP_PATTERN.length]!;
    const octave = 12 + 12 * (Math.floor(this.arpIndex / ARP_PATTERN.length) % 2);
    const frequency = midiToFrequency(chord[degree % chord.length]! + octave);
    this.arpIndex += 1;
    const level = 0.05 * this.motion * (0.7 + Math.random() * 0.3);
    const voice = this.gain(0);
    voice.gain.setValueAtTime(0.0001, at);
    voice.gain.exponentialRampToValueAtTime(level, at + 0.006);
    voice.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    voice.connect(this.musicBus);
    voice.connect(this.reverbSend);
    [
      { type: 'triangle' as OscillatorType, ratio: 1, amount: 1 },
      { type: 'sine' as OscillatorType, ratio: 2, amount: 0.35 },
    ].forEach(({ type, ratio, amount }) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency * ratio;
      oscillator.connect(this.gain(amount)).connect(voice);
      oscillator.start(at);
      oscillator.stop(at + 1.5);
    });
  }
}
