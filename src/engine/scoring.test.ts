import { describe, expect, it } from 'vitest';
import { beginScoring } from './scoring';
import { Card, GameState, PendingAction } from './types';

function card(partial: Partial<Card> & { kind: Card['kind'] }): Card {
  return partial as Card;
}

function baseState(players: GameState['players']): GameState {
  return {
    phase: 'auction',
    players,
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 5, chart: 2, data: 3, artifact: 4 },
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 4,
    pendingAction: { type: 'scoring' } as PendingAction,
    log: [],
  };
}

describe('beginScoring', () => {
  it('awards each category to the player with the highest total', () => {
    const state = baseState([
      {
        id: 'p1',
        name: 'Bob',
        isAI: false,
        hand: [
          card({ id: 'c1', kind: 'category', category: 'crew', value: 4, tieBreakLetter: 'C' }),
          card({ id: 'c2', kind: 'category', category: 'crew', value: 3, tieBreakLetter: 'A' }),
          card({ id: 'c3', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'E' }),
        ],
      },
      {
        id: 'p2',
        name: 'Steve',
        isAI: false,
        hand: [
          card({ id: 'c4', kind: 'category', category: 'crew', value: 4, tieBreakLetter: 'B' }),
          card({ id: 'c5', kind: 'category', category: 'crew', value: 3, tieBreakLetter: 'D' }),
          card({ id: 'c6', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'F' }),
        ],
      },
    ]);

    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    const crewResult = result.pendingAction.result.categoryResults.find((r) => r.category === 'crew')!;
    expect(crewResult.totals).toEqual({ p1: 9, p2: 9 });
    // Tied at 9: Steve has the 'B' card, Bob's best is 'A' -- Bob wins (closer to A).
    expect(crewResult.winnerId).toBe('p1');
    expect(crewResult.tieBreakUsed).toBe(true);
    expect(crewResult.pointsAwarded).toBe(5);
  });

  it('leaves a category unwon when nobody holds any cards in it', () => {
    const state = baseState([
      { id: 'p1', name: 'Bob', isAI: false, hand: [] },
      { id: 'p2', name: 'Steve', isAI: false, hand: [] },
    ]);
    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    for (const catResult of result.pendingAction.result.categoryResults) {
      expect(catResult.winnerId).toBeNull();
      expect(catResult.pointsAwarded).toBe(0);
    }
  });

  it('breaks a full-game tie by total Credits value in hand', () => {
    const state = baseState([
      {
        id: 'p1',
        name: 'Bob',
        isAI: false,
        hand: [
          card({ id: 'c1', kind: 'category', category: 'crew', value: 9, tieBreakLetter: 'A' }),
          card({ id: 'g1', kind: 'credits', value: 3 }),
        ],
      },
      {
        id: 'p2',
        name: 'Steve',
        isAI: false,
        hand: [
          card({ id: 'c2', kind: 'category', category: 'fuel', value: 9, tieBreakLetter: 'A' }),
          card({ id: 'g2', kind: 'credits', value: 1 }),
        ],
      },
    ]);
    // Bob wins crew (die 5), Steve wins fuel (die 3) -- tied at their respective single dice
    // only if those two dice are equal. Force equal dice for this test.
    state.dice.crew = 4;
    state.dice.fuel = 4;
    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    expect(result.pendingAction.result.diceTotals).toEqual({ p1: 4, p2: 4 });
    expect(result.pendingAction.result.winnerId).toBe('p1');
    expect(result.pendingAction.result.tieBreakStage).toBe('credits');
  });
});
