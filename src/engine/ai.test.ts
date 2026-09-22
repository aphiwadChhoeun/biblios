import { describe, expect, it } from 'vitest';
import { advanceAI, isAITurn, runAIUntilHumanTurn } from './ai';
import { createGame, PlayerConfig } from './gameEngine';
import { GameState } from './types';

const ALL_AI: PlayerConfig[] = [
  { name: 'Bot 1', isAI: true },
  { name: 'Bot 2', isAI: true },
];

const MIXED: PlayerConfig[] = [
  { name: 'Human', isAI: false },
  { name: 'Bot', isAI: true },
];

describe('isAITurn', () => {
  it('is true when the active gift-allocate player is AI', () => {
    const state = createGame(ALL_AI);
    expect(isAITurn(state)).toBe(true);
  });

  it('is false when the active gift-allocate player is human', () => {
    const state = createGame(MIXED);
    expect(isAITurn(state)).toBe(false);
  });
});

describe('advanceAI', () => {
  it('does nothing when it is not an AI turn', () => {
    const state = createGame(MIXED);
    // player-0 is human and active first, so advanceAI should not change anything.
    const result = advanceAI(state);
    expect(result).toBe(state);
  });
});

describe('runAIUntilHumanTurn', () => {
  it('plays an entire all-AI game to completion without throwing', () => {
    const state = createGame(ALL_AI);
    const result: GameState = runAIUntilHumanTurn(state);
    expect(result.pendingAction.type).toBe('game-over');
  });
});
