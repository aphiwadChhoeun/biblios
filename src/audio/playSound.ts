import { isMuted } from './muteStore';
import { SoundKey } from './soundEvents';
import { SOUND_TONES } from './sounds';
import { playTones } from './synth';

export function playSound(key: SoundKey): void {
  if (isMuted()) return;
  playTones(SOUND_TONES[key]);
}
