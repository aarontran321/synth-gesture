// Oscillators into a bypass waveshaper, then a lowpass, then the master gain.
// Waveforms: warm triangle, bright saw, retro square.
// Right-hand tilt moves the same filter the original instrument uses.

const WAVEFORMS = new Set(["triangle", "sawtooth", "square"]);

export class SynthEngine {
  constructor() {
    this.context = null;
    this.filter = null;
    this.waveShaper = null;
    this.master = null;
    this.oscillators = [];
    this.waveform = "triangle";
    this.signature = "";
  }

  async start() {
    this.#ensure();
    if (this.context.state !== "running") await this.context.resume();
  }

  setWaveform(type) {
    if (!WAVEFORMS.has(type) || type === this.waveform) return;
    this.waveform = type;
    this.signature = "";
  }

  setVolume(amount) {
    if (!this.context) return;
    const gain = Math.max(0, Math.min(1, amount));
    this.master.gain.linearRampToValueAtTime(gain, this.context.currentTime + 0.05);
  }

  setFilter(tilt) {
    if (!this.context) return;
    const amount = Math.max(-1, Math.min(1, tilt));
    let frequency = 1200;
    let q = 0.7;
    if (amount < 0) {
      const intensity = Math.abs(amount);
      frequency = 1200 - intensity * 950;
      q = 0.7 + intensity * 1.5;
    } else if (amount > 0) {
      frequency = 1200 + amount * 3800;
      q = 0.7 + amount * 4.5;
    }
    const now = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(frequency, now, 0.04);
    this.filter.Q.setTargetAtTime(q, now, 0.04);
  }

  playNotes(frequencies) {
    if (!this.context || frequencies.length === 0) return;
    const signature = `${this.waveform}|${frequencies.map((freq) => freq.toFixed(1)).join(",")}`;
    if (signature === this.signature) return;

    this.#stopOscillators();
    this.oscillators = frequencies.map((freq) => {
      const osc = this.context.createOscillator();
      osc.type = this.waveform;
      osc.frequency.value = freq;
      osc.connect(this.waveShaper);
      osc.start();
      return osc;
    });
    this.signature = signature;
  }

  #ensure() {
    if (this.context) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioCtx();

    this.waveShaper = this.context.createWaveShaper();
    this.waveShaper.curve = null;
    this.waveShaper.oversample = "4x";

    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 1200;
    this.filter.Q.value = 0.7;

    this.master = this.context.createGain();
    this.master.gain.value = 0;

    this.waveShaper.connect(this.filter);
    this.filter.connect(this.master);
    this.master.connect(this.context.destination);
  }

  #stopOscillators() {
    for (const osc of this.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* already disconnected */ }
    }
    this.oscillators = [];
  }
}
