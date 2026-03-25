// Tiny Web Audio sound effects — no external files needed
function play(fn: (c: AudioContext) => void) {
  try { const c = new AudioContext(); fn(c); setTimeout(() => c.close(), 1500); } catch {}
}

export const Sounds = {
  message: () => play((c) => {
    const g = c.createGain(); g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(880, c.currentTime); o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
    o.connect(g); o.start(); o.stop(c.currentTime + 0.3);
  }),
  callAccept: () => play((c) => {
    const g = c.createGain(); g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    g.connect(c.destination);
    [[523, 0], [659, 0.15], [784, 0.3]].forEach(([freq, t]) => {
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      o.connect(g); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.15);
    });
  }),
  callDecline: () => play((c) => {
    const g = c.createGain(); g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    g.connect(c.destination);
    [[400, 0], [300, 0.2]].forEach(([freq, t]) => {
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
      o.connect(g); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.15);
    });
  }),
  callEnd: () => play((c) => {
    const g = c.createGain(); g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(600, c.currentTime); o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4);
    o.connect(g); o.start(); o.stop(c.currentTime + 0.4);
  }),
  sent: () => play((c) => {
    const g = c.createGain(); g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 1000;
    o.connect(g); o.start(); o.stop(c.currentTime + 0.15);
  }),
};
