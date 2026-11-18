// All sound is synthesized with WebAudio: no audio files, no network.
// Each effect is a few oscillators or a burst of filtered noise, and a slow
// two-oscillator pad hums underneath while the game runs.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startPad();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  noise(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }

  shoot() {
    this.tone(720 + Math.random() * 120, 0.09, 'square', 0.10, 240);
  }

  hit() {
    this.tone(220, 0.07, 'triangle', 0.14, 110);
  }

  explode(big) {
    this.noise(big ? 0.5 : 0.28, big ? 0.4 : 0.25, big ? 900 : 1400);
    this.tone(big ? 120 : 160, 0.3, 'sine', 0.25, 40);
  }

  pickup() {
    this.tone(660, 0.1, 'sine', 0.16);
    setTimeout(() => this.tone(990, 0.14, 'sine', 0.16), 70);
  }

  hurt() {
    this.tone(180, 0.35, 'sawtooth', 0.22, 55);
    this.noise(0.2, 0.2, 600);
  }

  dash() {
    this.noise(0.16, 0.12, 3200);
  }

  waveHorn() {
    this.tone(196, 0.5, 'triangle', 0.18);
    setTimeout(() => this.tone(294, 0.5, 'triangle', 0.18), 140);
    setTimeout(() => this.tone(392, 0.6, 'triangle', 0.16), 280);
  }

  gameOver() {
    const notes = [392, 311, 262, 196];
    notes.forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.45, 'triangle', 0.2), i * 220);
    });
  }

  startPad() {
    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.05;
    padGain.connect(this.master);
    const freqs = [55, 82.5, 110.3];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.05;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 6;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(padGain);
      osc.start();
      lfo.start();
    });
    this.music = padGain;
  }
}
