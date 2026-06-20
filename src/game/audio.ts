// All sound is synthesized live with the Web Audio API — a calm ambient pad plus
// soft chimes. No external audio files, so nothing to load or host.

type Maybe<T> = T | null;

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5 major pentatonic

export class AudioEngine {
  private ctx: Maybe<AudioContext> = null;
  private master: Maybe<GainNode> = null;
  private padGain: Maybe<GainNode> = null;
  private reverb: Maybe<ConvolverNode> = null;
  private started = false;
  private comboTimer = 0;
  private combo = 0;

  /** Must be called from a user gesture (click/tap) to satisfy autoplay rules. */
  async start(muted: boolean) {
    if (this.started) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctx();
      const ctx = this.ctx;

      this.master = ctx.createGain();
      this.master.gain.value = muted ? 0 : 0.9;
      this.master.connect(ctx.destination);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.makeImpulse(2.6, 2.2);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.5;
      this.reverb.connect(reverbGain).connect(this.master);

      this.startPad();
      this.started = true;
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean) {
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.9, t + 0.4);
    }
  }

  private makeImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // Slow, breathing pad made of a couple of detuned saws through a soft filter.
  private startPad() {
    const ctx = this.ctx!;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    this.padGain.connect(filter);
    filter.connect(this.master!);
    filter.connect(this.reverb!);

    const notes = [130.81, 196.0, 261.63]; // C3, G3, C4
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      osc.connect(g).connect(this.padGain!);

      // gentle vibrato
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain).connect(osc.detune);
      lfo.start();
      osc.start();
    });

    // slow swell of the whole pad
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.05;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.05;
    const base = ctx.createConstantSource();
    base.offset.value = 0.09;
    swell.connect(swellGain).connect(this.padGain.gain);
    base.connect(this.padGain.gain);
    swell.start();
    base.start();
    // fade in
    this.padGain.gain.setValueAtTime(0, ctx.currentTime);
    this.padGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 4);
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Soft bell when collecting a marker. Rises in pitch on a quick combo. */
  collect() {
    if (!this.ctx || !this.master) return;
    const t = this.now();
    if (t - this.comboTimer < 1.2) this.combo = Math.min(this.combo + 1, 5);
    else this.combo = 0;
    this.comboTimer = t;

    const freq = PENTATONIC[this.combo % PENTATONIC.length];
    this.bell(freq, t, 0.18, 0.5);
    this.bell(freq * 2, t + 0.005, 0.08, 0.35);
  }

  private bell(freq: number, at: number, vol: number, dur: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(this.master!);
    if (this.reverb) g.connect(this.reverb);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** Soft rising "whoop" when the fluffball jumps. */
  jump() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = this.now();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g).connect(this.master);
    if (this.reverb) g.connect(this.reverb);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Cheerful little arpeggio when a quest is finished. */
  questComplete() {
    if (!this.ctx) return;
    const t = this.now();
    [0, 2, 4, 5].forEach((step, i) => {
      this.bell(PENTATONIC[step], t + i * 0.1, 0.16, 0.7);
    });
  }

  /** Airy rising whoosh on planet transition. */
  teleport() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = this.now();

    // filtered noise sweep
    const len = Math.floor(ctx.sampleRate * 1.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(4000, t + 1.2);
    bp.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.25, t + 0.4);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    noise.connect(bp).connect(ng).connect(this.master);
    if (this.reverb) ng.connect(this.reverb);
    noise.start(t);
    noise.stop(t + 1.6);

    // gliding shimmer
    [0, 2, 4].forEach((step, i) => {
      this.bell(PENTATONIC[step] * 1.5, t + 0.5 + i * 0.12, 0.12, 0.9);
    });
  }
}

export const audio = new AudioEngine();
