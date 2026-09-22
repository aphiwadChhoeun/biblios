import { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeMuted } from '../audio/muteStore';

export default function MuteToggle() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted);

  return (
    <button
      type="button"
      className="mute-toggle"
      onClick={() => setMuted(!muted)}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
