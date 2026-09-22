import { SoundKey } from './soundEvents';
import { Tone } from './synth';

// Short procedural cues for the console theme: a card-flip tick, a bid click,
// a rising confirm chime, a two-tone alert klaxon, and a fuller victory fanfare.
export const SOUND_TONES: Record<SoundKey, Tone[]> = {
  draw: [{ freq: 660, start: 0, duration: 0.09, type: 'triangle', gain: 0.8 }],
  bid: [{ freq: 920, start: 0, duration: 0.045, type: 'square', gain: 0.45 }],
  'auction-win': [
    { freq: 523.25, start: 0, duration: 0.12, type: 'triangle', gain: 0.8 },
    { freq: 659.25, start: 0.1, duration: 0.12, type: 'triangle', gain: 0.8 },
    { freq: 783.99, start: 0.2, duration: 0.24, type: 'triangle', gain: 0.9 },
  ],
  'mission-alert': [
    { freq: 440, start: 0, duration: 0.1, type: 'square', gain: 0.6 },
    { freq: 440, start: 0.16, duration: 0.1, type: 'square', gain: 0.6 },
  ],
  'game-over': [
    { freq: 523.25, start: 0, duration: 0.15, type: 'triangle', gain: 0.75 },
    { freq: 659.25, start: 0.13, duration: 0.15, type: 'triangle', gain: 0.75 },
    { freq: 783.99, start: 0.26, duration: 0.15, type: 'triangle', gain: 0.8 },
    { freq: 1046.5, start: 0.39, duration: 0.4, type: 'triangle', gain: 0.9 },
  ],
};
