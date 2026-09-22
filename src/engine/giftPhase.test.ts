import { describe, expect, it } from 'vitest';
import { allocateGiftCard, drawFromCargoBay, startGiftTurn } from './giftPhase';
import { Card, GameState } from './types';

function makePlayer(id: string, name: string) {
  return { id, name, isAI: false, hand: [] as Card[] };
}

function cardAt(index: number): Card {
  return { id: `c${index}`, kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'A' };
}

function baseState(supplyDeck: Card[]): GameState {
  return {
    phase: 'gift',
    players: [makePlayer('p1', 'Bob'), makePlayer('p2', 'James'), makePlayer('p3', 'Steve')],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
    supplyDeck,
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 4,
    pendingAction: { type: 'scoring' },
    log: [],
  };
}

describe('reproduces the rulebook example turn (Bob allocates 4 cards in a 3-player game)', () => {
  it('routes cards to self/auction/cargo/cargo and deals them out in left-to-right order', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', playerId: 'p1', drawnCard: deck[0] });
    state = allocateGiftCard(state, 'auction'); // Monk 1 -> auction

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[1] });
    state = allocateGiftCard(state, 'cargo'); // Gold 1 -> public space

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[2] });
    state = allocateGiftCard(state, 'self'); // Monk 2 -> self

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[3], selfFilled: true, auctionFilled: true });
    state = allocateGiftCard(state, 'cargo'); // Gold 2 -> forced to public space

    // Draft: James (left of Bob) takes Gold 2, Steve takes Gold 1.
    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p2' });
    expect(state.cargoBay.map((c) => c.id)).toEqual(['c2', 'c4']);
    state = drawFromCargoBay(state, 'c4');

    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p3' });
    state = drawFromCargoBay(state, 'c2');

    const bob = state.players.find((p) => p.id === 'p1')!;
    const james = state.players.find((p) => p.id === 'p2')!;
    const steve = state.players.find((p) => p.id === 'p3')!;
    expect(bob.hand.map((c) => c.id)).toEqual(['c3']);
    expect(james.hand.map((c) => c.id)).toEqual(['c4']);
    expect(steve.hand.map((c) => c.id)).toEqual(['c2']);
    // The Supply Deck (4 cards) is exactly exhausted by the end of Bob's turn, so the
    // engine correctly hands off to the auction phase here (per beginAuctionPhase's
    // existing, already-tested contract in auctionPhase.ts): the Auction Bay's contents
    // (c1) are moved into the (shuffled) Supply Deck for the auction round, and the
    // Auction Bay itself is cleared.
    expect(state.auctionBay).toEqual([]);
    expect(state.supplyDeck.map((c) => c.id)).toEqual(['c1']);
    expect(state.phase).toBe('auction');
  });
});

describe('turn rotation', () => {
  it('advances to the next player after a turn completes', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3), cardAt(4), cardAt(5)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    state = allocateGiftCard(state, 'auction');
    state = allocateGiftCard(state, 'cargo');
    state = allocateGiftCard(state, 'cargo');
    state = drawFromCargoBay(state, state.cargoBay[0].id);
    state = drawFromCargoBay(state, state.cargoBay[0].id);

    expect(state.activePlayerIndex).toBe(1);
    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', playerId: 'p2' });
  });
});

describe('rejects invalid allocations', () => {
  it('throws when trying to fill the self slot twice', () => {
    const deck = [cardAt(1), cardAt(2)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    expect(() => allocateGiftCard(state, 'self')).toThrow();
  });
});

describe('mission control interrupt', () => {
  it('pauses for resolution when a mission card is kept for self', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    expect(state.pendingAction).toEqual({
      type: 'mission-resolve',
      playerId: 'p1',
      card: mission,
      resumeAfter: 'gift-allocate',
    });
  });

  it('does not interrupt when a mission card is routed to the auction bay or cargo bay', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'auction');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });
});
