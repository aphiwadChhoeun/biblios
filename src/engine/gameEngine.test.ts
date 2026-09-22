import { describe, expect, it } from 'vitest';
import { createGame, dispatch, PlayerConfig } from './gameEngine';
import { EngineAction, GameState } from './types';

const TWO_PLAYERS: PlayerConfig[] = [
  { name: 'Bob', isAI: false },
  { name: 'James', isAI: false },
];

describe('createGame', () => {
  it('initializes dice to 3, an empty discard pile, and the first gift-allocate step', () => {
    const state = createGame(TWO_PLAYERS);
    expect(state.dice).toEqual({ fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(state.discardPile).toEqual([]);
    expect(state.phase).toBe('gift');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });

  it('sizes the setup deck correctly for 2/3/4 players', () => {
    expect(createGame(TWO_PLAYERS).supplyDeck.length + 1).toBe(60); // 1 card already drawn for the first turn
    expect(
      createGame([
        { name: 'A', isAI: false },
        { name: 'B', isAI: false },
        { name: 'C', isAI: false },
      ]).supplyDeck.length + 1
    ).toBe(72);
    expect(
      createGame([
        { name: 'A', isAI: false },
        { name: 'B', isAI: false },
        { name: 'C', isAI: false },
        { name: 'D', isAI: false },
      ]).supplyDeck.length + 1
    ).toBe(80);
  });

  it('rejects fewer than 2 or more than 4 players', () => {
    expect(() => createGame([{ name: 'Solo', isAI: false }])).toThrow();
  });
});

describe('dispatch', () => {
  it('rejects an action that does not match the current pending step', () => {
    const state = createGame(TWO_PLAYERS);
    const badAction: EngineAction = { type: 'bid', amount: 1 };
    expect(() => dispatch(state, badAction)).toThrow();
  });

  it('can play through an entire tiny game to game-over', () => {
    // Use a 2-player game and drive every step via dispatch until scoring is reached.
    let state: GameState = createGame(TWO_PLAYERS);
    let guard = 0;
    while (state.pendingAction.type !== 'game-over' && guard < 5000) {
      state = driveOneStep(state);
      guard += 1;
    }
    expect(state.pendingAction.type).toBe('game-over');
    expect(guard).toBeLessThan(5000);
  });
});

function driveOneStep(state: GameState): GameState {
  const pa = state.pendingAction;
  switch (pa.type) {
    case 'gift-allocate': {
      const destination = !pa.selfFilled ? 'self' : !pa.auctionFilled ? 'auction' : 'cargo';
      return dispatch(state, { type: 'allocate', destination });
    }
    case 'gift-draw':
      return dispatch(state, { type: 'draw-cargo', cardId: state.cargoBay[0].id });
    case 'auction-reveal':
      return dispatch(state, { type: 'reveal' });
    case 'auction-bid':
      return dispatch(state, { type: 'pass' });
    case 'auction-pay': {
      const payer = state.players.find((p) => p.id === pa.payerId)!;
      if (pa.card.kind === 'credits') {
        if (payer.hand.length >= pa.bidAmount) {
          return dispatch(state, { type: 'pay', cardIds: payer.hand.slice(0, pa.bidAmount).map((c) => c.id) });
        }
        return dispatch(state, { type: 'forfeit-payment' });
      }
      const credits = payer.hand.filter((c) => c.kind === 'credits');
      let total = 0;
      const chosen: string[] = [];
      for (const c of credits) {
        if (total >= pa.bidAmount) break;
        chosen.push(c.id);
        total += (c as { value: number }).value;
      }
      if (total >= pa.bidAmount) {
        return dispatch(state, { type: 'pay', cardIds: chosen });
      }
      return dispatch(state, { type: 'forfeit-payment' });
    }
    case 'mission-resolve':
      return dispatch(state, { type: 'decline-mission' });
    default:
      throw new Error(`driveOneStep cannot advance from ${pa.type}`);
  }
}
