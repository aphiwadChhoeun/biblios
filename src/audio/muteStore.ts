const STORAGE_KEY = 'star-manifest-muted-v1';

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let muted = readStoredMuted();
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage unavailable (e.g. private browsing quota) -- setting still applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
