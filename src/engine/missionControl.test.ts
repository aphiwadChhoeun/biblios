import { describe, expect, it } from 'vitest';
import { declineMissionCard, resolveMissionCard } from './missionControl';
import { GameState, MissionCard } from './types';

function baseState(card: MissionCard, dice: GameState['dice']): GameState {
  return {
    phase: 'gift',
    players: [{ id: 'p1', name: 'Bob', isAI: false, hand: [] }],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice,
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 3,
    pendingAction: { type: 'mission-resolve', playerId: 'p1', card, resumeAfter: 'gift-allocate' },
    log: [],
  };
}

describe('resolveMissionCard', () => {
  it('increases one die by 1 for a one-die +1 card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    expect(result.dice.crew).toBe(4);
    expect(result.discardPile).toEqual([card]);
  });

  it('clamps a die at 6 when increasing past the maximum', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 6, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    expect(result.dice.crew).toBe(6);
  });

  it('clamps a die at 1 when decreasing past the minimum', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'minus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 1, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }]);
    expect(result.dice.crew).toBe(1);
  });

  it('adjusts two distinct categories for a two-dice card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 2 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [
      { category: 'crew', direction: 'plus' },
      { category: 'fuel', direction: 'plus' },
    ]);
    expect(result.dice.crew).toBe(4);
    expect(result.dice.fuel).toBe(4);
  });

  it('rejects adjusting the same category twice on a two-dice card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 2 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(() =>
      resolveMissionCard(state, [
        { category: 'crew', direction: 'plus' },
        { category: 'crew', direction: 'plus' },
      ])
    ).toThrow();
  });

  it('allows either direction on a mixed card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'mixed', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }]);
    expect(result.dice.crew).toBe(2);
  });

  it('rejects a direction the card does not allow', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(() => resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }])).toThrow();
  });
});

describe('declineMissionCard', () => {
  it('discards the card with no dice effect', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = declineMissionCard(state);
    expect(result.dice).toEqual(state.dice);
    expect(result.discardPile).toEqual([card]);
  });
});
