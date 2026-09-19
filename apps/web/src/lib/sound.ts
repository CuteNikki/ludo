/**
 * Sound effects, synthesized with the Web Audio API: no audio files to download or license, and every
 * sound is a few lines of oscillators and noise. Nothing here touches React; `SoundProvider` wires the
 * on/off setting and the UI-wide hover and click sounds, and the room plays game sounds through it.
 */

export type SoundName =
  | 'hover'
  | 'click'
  | 'preview'
  | 'roll'
  | 'land'
  | 'six'
  | 'yourTurn'
  | 'turn'
  | 'move'
  | 'capture'
  | 'spawn'
  | 'invalid'
  | 'start'
  | 'win'
  | 'lose'
  | 'tick'
  | 'join'
  | 'leave'
  | 'ready';

const MASTER_VOLUME = 0.55;

let context: AudioContext | null = null;
let output: AudioNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;

/** Minimum gap between two plays of the same sound, so a fast mouse sweep doesn't turn into a buzz. */
const COOLDOWN_MS: Partial<Record<SoundName, number>> = { hover: 50, click: 40, preview: 60, tick: 250 };
const lastPlayed = new Map<SoundName, number>();

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

/** Browsers only allow audio after a user gesture, so the context is created (and resumed) on demand. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    const compressor = context.createDynamicsCompressor();
    const master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(compressor);
    compressor.connect(context.destination);
    output = master;
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function playSound(name: SoundName, delayMs = 0) {
  if (!enabled) return;
  const now = performance.now();
  const cooldown = COOLDOWN_MS[name] ?? 0;
  if (now - (lastPlayed.get(name) ?? -Infinity) < cooldown) return;
  lastPlayed.set(name, now);

  const c = unlockAudio();
  if (!c || !output || c.state === 'closed') return;
  SOUNDS[name](c, output, c.currentTime + 0.005 + delayMs / 1000);
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency over the tone's duration. */
  endFreq?: number | undefined;
  attack?: number;
}

function tone(
  c: AudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  duration: number,
  { type = 'sine', gain = 0.2, endFreq, attack = 0.004 }: ToneOptions = {},
) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + duration);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.03);
}

function noise(
  c: AudioContext,
  out: AudioNode,
  at: number,
  duration: number,
  { freq = 2000, q = 1, gain = 0.15, filter = 'bandpass' as BiquadFilterType } = {},
) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  const biquad = c.createBiquadFilter();
  const env = c.createGain();
  source.buffer = noiseBuffer;
  biquad.type = filter;
  biquad.frequency.value = freq;
  biquad.Q.value = q;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(biquad).connect(env).connect(out);
  source.start(at);
  source.stop(at + duration + 0.03);
}

/** A run of notes, `step` seconds apart. */
function notes(c: AudioContext, out: AudioNode, at: number, freqs: number[], step: number, duration: number, options: ToneOptions = {}) {
  freqs.forEach((freq, index) => tone(c, out, at + index * step, freq, duration, options));
}

type Synth = (c: AudioContext, out: AudioNode, at: number) => void;

const SOUNDS: Record<SoundName, Synth> = {
  // --- interface ---
  hover: (c, out, at) => tone(c, out, at, 1250, 0.035, { type: 'triangle', gain: 0.035 }),
  click: (c, out, at) => {
    tone(c, out, at, 720, 0.08, { type: 'triangle', gain: 0.16, endFreq: 430 });
    noise(c, out, at, 0.02, { freq: 3500, gain: 0.04 });
  },
  preview: (c, out, at) => tone(c, out, at, 880, 0.09, { gain: 0.12, endFreq: 1180 }),

  // --- dice ---
  roll: (c, out, at) => {
    for (let i = 0; i < 9; i += 1) noise(c, out, at + i * 0.075, 0.045, { freq: 1300 + Math.random() * 1900, q: 3, gain: 0.11 });
    tone(c, out, at, 140, 0.6, { type: 'triangle', gain: 0.05, endFreq: 90 });
  },
  land: (c, out, at) => {
    tone(c, out, at, 210, 0.16, { gain: 0.38, endFreq: 80 });
    noise(c, out, at, 0.05, { freq: 1200, q: 0.8, gain: 0.18 });
  },
  six: (c, out, at) => {
    SOUNDS.land(c, out, at);
    notes(c, out, at + 0.12, [659, 784, 988, 1319], 0.07, 0.16, { type: 'triangle', gain: 0.14 });
  },

  // --- turns ---
  yourTurn: (c, out, at) => {
    tone(c, out, at, 784, 0.14, { gain: 0.2 });
    tone(c, out, at + 0.11, 1047, 0.26, { gain: 0.22 });
    tone(c, out, at + 0.11, 1568, 0.2, { type: 'triangle', gain: 0.05 });
  },
  turn: (c, out, at) => tone(c, out, at, 440, 0.09, { gain: 0.07, endFreq: 400 }),
  tick: (c, out, at) => tone(c, out, at, 1200, 0.045, { type: 'square', gain: 0.045 }),

  // --- pieces ---
  move: (c, out, at) => {
    tone(c, out, at, 280, 0.07, { type: 'triangle', gain: 0.26, endFreq: 170 });
    noise(c, out, at, 0.02, { freq: 3000, gain: 0.07 });
  },
  spawn: (c, out, at) => {
    tone(c, out, at, 320, 0.13, { gain: 0.2, endFreq: 780 });
    tone(c, out, at + 0.05, 960, 0.1, { type: 'triangle', gain: 0.06 });
  },
  capture: (c, out, at) => {
    tone(c, out, at, 720, 0.32, { type: 'sawtooth', gain: 0.1, endFreq: 90 });
    noise(c, out, at + 0.02, 0.16, { freq: 800, q: 0.7, gain: 0.26, filter: 'lowpass' });
  },
  invalid: (c, out, at) => {
    tone(c, out, at, 150, 0.1, { type: 'square', gain: 0.08 });
    tone(c, out, at + 0.13, 130, 0.14, { type: 'square', gain: 0.08 });
  },

  // --- the room ---
  start: (c, out, at) => notes(c, out, at, [392, 523, 659], 0.09, 0.16, { type: 'triangle', gain: 0.18 }),
  win: (c, out, at) => {
    notes(c, out, at, [523, 659, 784, 1047], 0.12, 0.2, { type: 'triangle', gain: 0.2 });
    [523, 659, 784, 1047].forEach((freq) => tone(c, out, at + 0.55, freq, 1.1, { type: 'triangle', gain: 0.1 }));
  },
  lose: (c, out, at) => notes(c, out, at, [392, 370, 349, 294], 0.24, 0.42, { type: 'triangle', gain: 0.15 }),
  join: (c, out, at) => notes(c, out, at, [520, 780], 0.075, 0.12, { gain: 0.13 }),
  leave: (c, out, at) => notes(c, out, at, [620, 410], 0.075, 0.12, { gain: 0.11 }),
  ready: (c, out, at) => tone(c, out, at, 1046, 0.18, { gain: 0.12, endFreq: 1568 }),
};
