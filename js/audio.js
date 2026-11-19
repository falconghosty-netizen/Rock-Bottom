// All sound is synthesized with WebAudio: no audio files.
const rnd = (a, b) => a + Math.random() * (b - a);

export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxVol = 0.8;
    this.ambVol = 0.6;
    this.layer = -1;
    this.amb = null;
  }

  // must be called from a user gesture (iOS)
  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -14; this.master.ratio.value = 4; this.master.attack.value = 0.004; this.master.release.value = 0.2;
    this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = this.ambVol; this.ambBus.connect(this.master);
    // shared reverb (generated impulse)
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.2, 2.8);
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.25;
    this.verbIn.connect(this.verb); this.verb.connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    this.brownBuf = this.makeNoise(4, true);
    // play a silent buffer to fully unlock iOS
    const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0);
    if (this.pendingLayer !== undefined) this.setLayer(this.pendingLayer);
  }

  setVolumes(sfx, amb) {
    this.sfxVol = sfx; this.ambVol = amb;
    if (!this.ctx) return;
    this.sfx.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    this.ambBus.gain.setTargetAtTime(amb, this.ctx.currentTime, 0.2);
  }
  setDepthVerb(layer) { if (this.verbIn) this.verbIn.gain.setTargetAtTime(0.18 + layer * 0.05, this.ctx.currentTime, 1); }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  makeNoise(sec, brown = false) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }

  // -------- building blocks
  noise({ t = 0, dur = 0.2, type = 'lowpass', freq = 1000, q = 1, gain = 0.5, attack = 0.002, sweepTo, brown = false, verb = 0, dest } = {}) {
    const ctx = this.ctx, now = ctx.currentTime + t;
    const src = ctx.createBufferSource(); src.buffer = brown ? this.brownBuf : this.noiseBuf;
    src.playbackRate.value = rnd(0.9, 1.1);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, now); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, now + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + attack); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfx);
    if (verb) { const v = ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbIn); }
    src.start(now, Math.random() * 1.5); src.stop(now + dur + 0.05);
  }
  tone({ t = 0, dur = 0.2, type = 'sine', freq = 440, to, gain = 0.3, attack = 0.005, verb = 0, dest, detune = 0 } = {}) {
    const ctx = this.ctx, now = ctx.currentTime + t;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, now); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, now + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + attack); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(dest || this.sfx);
    if (verb) { const v = ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbIn); }
    o.start(now); o.stop(now + dur + 0.05);
  }
  ok() { return this.ctx && this.ctx.state === 'running'; }

  // -------- game sounds
  dig(layer, power = 1) {
    if (!this.ok()) return;
    const p = rnd(0.9, 1.12);
    if (layer <= 1) { // soft earth: thump + crumble
      this.tone({ freq: 120 * p, to: 55, dur: 0.12, gain: 0.5, type: 'sine' });
      this.noise({ freq: 900 * p, type: 'lowpass', dur: 0.16, gain: 0.45, sweepTo: 300 });
      this.noise({ t: 0.03, freq: 2400, type: 'bandpass', q: 0.8, dur: 0.12, gain: 0.12 });
    } else if (layer === 2 || layer === 5) { // stone: clack
      this.tone({ freq: 180 * p, to: 80, dur: 0.08, gain: 0.4 });
      this.noise({ freq: 2600 * p, type: 'bandpass', q: 1.4, dur: 0.09, gain: 0.5, verb: 0.3 });
      this.tone({ freq: 1800 * p, dur: 0.06, gain: 0.05, type: 'triangle' });
    } else if (layer === 3) { // chalky shale: brittle crunch
      this.tone({ freq: 150 * p, to: 70, dur: 0.09, gain: 0.35 });
      this.noise({ freq: 3200 * p, type: 'highpass', dur: 0.1, gain: 0.3 });
      this.noise({ t: 0.02, freq: 1400, type: 'bandpass', q: 2, dur: 0.12, gain: 0.25 });
    } else if (layer === 4) { // crystal: glassy chink
      this.tone({ freq: 140 * p, to: 70, dur: 0.08, gain: 0.3 });
      const base = [1318, 1568, 1760, 2093][Math.floor(rnd(0, 4))];
      this.tone({ freq: base * p, dur: 0.5, gain: 0.07, type: 'sine', verb: 0.6 });
      this.tone({ freq: base * 2.01 * p, dur: 0.25, gain: 0.03, verb: 0.6 });
      this.noise({ freq: 5000, type: 'highpass', dur: 0.05, gain: 0.2 });
    } else { // magma / core: heavy crunch + sizzle
      this.tone({ freq: 90 * p, to: 40, dur: 0.16, gain: 0.55 });
      this.noise({ freq: 1200 * p, type: 'lowpass', dur: 0.14, gain: 0.4 });
      this.noise({ t: 0.04, freq: 6000, type: 'highpass', dur: 0.35, gain: 0.07 });
    }
  }
  crit(layer) {
    if (!this.ok()) return;
    this.tone({ freq: 70, to: 30, dur: 0.35, gain: 0.7 });
    this.noise({ freq: 3000, type: 'bandpass', q: 0.7, dur: 0.22, gain: 0.55, verb: 0.4 });
    this.noise({ t: 0.02, freq: 600, type: 'lowpass', dur: 0.4, gain: 0.35, brown: true });
    this.tone({ t: 0.01, freq: 880, to: 1320, dur: 0.12, gain: 0.06, type: 'triangle' });
  }
  full() {
    if (!this.ok()) return;
    this.tone({ freq: 220, dur: 0.09, gain: 0.18, type: 'square' });
    this.tone({ t: 0.1, freq: 165, dur: 0.14, gain: 0.18, type: 'square' });
  }
  sell(amountScale = 1) {
    if (!this.ok()) return;
    this.noise({ freq: 700, type: 'lowpass', dur: 0.25, gain: 0.25 }); // bag thump
    const n = Math.min(9, 4 + Math.floor(amountScale));
    for (let i = 0; i < n; i++) {
      const t = 0.04 + i * 0.045 + rnd(0, 0.02), f = rnd(2400, 3800);
      this.tone({ t, freq: f, dur: 0.18, gain: 0.07, type: 'sine', verb: 0.3 });
      this.tone({ t, freq: f * 1.5, dur: 0.1, gain: 0.03, type: 'sine' });
    }
    this.tone({ t: 0.05, freq: 1046, dur: 0.12, gain: 0.08, type: 'triangle' });
    this.tone({ t: 0.13, freq: 1568, dur: 0.3, gain: 0.08, type: 'triangle', verb: 0.3 });
  }
  buy() {
    if (!this.ok()) return;
    this.noise({ freq: 1800, type: 'bandpass', q: 3, dur: 0.05, gain: 0.3 });
    this.tone({ freq: 523, dur: 0.1, gain: 0.12, type: 'triangle' });
    this.tone({ t: 0.07, freq: 784, dur: 0.18, gain: 0.12, type: 'triangle', verb: 0.2 });
  }
  equip() {
    if (!this.ok()) return;
    this.noise({ freq: 4000, type: 'highpass', dur: 0.15, gain: 0.12, attack: 0.05 });
    this.tone({ t: 0.05, freq: 300, to: 600, dur: 0.15, gain: 0.08, type: 'triangle' });
  }
  skill() {
    if (!this.ok()) return;
    this.tone({ freq: 110, to: 90, dur: 0.3, gain: 0.35 });
    [523, 659, 784].forEach((f, i) => this.tone({ t: 0.02 + i * 0.05, freq: f, dur: 0.6, gain: 0.07, type: 'sine', verb: 0.5 }));
  }
  ui() { if (!this.ok()) return; this.noise({ freq: 3000, type: 'bandpass', q: 4, dur: 0.035, gain: 0.18 }); }
  deny() { if (!this.ok()) return; this.tone({ freq: 180, to: 140, dur: 0.12, gain: 0.15, type: 'triangle' }); }
  milestone() {
    if (!this.ok()) return;
    this.tone({ freq: 988, dur: 0.5, gain: 0.08, verb: 0.5 });
    this.tone({ t: 0.08, freq: 1318, dur: 0.7, gain: 0.08, verb: 0.5 });
  }
  boulderLand() {
    if (!this.ok()) return;
    this.tone({ freq: 60, to: 28, dur: 0.5, gain: 0.8 });
    this.noise({ freq: 400, type: 'lowpass', dur: 0.6, gain: 0.5, brown: true, verb: 0.5 });
  }
  boulderHit() {
    if (!this.ok()) return;
    this.tone({ freq: rnd(140, 180), to: 70, dur: 0.1, gain: 0.5 });
    this.noise({ freq: rnd(1500, 2200), type: 'bandpass', q: 1.2, dur: 0.12, gain: 0.45, verb: 0.3 });
  }
  boulderSmash() {
    if (!this.ok()) return;
    this.tone({ freq: 80, to: 30, dur: 0.6, gain: 0.8 });
    this.noise({ freq: 2500, type: 'lowpass', dur: 0.7, gain: 0.6, sweepTo: 300, verb: 0.5 });
    for (let i = 0; i < 8; i++) this.noise({ t: 0.08 + i * 0.05 + rnd(0, 0.04), freq: rnd(1500, 4000), type: 'bandpass', q: 2, dur: 0.06, gain: 0.15 });
    this.sell(2);
  }
  treasure() {
    if (!this.ok()) return;
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((f, i) => { this.tone({ t: i * 0.07, freq: f, dur: 0.9, gain: 0.06, verb: 0.7 }); this.tone({ t: i * 0.07, freq: f * 2, dur: 0.4, gain: 0.02, verb: 0.7 }); });
    this.noise({ freq: 8000, type: 'highpass', dur: 1.2, gain: 0.04, attack: 0.3 });
  }
  achievement() {
    if (!this.ok()) return;
    [659, 880].forEach((f, i) => this.tone({ t: i * 0.1, freq: f, dur: 0.4, gain: 0.07, type: 'triangle', verb: 0.4 }));
  }
  layer() {
    if (!this.ok()) return;
    this.noise({ freq: 200, type: 'lowpass', dur: 2.5, gain: 0.5, attack: 0.6, brown: true, verb: 0.6 });
    this.tone({ t: 0.2, freq: 65.4, dur: 3, gain: 0.25, verb: 0.8 });
    this.tone({ t: 0.2, freq: 98, dur: 3, gain: 0.12, verb: 0.8 });
    this.tone({ t: 0.25, freq: 130.8, dur: 2.5, gain: 0.08, type: 'triangle', verb: 0.8 });
  }
  fault() {
    if (!this.ok()) return;
    this.noise({ freq: 300, type: 'lowpass', dur: 1.2, gain: 0.7, brown: true, verb: 0.5, attack: 0.05 });
    this.tone({ freq: 45, to: 30, dur: 1, gain: 0.5 });
  }
  momentum() {
    if (!this.ok()) return;
    this.tone({ freq: 220, to: 880, dur: 0.4, gain: 0.08, type: 'sawtooth' });
    this.tone({ freq: 330, to: 1320, dur: 0.4, gain: 0.05, type: 'triangle' });
  }
  rumble(dur = 3) {
    if (!this.ok()) return;
    this.noise({ freq: 160, type: 'lowpass', dur, gain: 0.9, brown: true, attack: dur * 0.6, verb: 0.4 });
  }
  finale() {
    if (!this.ok()) return;
    this.noise({ freq: 3000, type: 'lowpass', dur: 2.5, gain: 0.8, sweepTo: 200, verb: 0.7 });
    this.tone({ freq: 50, to: 25, dur: 2, gain: 0.9 });
    const chord = [130.8, 164.8, 196, 261.6, 329.6, 392];
    chord.forEach((f, i) => this.tone({ t: 1.2 + i * 0.12, freq: f, dur: 5, gain: 0.05, type: 'triangle', verb: 0.9, attack: 0.8 }));
  }
  snore() {
    if (!this.ok()) return;
    this.noise({ freq: 260, type: 'bandpass', q: 3, dur: 1.4, gain: 0.25, attack: 0.7 });
  }
  yawn() {
    if (!this.ok()) return;
    this.tone({ freq: 160, to: 90, dur: 1.6, gain: 0.2, type: 'sawtooth', attack: 0.3 });
    this.noise({ freq: 700, type: 'bandpass', q: 2, dur: 1.6, gain: 0.15, attack: 0.3 });
  }

  // -------- ambience per layer
  setLayer(i) {
    if (!this.ctx) { this.pendingLayer = i; return; }
    if (i === this.layer) return;
    this.layer = i;
    this.setDepthVerb(i);
    const ctx = this.ctx, now = ctx.currentTime;
    if (this.amb) { const old = this.amb; old.gain.gain.setTargetAtTime(0, now, 1.2); setTimeout(() => old.stop(), 5000); }
    const out = ctx.createGain(); out.gain.value = 0; out.connect(this.ambBus);
    out.gain.setTargetAtTime(1, now, 1.5);
    const nodes = [];
    const loopNoise = (type, freq, q, gain, brown, lfoRate = 0, lfoDepth = 0) => {
      const s = ctx.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      if (lfoRate) { const l = ctx.createOscillator(); l.frequency.value = lfoRate; const lg = ctx.createGain(); lg.gain.value = lfoDepth; l.connect(lg); lg.connect(g.gain); l.start(); nodes.push(l); }
      nodes.push(s);
    };
    const drone = (freq, gain, type = 'sine', detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
      const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(out); o.start(); nodes.push(o);
    };
    let timer = null;
    const every = (min, max, fn) => { const go = () => { fn(); timer = setTimeout(go, rnd(min, max)); }; timer = setTimeout(go, rnd(min, max)); };
    const dest = out;
    switch (i) {
      case 0: // backyard / topsoil: breeze + birds
        loopNoise('lowpass', 500, 0.5, 0.18, true, 0.08, 0.08);
        every(1500, 5000, () => { if (this.layer !== 0) return; const f = rnd(2500, 4200); for (let k = 0; k < Math.floor(rnd(2, 5)); k++) this.tone({ t: k * 0.11, freq: f, to: f * rnd(1.1, 1.4), dur: 0.08, gain: 0.025, dest }); });
        break;
      case 1: // clay: muffled, distant drips
        loopNoise('lowpass', 220, 0.7, 0.2, true, 0.05, 0.06);
        every(2500, 6000, () => { if (this.layer !== 1) return; this.tone({ freq: rnd(1100, 1600), to: 700, dur: 0.12, gain: 0.03, verb: 0.6, dest }); });
        break;
      case 2: case 3: // bedrock / fossil: cave drone + drips
        loopNoise('lowpass', 150, 0.8, 0.22, true);
        drone(55, 0.035); drone(55.4, 0.03);
        every(1800, 4500, () => { if (this.layer !== i) return; this.tone({ freq: rnd(900, 1500), to: rnd(500, 700), dur: 0.15, gain: 0.04, verb: 0.9, dest }); });
        break;
      case 4: // crystal caves: shimmering pad
        loopNoise('lowpass', 180, 0.5, 0.12, true);
        [261.6, 329.6, 392, 493.9].forEach((f, k) => drone(f, 0.012, 'sine', k * 3));
        every(2000, 5000, () => { if (this.layer !== 4) return; this.tone({ freq: [1318, 1568, 1976, 2349][Math.floor(rnd(0, 4))], dur: 1.5, gain: 0.025, verb: 0.9, dest }); });
        break;
      case 5: // ruins: deep wind howl
        loopNoise('bandpass', 320, 4, 0.18, false, 0.07, 0.12);
        drone(49, 0.03);
        break;
      case 6: // magma: rumble + bubbling
        loopNoise('lowpass', 110, 0.9, 0.4, true, 0.2, 0.15);
        drone(41, 0.05, 'triangle');
        every(300, 1200, () => { if (this.layer !== 6) return; this.tone({ freq: rnd(80, 160), to: rnd(200, 300), dur: 0.08, gain: 0.05, dest }); });
        break;
      default: // core: dense hum
        loopNoise('lowpass', 140, 0.9, 0.3, true);
        drone(55, 0.05, 'sine'); drone(110.6, 0.025, 'triangle'); drone(164.2, 0.012, 'sine');
        break;
    }
    this.amb = { gain: out, stop: () => { clearTimeout(timer); nodes.forEach(n => { try { n.stop(); } catch {} }); out.disconnect(); } };
  }
}
