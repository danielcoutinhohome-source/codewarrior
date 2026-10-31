// Small synthesized sound effects (no audio files). Quiet by design and easy to mute.
"use client";

type Sfx = "click" | "slash" | "crit" | "hit" | "hurt" | "right" | "wrong" | "coin" | "buy" | "potion" | "shield" | "victory" | "defeat" | "level" | "whoosh";

const MUTE_KEY = "cw.muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {}
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.5, glideTo?: number) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.4, from = 2000, to = 400, type: BiquadFilterType = "bandpass") {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

export function play(name: Sfx) {
  if (isMuted()) return;
  switch (name) {
    case "click":
      return tone(660, 0, 0.06, "triangle", 0.18);
    case "whoosh":
      return noise(0, 0.28, 0.25, 600, 3000, "bandpass");
    case "slash":
      noise(0, 0.18, 0.35, 4000, 900, "highpass");
      return tone(520, 0.02, 0.12, "sawtooth", 0.08, 260);
    case "crit":
      noise(0, 0.22, 0.4, 5000, 900, "highpass");
      tone(880, 0.0, 0.1, "square", 0.1, 1320);
      return tone(1320, 0.1, 0.18, "triangle", 0.18);
    case "hit":
      noise(0, 0.14, 0.45, 900, 120, "lowpass");
      return tone(140, 0, 0.16, "sine", 0.5, 60);
    case "hurt":
      noise(0, 0.2, 0.4, 700, 100, "lowpass");
      return tone(220, 0, 0.25, "square", 0.12, 90);
    case "right":
      tone(784, 0, 0.12, "triangle", 0.28);
      return tone(1175, 0.09, 0.2, "triangle", 0.28);
    case "wrong":
      return tone(196, 0, 0.22, "triangle", 0.25, 150);
    case "coin":
      tone(988, 0, 0.07, "square", 0.08);
      return tone(1319, 0.06, 0.16, "square", 0.08);
    case "buy":
      [988, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.12, "square", 0.08));
      return;
    case "potion":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.05, 0.14, "sine", 0.2));
      return;
    case "shield":
      tone(330, 0, 0.3, "triangle", 0.25, 660);
      return noise(0, 0.25, 0.15, 3000, 6000, "highpass");
    case "level":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.2, "triangle", 0.22));
      return;
    case "victory":
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.16, "triangle", 0.25));
      tone(1047, 0.36, 0.5, "triangle", 0.3);
      return tone(784, 0.36, 0.5, "sine", 0.15);
    case "defeat":
      [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.24, "triangle", 0.22));
      return;
  }
}
