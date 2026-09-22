import { describe, expect, it } from 'vitest';
import { advanceAI, decideMissionAdjustments, isAITurn, runAIUntilHumanTurn } from './ai';
import { createGame, PlayerConfig } from './gameEngine';
import { Card, GameState, MissionCard } from './types';

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

describe('decideMissionAdjustments', () => {
  it('targets the category where the bot trails (not the one where it leads) on a minus card', () => {
    // Bot clearly leads in fuel (5 vs 0) and clearly trails in crew (0 vs 5). A 'minus' card
    // should attack the category where an opponent leads (crew), not sabotage the bot's own
    // strongest category (fuel).
    const fuelCard: Card = { id: 'f1', kind: 'category', category: 'fuel', value: 5, tieBreakLetter: 'A' };
    const crewCard: Card = { id: 'c1', kind: 'category', category: 'crew', value: 5, tieBreakLetter: 'A' };
    const minusCard: MissionCard = { id: 'm1', kind: 'mission', modifier: 'minus', diceCount: 1 };

    const state: GameState = {
      phase: 'auction',
      players: [
        { id: 'p1', name: 'Bot', isAI: true, hand: [fuelCard] },
        { id: 'p2', name: 'Opponent', isAI: false, hand: [crewCard] },
      ],
      activePlayerIndex: 0,
      firstPlayerIndex: 0,
      dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
      supplyDeck: [],
      auctionBay: [],
      cargoBay: [],
      discardPile: [],
      giftTurn: null,
      giftDraftQueue: [],
      giftCardsPerTurn: 4,
      pendingAction: { type: 'mission-resolve', playerId: 'p1', card: minusCard, resumeAfter: 'auction' },
      log: [],
    };

    const adjustments = decideMissionAdjustments(state, 'p1');
    expect(adjustments).toEqual([{ category: 'crew', direction: 'minus' }]);
  });
});
