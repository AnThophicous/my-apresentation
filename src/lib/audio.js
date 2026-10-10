const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CHORDS = [
  [45, 57, 60, 64, 71],
  [41, 53, 57, 60, 67],
  [48, 55, 60, 64, 69],
  [43, 55, 59, 62, 69],
];

class Ambient {
  ctx = null;
  on = false;
  chord = 0;

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(3.4, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    reverb.connect(wet).connect(master);

    const dry = ctx.createGain();
    dry.gain.value = 0.55;
    dry.connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    filter.Q.value = 0.7;
    filter.connect(dry);
    filter.connect(reverb);

    const pad = ctx.createGain();
    pad.gain.value = 0.13;
    pad.connect(filter);

    this.voices = CHORDS[0].map((m, i) => {
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.55 : 0.26;
      g.connect(pad);
      const o1 = ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.value = midi(m);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = midi(m);
      o2.detune.value = 6 + i;
      o1.connect(g);
      o2.connect(g);
      o1.start();
      o2.start();
      return { o1, o2 };
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const sub = ctx.createOscillator();
    sub.frequency.value = 41.2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0;
    sub.connect(subGain).connect(master);
    sub.start();

    const noise = ctx.createBufferSource();
    noise.buffer = this.noise(2.5);
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.9;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter).connect(windGain);
    windGain.connect(reverb);
    windGain.connect(master);
    noise.start();

    Object.assign(this, { master, dry, reverb, filter, subGain, windFilter, windGain });
    this.timer = setInterval(() => this.nextChord(), 9000);
  }

  nextChord() {
    if (!this.ctx) return;
    this.chord = (this.chord + 1) % CHORDS.length;
    const t = this.ctx.currentTime;
    CHORDS[this.chord].forEach((m, i) => {
      this.voices[i].o1.frequency.setTargetAtTime(midi(m), t, 1.1);
      this.voices[i].o2.frequency.setTargetAtTime(midi(m), t, 1.4);
    });
  }

  async enable() {
    if (!this.ctx) this.build();
    await this.ctx.resume();
    this.on = true;
    this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.8);
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  setScene({ brightness = 0.4, hole = 0, wind = 0 }) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(280 + brightness * 2400, t, 0.5);
    this.subGain.gain.setTargetAtTime(hole * 0.4, t, 0.4);
    this.windGain.gain.setTargetAtTime(wind * 0.09, t, 0.3);
    this.windFilter.frequency.setTargetAtTime(300 + wind * 1500, t, 0.3);
  }

  click(kind = 'key') {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.clickBuf || (this.clickBuf = this.noise(0.09));
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'switch' ? 2200 : 2800 + Math.random() * 1200;
    bp.Q.value = 1.3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(kind === 'switch' ? 0.8 : 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(bp).connect(g).connect(this.dry);
    src.start(t);

    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(kind === 'switch' ? 190 : 150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.06);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.28, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og).connect(this.dry);
    o.start(t);
    o.stop(t + 0.1);
  }

  hover() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.04);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.dry);
    o.start(t);
    o.stop(t + 0.07);
  }

  pluck(step = 0) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = CHORDS[this.chord];
    const m = notes[1 + (step % (notes.length - 1))] + 12;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(m);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g);
    g.connect(this.reverb);
    g.connect(this.dry);
    o.start(t);
    o.stop(t + 2.3);
  }

  noise(sec) {
    const len = Math.floor(this.ctx.sampleRate * sec);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  impulse(sec, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
}

export const ambient = new Ambient();
