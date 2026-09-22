import { describe, expect, it } from 'vitest';
import { allocateGiftCard, continueGiftAfterMission, drawFromCargoBay, startGiftTurn } from './giftPhase';
import { declineMissionCard, resolveMissionCard } from './missionControl';
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

  it('does not interrupt when a mission card is routed to the auction bay', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'auction');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });

  it('does not interrupt when a mission card is routed to the cargo bay during allocation', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'cargo');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });

  it('pauses for resolution when a mission card is drafted from the Cargo Bay', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'cargo'); // mission -> cargo (no interrupt)
    state = allocateGiftCard(state, 'self'); // card2 -> self
    state = allocateGiftCard(state, 'auction'); // card3 -> auction
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    // Draft: James (p2) is first to draw and picks up the mission card.
    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p2' });
    expect(state.cargoBay.map((c) => c.id)).toEqual(['m1', 'c4']);
    state = drawFromCargoBay(state, 'm1');

    expect(state.pendingAction).toEqual({
      type: 'mission-resolve',
      playerId: 'p2',
      card: mission,
      resumeAfter: 'gift-draft',
    });
  });

  it('does not duplicate a Cargo-Bay-drafted mission card into the hand after it is discarded (declined)', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'cargo'); // mission -> cargo (no interrupt)
    state = allocateGiftCard(state, 'self'); // card2 -> self
    state = allocateGiftCard(state, 'auction'); // card3 -> auction
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    state = drawFromCargoBay(state, 'm1'); // James drafts the mission card -> interrupt
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = declineMissionCard(state); // discards the mission card, no dice effect
    state = continueGiftAfterMission(state, 'gift-draft');

    state = drawFromCargoBay(state, state.cargoBay[0].id); // Steve drafts the remaining card

    const james = state.players.find((p) => p.id === 'p2')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(james.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });

  it('does not duplicate a Cargo-Bay-drafted mission card into the hand after it is resolved', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'cargo'); // mission -> cargo (no interrupt)
    state = allocateGiftCard(state, 'self'); // card2 -> self
    state = allocateGiftCard(state, 'auction'); // card3 -> auction
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    state = drawFromCargoBay(state, 'm1'); // James drafts the mission card -> interrupt
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    state = continueGiftAfterMission(state, 'gift-draft');

    state = drawFromCargoBay(state, state.cargoBay[0].id); // Steve drafts the remaining card

    const james = state.players.find((p) => p.id === 'p2')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(james.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });

  it('continueGiftAfterMission resumes the allocation loop after a self-kept mission card', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = continueGiftAfterMission(state, 'gift-allocate');
    expect(state.pendingAction).toMatchObject({
      type: 'gift-allocate',
      playerId: 'p1',
      drawnCard: deck[1],
      selfFilled: true,
      auctionFilled: false,
    });
  });

  it('continueGiftAfterMission resumes the draft queue after a drafted mission card', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'cargo'); // mission -> cargo (no interrupt)
    state = allocateGiftCard(state, 'self'); // card2 -> self
    state = allocateGiftCard(state, 'auction'); // card3 -> auction
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    state = drawFromCargoBay(state, 'm1'); // James drafts the mission card -> interrupt
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = continueGiftAfterMission(state, 'gift-draft');
    // Steve is next in the draft queue; the mission card is already out of the Cargo Bay,
    // and card4 is still there for Steve to take.
    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p3' });
    expect(state.cargoBay.map((c) => c.id)).toEqual(['c4']);
  });

  it('does not duplicate a self-kept mission card into the hand after it is discarded (declined)', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self'); // mission -> self, interrupts
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = declineMissionCard(state); // discards the mission card, no dice effect
    state = continueGiftAfterMission(state, 'gift-allocate');

    state = allocateGiftCard(state, 'auction'); // card2 -> auction
    state = allocateGiftCard(state, 'cargo'); // card3 -> cargo
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    state = drawFromCargoBay(state, state.cargoBay[0].id); // James drafts
    state = drawFromCargoBay(state, state.cargoBay[0].id); // Steve drafts

    const bob = state.players.find((p) => p.id === 'p1')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(bob.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });

  it('does not duplicate a self-kept mission card into the hand after it is resolved', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self'); // mission -> self, interrupts
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    state = continueGiftAfterMission(state, 'gift-allocate');

    state = allocateGiftCard(state, 'auction'); // card2 -> auction
    state = allocateGiftCard(state, 'cargo'); // card3 -> cargo
    state = allocateGiftCard(state, 'cargo'); // card4 -> forced cargo

    state = drawFromCargoBay(state, state.cargoBay[0].id); // James drafts
    state = drawFromCargoBay(state, state.cargoBay[0].id); // Steve drafts

    const bob = state.players.find((p) => p.id === 'p1')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(bob.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });
});

describe('enforces mandatory self/auction slots', () => {
  function twoPlayerState(supplyDeck: Card[], giftCardsPerTurn: number): GameState {
    return {
      phase: 'gift',
      players: [makePlayer('p1', 'Bob'), makePlayer('p2', 'James')],
      activePlayerIndex: 0,
      firstPlayerIndex: 0,
      dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
      supplyDeck,
      auctionBay: [],
      cargoBay: [],
      discardPile: [],
      giftTurn: null,
      giftDraftQueue: [],
      giftCardsPerTurn,
      pendingAction: { type: 'scoring' },
      log: [],
    };
  }

  it('throws when routing a card to cargo would strand a still-unfilled mandatory slot', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3)];
    let state = startGiftTurn(twoPlayerState(deck, 3));

    // Card 1: 2 draws remain after this one (cards 2 and 3), and self+auction are both
    // still unfilled -- exactly enough room, so cargo is still allowed here.
    state = allocateGiftCard(state, 'cargo');

    // Card 2: only 1 draw remains after this one (card 3), but self+auction are both
    // still unfilled -- routing this one to cargo too would make it impossible to still
    // fill both mandatory slots, so it must throw.
    expect(() => allocateGiftCard(state, 'cargo')).toThrow();
  });

  it('still allows cargo once enough draws remain to cover the still-unfilled mandatory slots', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(twoPlayerState(deck, 4));

    state = allocateGiftCard(state, 'self'); // card1 -> self (1 of 2 mandatory slots filled)
    // Card 2: 2 draws remain after this one (cards 3 and 4), and only auction is still
    // unfilled -- more than enough room, so cargo is fine here.
    state = allocateGiftCard(state, 'cargo');
    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[2] });
  });
});
