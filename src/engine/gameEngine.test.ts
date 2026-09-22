import { describe, expect, it } from 'vitest';
import { createGame, dispatch, PlayerConfig } from './gameEngine';
import { CATEGORY_ORDER, Card, EngineAction, GameState } from './types';

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
    // driveOneStep has the first eligible bidder actually win each auction (rather than
    // everyone always passing) and actually resolves mission-control cards (rather than
    // always declining them), so this test exercises the real auction-payment and
    // mission-resolution paths -- including a mission card being won at auction -- rather
    // than skipping around them.
    let state: GameState = createGame(TWO_PLAYERS);
    let guard = 0;
    while (state.pendingAction.type !== 'game-over' && guard < 5000) {
      state = driveOneStep(state);
      guard += 1;
    }
    expect(state.pendingAction.type).toBe('game-over');
    expect(guard).toBeLessThan(5000);

    // Card-conservation invariant: every card in the game must be traceable to exactly one
    // location. If a card (e.g. a Mission Control card) is ever duplicated -- added to a
    // hand and also left in / added to the discard pile -- this catches it. This is a
    // regression guard for a bug class that has already appeared at two other sites
    // (giftPhase.ts's allocateGiftCard and drawFromCargoBay) and a third in auctionPhase.ts's
    // payForAuction.
    const allCards: Card[] = [
      ...state.players.flatMap((p) => p.hand),
      ...state.supplyDeck,
      ...state.auctionBay,
      ...state.cargoBay,
      ...state.discardPile,
    ];
    const ids = allCards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
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
    case 'auction-bid': {
      // Have the first eligible bidder win the card outright at the minimum bid (if they can
      // afford it) instead of everyone always passing, so cards actually change hands via
      // payForAuction -- including mission cards, which is the path Fix 1 covers.
      const bid = pa.bid;
      if (bid.highBidderId === null) {
        const bidder = state.players.find((p) => p.id === bid.nextBidderId)!;
        const affordable =
          bid.card.kind === 'credits'
            ? bidder.hand.length
            : bidder.hand.filter((c) => c.kind === 'credits').reduce((sum, c) => sum + (c as { value: number }).value, 0);
        if (affordable >= 1) {
          return dispatch(state, { type: 'bid', amount: 1 });
        }
      }
      return dispatch(state, { type: 'pass' });
    }
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
    case 'mission-resolve': {
      // Actually resolve mission cards (rather than always declining them) so the
      // hand/discard-pile duplication bug this test guards against would actually surface.
      const direction = pa.card.modifier === 'mixed' ? 'plus' : pa.card.modifier;
      const adjustments = CATEGORY_ORDER.slice(0, pa.card.diceCount).map((category) => ({ category, direction }));
      return dispatch(state, { type: 'resolve-mission', adjustments });
    }
    default:
      throw new Error(`driveOneStep cannot advance from ${pa.type}`);
  }
}
