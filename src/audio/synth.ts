export interface Tone {
  /** Frequency in Hz. */
  freq: number;
  /** Seconds from playback start. */
  start: number;
  /** Seconds the tone rings for. */
  duration: number;
  type?: OscillatorType;
  /** Relative peak volume, 0-1. */
  gain?: number;
}

const MASTER_GAIN = 0.22;

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === 'suspended') void sharedContext.resume();
  return sharedContext;
}

/** Schedules a short sequence of oscillator tones with a click-free envelope. */
export function playTones(tones: Tone[]): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.value = tone.freq;

    const start = now + tone.start;
    const end = start + tone.duration;
    const peak = (tone.gain ?? 1) * MASTER_GAIN;

    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(peak, start + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gainNode).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
