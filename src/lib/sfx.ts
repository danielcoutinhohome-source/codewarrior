// Synthesized sound effects (no audio files, so nothing to license). Every sound is layered
// from short oscillator and filtered-noise voices, with small random pitch and level changes
// so repeats never sound identical. All voices go through one bus with a compressor, so
// overlapping combat sounds stay comfortable instead of clipping.
"use client";

export type Sfx =
  // interface and rewards
  | "click" | "coin" | "buy" | "potion" | "level" | "victory" | "defeat" | "right" | "wrong" | "whoosh"
  // generic combat (kept for older call sites)
  | "slash" | "crit" | "hit" | "hurt" | "shield"
  // weapons
  | "bladeSwing" | "bladeImpact" | "scytheSweep" | "scytheHook" | "scytheImpact" | "hammerSwing" | "hammerImpact" | "groundSlam" | "glaiveThrust" | "glaiveSpin" | "glaiveImpact"
  // combos and finishers
  | "comboHit" | "launcher" | "airHit" | "critLayer" | "finisherCharge" | "suspense" | "finisherRelease" | "knockout"
  // enemies
  | "enemyGrowl" | "enemyRush" | "enemySweep" | "enemyRise" | "enemyDive" | "enemyVolley" | "enemyOrbit" | "enemyBeam" | "enemySnare" | "enemyQuake" | "enemyBlink" | "enemySummon" | "enemyVortex" | "enemyImpact" | "block"
  // boss gate
  | "sealBreak" | "chamberOpen"
  // learning (quiet)
  | "learnRight" | "learnWrong" | "milestone";

export type PlayOpts = { pan?: number; index?: number; intensity?: number };

const MUTE_KEY = "cw.muted";
const VOLUME = 0.3; // comfortable default
const MAX_VOICES = 28;

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const live = new Set<AudioScheduledSourceNode>();

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
  if (m) stopAll();
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    bus = ctx.createGain();
    bus.gain.value = VOLUME;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    bus.connect(comp).connect(ctx.destination);
    // Two seconds of white noise, shared by every noise voice.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // Browsers only allow audio after a user gesture; resume quietly when allowed.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

const jitter = (amt = 0.05) => 1 + (Math.random() * 2 - 1) * amt;

type Out = { c: AudioContext; dest: AudioNode; t0: number; p: number; gain: number };

function track(src: AudioScheduledSourceNode, stopAt: number) {
  live.add(src);
  src.onended = () => live.delete(src);
  src.stop(stopAt);
}

function env(o: Out, peak: number, start: number, attack: number, dur: number, curve: "exp" | "lin" = "exp") {
  const g = o.c.createGain();
  const t = o.t0 + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak * o.gain), t + attack);
  if (curve === "exp") g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t + dur);
  g.connect(o.dest);
  return g;
}

function tone(o: Out, type: OscillatorType, f0: number, f1: number | null, start: number, dur: number, vol: number, attack = 0.006, detune = 0) {
  const s = o.c.createOscillator();
  const t = o.t0 + start;
  s.type = type;
  s.detune.value = detune;
  s.frequency.setValueAtTime(f0 * o.p, t);
  if (f1) s.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * o.p), t + dur);
  s.connect(env(o, vol, start, attack, dur));
  s.start(t);
  track(s, t + dur + 0.05);
}

function noise(o: Out, filter: BiquadFilterType, f0: number, f1: number, start: number, dur: number, vol: number, q = 1, attack = 0.004) {
  const s = o.c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = o.c.createBiquadFilter();
  const t = o.t0 + start;
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  s.connect(f).connect(env(o, vol, start, attack, dur));
  s.start(t, Math.random() * 1.5);
  track(s, t + dur + 0.05);
}

// Inharmonic partials give metal its ring.
const metal = (o: Out, base: number, start: number, dur: number, vol: number) => [1, 1.48, 2.21, 2.93].forEach((m, i) => tone(o, "triangle", base * m, null, start, dur * (1 - i * 0.18), vol / (i + 1.4), 0.002));
const thud = (o: Out, f: number, start: number, dur: number, vol: number) => { tone(o, "sine", f, f * 0.35, start, dur, vol, 0.004); noise(o, "lowpass", 900, 120, start, dur * 0.6, vol * 0.5); };
const swish = (o: Out, f0: number, f1: number, start: number, dur: number, vol: number, q = 1.2) => noise(o, "bandpass", f0, f1, start, dur, vol, q, dur * 0.35);
const chord = (o: Out, freqs: number[], start: number, dur: number, vol: number, type: OscillatorType = "triangle", step = 0) => freqs.forEach((f, i) => tone(o, type, f, null, start + i * step, dur, vol, 0.01));

const SOUNDS: Record<Sfx, (o: Out, opts: PlayOpts) => void> = {
  // ---- interface ----
  click: (o) => tone(o, "triangle", 660, 620, 0, 0.06, 0.16),
  coin: (o) => { tone(o, "square", 988, null, 0, 0.07, 0.06); tone(o, "square", 1319, null, 0.06, 0.16, 0.06); },
  buy: (o) => chord(o, [988, 1319, 1568], 0, 0.14, 0.07, "square", 0.06),
  potion: (o) => { chord(o, [523, 659, 784, 1047], 0, 0.18, 0.16, "sine", 0.05); swish(o, 2000, 5000, 0, 0.35, 0.05, 2); },
  level: (o) => chord(o, [523, 659, 784, 1047, 1319], 0, 0.24, 0.18, "triangle", 0.08),
  victory: (o) => { chord(o, [523, 659, 784], 0, 0.18, 0.22, "triangle", 0.11); chord(o, [784, 1047, 1319], 0.36, 0.7, 0.16); tone(o, "sine", 262, null, 0.36, 0.8, 0.14); },
  defeat: (o) => chord(o, [392, 330, 262, 196], 0, 0.3, 0.18, "triangle", 0.17),
  right: (o) => { tone(o, "triangle", 784, null, 0, 0.12, 0.22); tone(o, "triangle", 1175, null, 0.08, 0.22, 0.22); },
  wrong: (o) => tone(o, "triangle", 220, 160, 0, 0.24, 0.22),
  whoosh: (o) => swish(o, 500, 2600, 0, 0.28, 0.22),

  // ---- generic combat ----
  slash: (o) => SOUNDS.bladeImpact(o, {}),
  hit: (o, x) => SOUNDS.comboHit(o, x),
  crit: (o) => { SOUNDS.bladeImpact(o, {}); SOUNDS.critLayer(o, {}); },
  hurt: (o) => { thud(o, 180, 0, 0.22, 0.5); tone(o, "square", 260, 110, 0.01, 0.2, 0.06); noise(o, "bandpass", 1400, 500, 0, 0.12, 0.18, 2); },
  shield: (o) => SOUNDS.block(o, {}),

  // ---- weapons ----
  bladeSwing: (o) => { swish(o, 1800, 7000, 0, 0.17, 0.3, 1.4); tone(o, "sine", 2400, 3400, 0.02, 0.12, 0.03); },
  bladeImpact: (o) => { noise(o, "highpass", 6000, 2000, 0, 0.12, 0.32); metal(o, 1850, 0.005, 0.28, 0.07); thud(o, 150, 0, 0.14, 0.32); },
  scytheSweep: (o) => { swish(o, 300, 2600, 0, 0.38, 0.32, 0.9); tone(o, "sine", 700, 1500, 0.05, 0.3, 0.05); },
  scytheHook: (o) => { metal(o, 2300, 0, 0.35, 0.08); swish(o, 3500, 900, 0.02, 0.22, 0.2, 2); },
  scytheImpact: (o) => { noise(o, "highpass", 5200, 1600, 0, 0.16, 0.3); metal(o, 1400, 0.01, 0.4, 0.06); thud(o, 120, 0, 0.18, 0.34); },
  hammerSwing: (o) => swish(o, 180, 900, 0, 0.36, 0.42, 0.8),
  hammerImpact: (o) => { thud(o, 110, 0, 0.42, 0.75); noise(o, "lowpass", 2200, 200, 0, 0.18, 0.32); tone(o, "square", 210, 170, 0, 0.08, 0.06); metal(o, 620, 0.01, 0.3, 0.05); },
  groundSlam: (o) => { SOUNDS.hammerImpact(o, {}); noise(o, "lowpass", 260, 60, 0.04, 0.9, 0.38, 0.7, 0.03); [0.12, 0.2, 0.31].forEach((s, i) => noise(o, "bandpass", 3000 - i * 600, 2000, s, 0.05, 0.08, 4)); },
  glaiveThrust: (o) => { swish(o, 1200, 5200, 0, 0.14, 0.32, 1.8); tone(o, "sine", 1100, 1700, 0.06, 0.1, 0.04); },
  glaiveSpin: (o) => [0, 0.11, 0.22].forEach((s, i) => swish(o, 700 + i * 300, 2600 + i * 500, s, 0.14, 0.24 - i * 0.03, 1.4)),
  glaiveImpact: (o) => { noise(o, "bandpass", 4200, 1800, 0, 0.1, 0.32, 2); tone(o, "triangle", 1450, 1300, 0, 0.18, 0.06); thud(o, 140, 0.005, 0.16, 0.34); },

  // ---- combos and finishers ----
  comboHit: (o, x) => { const i = x.index || 0; noise(o, "bandpass", 2600 + i * 250, 1200, 0, 0.07, 0.2, 2.4); thud(o, 170 + i * 12, 0, 0.1, 0.22); },
  launcher: (o) => { thud(o, 130, 0, 0.18, 0.4); tone(o, "sine", 220, 880, 0.02, 0.3, 0.1); swish(o, 600, 4000, 0.02, 0.3, 0.22, 1.2); },
  airHit: (o, x) => { const i = x.index || 0; const f = 2200 * Math.pow(1.09, i); noise(o, "bandpass", f, f * 0.6, 0, 0.06, 0.2, 3); tone(o, "triangle", 520 * Math.pow(1.12, i), null, 0, 0.09, 0.05); },
  critLayer: (o) => { chord(o, [1320, 1980], 0.02, 0.35, 0.06, "sine"); noise(o, "highpass", 8000, 4000, 0, 0.2, 0.12); },
  finisherCharge: (o) => {
    [-12, 0, 9].forEach((d) => {
      const s = o.c.createOscillator();
      const f = o.c.createBiquadFilter();
      const t = o.t0;
      s.type = "sawtooth";
      s.detune.value = d;
      s.frequency.setValueAtTime(90 * o.p, t);
      s.frequency.exponentialRampToValueAtTime(360 * o.p, t + 0.62);
      f.type = "lowpass";
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.62);
      const g = env(o, 0.07, 0, 0.55, 0.7, "lin");
      s.connect(f).connect(g);
      s.start(t);
      track(s, t + 0.75);
    });
    swish(o, 400, 6000, 0, 0.62, 0.12, 1);
  },
  suspense: (o) => { tone(o, "sine", 55, 50, 0, 0.5, 0.18, 0.12); tone(o, "sine", 3520, 3600, 0, 0.42, 0.012, 0.2); },
  finisherRelease: (o) => {
    thud(o, 90, 0, 0.7, 0.9);
    noise(o, "lowpass", 5000, 140, 0, 0.9, 0.42, 0.7);
    noise(o, "highpass", 7000, 3000, 0, 0.25, 0.22);
    chord(o, [262, 392, 523, 784], 0.03, 1.1, 0.06, "triangle");
    metal(o, 980, 0.02, 0.8, 0.06);
  },
  knockout: (o) => { tone(o, "triangle", 440, 70, 0, 0.6, 0.16); thud(o, 70, 0.08, 0.5, 0.5); noise(o, "lowpass", 1200, 100, 0.08, 0.5, 0.2); },

  // ---- enemies ----
  enemyGrowl: (o) => {
    const s = o.c.createOscillator();
    const lfo = o.c.createOscillator();
    const lg = o.c.createGain();
    const f = o.c.createBiquadFilter();
    const t = o.t0;
    s.type = "sawtooth";
    s.frequency.setValueAtTime(70 * o.p, t);
    s.frequency.linearRampToValueAtTime(95 * o.p, t + 0.35);
    lfo.frequency.value = 22;
    lg.gain.value = 9;
    lfo.connect(lg).connect(s.frequency);
    f.type = "lowpass";
    f.frequency.value = 700;
    s.connect(f).connect(env(o, 0.16, 0, 0.08, 0.42));
    s.start(t);
    lfo.start(t);
    track(s, t + 0.45);
    track(lfo, t + 0.45);
  },
  enemyRush: (o) => swish(o, 220, 1400, 0, 0.32, 0.36, 0.8),
  enemySweep: (o) => swish(o, 2400, 500, 0, 0.36, 0.3, 1.1),
  enemyRise: (o) => { tone(o, "sine", 300, 1200, 0, 0.42, 0.06); swish(o, 400, 2400, 0, 0.42, 0.18); },
  enemyDive: (o) => { tone(o, "sine", 1400, 260, 0, 0.42, 0.07); swish(o, 3000, 500, 0, 0.42, 0.2); },
  enemyVolley: (o, x) => Array.from({ length: Math.min(5, Math.max(2, x.index || 3)) }).forEach((_, i) => { noise(o, "bandpass", 1600, 700, i * 0.08, 0.08, 0.2, 3); tone(o, "square", 500 - i * 30, 300, i * 0.08, 0.07, 0.03); }),
  enemyOrbit: (o) => {
    const s = o.c.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = o.c.createBiquadFilter();
    const lfo = o.c.createOscillator();
    const lg = o.c.createGain();
    const t = o.t0;
    f.type = "bandpass";
    f.Q.value = 3;
    f.frequency.value = 1200;
    lfo.frequency.value = 9;
    lg.gain.value = 700;
    lfo.connect(lg).connect(f.frequency);
    s.connect(f).connect(env(o, 0.22, 0, 0.1, 0.46));
    s.start(t);
    lfo.start(t);
    track(s, t + 0.5);
    track(lfo, t + 0.5);
  },
  enemyBeam: (o) => { tone(o, "sawtooth", 1300, 320, 0, 0.3, 0.06); tone(o, "square", 1950, 480, 0, 0.3, 0.025); noise(o, "highpass", 5000, 2500, 0, 0.3, 0.1); },
  enemySnare: (o) => { swish(o, 900, 4200, 0, 0.16, 0.24, 2); noise(o, "highpass", 4000, 2500, 0.15, 0.04, 0.3); },
  enemyQuake: (o) => { noise(o, "lowpass", 220, 60, 0, 0.6, 0.45, 0.7, 0.06); tone(o, "sine", 48, 38, 0, 0.6, 0.3, 0.05); },
  enemyBlink: (o) => { tone(o, "sine", 1800, 300, 0, 0.09, 0.09); tone(o, "sine", 300, 1800, 0.18, 0.09, 0.09); },
  enemySummon: (o) => chord(o, [392, 523, 659, 880], 0, 0.3, 0.05, "sine", 0.07),
  enemyVortex: (o) => { swish(o, 200, 3000, 0, 0.5, 0.3, 2); tone(o, "sine", 160, 640, 0, 0.5, 0.06); },
  enemyImpact: (o, x) => { const heavy = (x.intensity || 1) > 1; thud(o, heavy ? 90 : 130, 0, heavy ? 0.4 : 0.24, heavy ? 0.7 : 0.5); noise(o, "bandpass", 1100, 300, 0, 0.14, 0.24, 1.5); },
  block: (o) => { metal(o, 880, 0, 0.5, 0.1); noise(o, "highpass", 6000, 3500, 0, 0.12, 0.2); tone(o, "triangle", 330, 660, 0, 0.25, 0.08); },

  // ---- boss gate ----
  sealBreak: (o) => {
    Array.from({ length: 9 }).forEach((_, i) => noise(o, "bandpass", 3000 + Math.random() * 5000, 2000, i * 0.025 + Math.random() * 0.02, 0.07, 0.14, 8));
    thud(o, 80, 0, 0.5, 0.55);
    chord(o, [523, 784, 1047], 0.06, 0.6, 0.05, "sine");
  },
  chamberOpen: (o) => { noise(o, "lowpass", 160, 70, 0, 1.2, 0.3, 0.7, 0.35); tone(o, "sine", 65, 55, 0, 1.2, 0.22, 0.4); chord(o, [196, 294, 392], 0.4, 1, 0.05, "triangle"); },

  // ---- learning: soft and short so study sessions stay calm ----
  learnRight: (o) => { tone(o, "sine", 660, null, 0, 0.16, 0.12, 0.004); tone(o, "sine", 990, null, 0.07, 0.24, 0.1, 0.004); },
  learnWrong: (o) => tone(o, "sine", 246, 220, 0, 0.2, 0.1, 0.01),
  milestone: (o) => chord(o, [523, 659, 784, 1047], 0, 0.35, 0.09, "sine", 0.09),
};

// Quieter categories: learning sounds sit well under combat.
const LEVEL: Partial<Record<Sfx, number>> = { learnRight: 0.7, learnWrong: 0.7, milestone: 0.7, click: 0.8 };

let lastAt = new Map<Sfx, number>();

export function play(name: Sfx, opts: PlayOpts = {}) {
  if (isMuted()) return;
  const c = audio();
  if (!c || !bus || c.state === "closed") return;
  // Drop exact duplicates fired in the same instant and cap total voices.
  const now = c.currentTime;
  if ((lastAt.get(name) ?? -1) > now - 0.025) return;
  lastAt.set(name, now);
  if (live.size > MAX_VOICES) return;
  let dest: AudioNode = bus;
  if (opts.pan && typeof c.createStereoPanner === "function") {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, opts.pan));
    p.connect(bus);
    dest = p;
  }
  try {
    SOUNDS[name]({ c, dest, t0: now + 0.005, p: jitter(0.04), gain: (LEVEL[name] ?? 1) * jitter(0.08) * (opts.intensity ?? 1) }, opts);
  } catch {
    // A failed sound must never break the game.
  }
  try {
    if (localStorage.getItem("cw.debug") === "1") {
      const w = window as unknown as { __sfxLog?: { name: string; t: number; pan?: number; index?: number }[] };
      (w.__sfxLog ||= []).push({ name, t: performance.now(), pan: opts.pan, index: opts.index });
    }
  } catch {}
}

// Fades out and stops everything, e.g. when leaving a battle.
export function stopAll() {
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  for (const s of live) {
    try {
      s.stop(t + 0.06);
    } catch {}
  }
  live.clear();
  lastAt = new Map();
}
