import { beforeEach, describe, expect, it } from 'vitest';
import { clearSavedGame, loadGame, saveGame } from './storage';
import { createGame } from './gameEngine';

beforeEach(() => {
  localStorage.clear();
});

describe('saveGame / loadGame / clearSavedGame', () => {
  it('round-trips a full GameState through localStorage', () => {
    const state = createGame([
      { name: 'Bob', isAI: false },
      { name: 'James', isAI: true },
    ]);
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).toEqual(state);
  });

  it('returns null when there is no saved game', () => {
    expect(loadGame()).toBeNull();
  });

  it('removes the saved game on clearSavedGame', () => {
    const state = createGame([
      { name: 'Bob', isAI: false },
      { name: 'James', isAI: true },
    ]);
    saveGame(state);
    clearSavedGame();
    expect(loadGame()).toBeNull();
  });
});
