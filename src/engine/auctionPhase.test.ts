import { describe, expect, it, vi } from 'vitest';
import { beginAuctionPhase, forfeitPayment, passBid, payForAuction, placeBid, revealTopCard } from './auctionPhase';
import { declineMissionCard, resolveMissionCard } from './missionControl';
import { Card, GameState } from './types';

function makePlayer(id: string, name: string, hand: Card[] = []) {
  return { id, name, isAI: false, hand };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'gift',
    players: [makePlayer('p1', 'Bob'), makePlayer('p2', 'James'), makePlayer('p3', 'Steve')],
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
    pendingAction: { type: 'scoring' },
    log: [],
    ...overrides,
  };
}

describe('beginAuctionPhase + revealTopCard', () => {
  it('moves the shuffled Auction Bay into the Supply Deck and prompts the active player to reveal', () => {
    const artifactCard: Card = { id: 'a1', kind: 'category', category: 'artifact', value: 1, tieBreakLetter: 'A' };
    const state = baseState({ auctionBay: [artifactCard] });
    const result = beginAuctionPhase(state);
    expect(result.phase).toBe('auction');
    expect(result.supplyDeck).toEqual([artifactCard]);
    expect(result.auctionBay).toEqual([]);
    expect(result.pendingAction).toEqual({ type: 'auction-reveal', playerId: 'p1' });
  });

  it('reveals the top card and starts bidding with the player to the active player\'s left', () => {
    const card: Card = { id: 'a1', kind: 'category', category: 'artifact', value: 1, tieBreakLetter: 'A' };
    const state = beginAuctionPhase(baseState({ auctionBay: [card] }));
    const result = revealTopCard(state);
    expect(result.pendingAction).toEqual({
      type: 'auction-bid',
      bid: { card, highBid: 0, highBidderId: null, passedIds: [], nextBidderId: 'p2' },
    });
  });
});

describe('bidding (reproduces the rulebook example)', () => {
  it('James bids 1, Steve passes, Bob bids 3, James bids 4, Bob passes -> James wins at 4', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    let state = revealTopCard(beginAuctionPhase(baseState({ auctionBay: [card] })));

    state = placeBid(state, 1); // James bids 1
    state = passBid(state); // Steve passes
    state = placeBid(state, 3); // Bob bids 3
    state = placeBid(state, 4); // James bids 4
    state = passBid(state); // Bob passes

    expect(state.pendingAction).toEqual({ type: 'auction-pay', card, payerId: 'p2', bidAmount: 4 });
  });

  it('discards the card and moves to the next active player when everyone passes', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    let state = revealTopCard(beginAuctionPhase(baseState({ auctionBay: [card] })));

    state = passBid(state); // James
    state = passBid(state); // Steve
    state = passBid(state); // Bob

    expect(state.discardPile).toEqual([card]);
    expect(state.pendingAction).toEqual({ type: 'auction-reveal', playerId: 'p2' });
  });
});

describe('payment', () => {
  it('lets the winner overpay when they lack exact change for a non-Credits card', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const gold2: Card = { id: 'g2', kind: 'credits', value: 2 };
    const gold3: Card = { id: 'g3', kind: 'credits', value: 3 };
    let state = baseState({
      players: [
        makePlayer('p1', 'Bob'),
        makePlayer('p2', 'James', [gold2, gold3]),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card, payerId: 'p2', bidAmount: 4 },
      phase: 'auction',
    });

    state = payForAuction(state, ['g2', 'g3']);
    const james = state.players.find((p) => p.id === 'p2')!;
    expect(james.hand).toEqual([card]);
    expect(state.discardPile).toEqual([gold2, gold3]);
  });

  it('rejects payment below the bid amount', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const gold1: Card = { id: 'g1', kind: 'credits', value: 1 };
    const state = baseState({
      players: [makePlayer('p1', 'Bob', [gold1])],
      pendingAction: { type: 'auction-pay', card, payerId: 'p1', bidAmount: 4 },
      phase: 'auction',
    });
    expect(() => payForAuction(state, ['g1'])).toThrow();
  });

  it('pays a Credits-card auction with exactly the bid number of any cards', () => {
    const goldCard: Card = { id: 'gold-auction', kind: 'credits', value: 2 };
    const monk: Card = { id: 'm1', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'A' };
    const gold1: Card = { id: 'g1', kind: 'credits', value: 1 };
    const state = baseState({
      players: [makePlayer('p1', 'Bob', [monk, gold1])],
      pendingAction: { type: 'auction-pay', card: goldCard, payerId: 'p1', bidAmount: 2 },
      phase: 'auction',
    });
    const result = payForAuction(state, ['m1', 'g1']);
    const bob = result.players.find((p) => p.id === 'p1')!;
    expect(bob.hand).toEqual([goldCard]);
    expect(result.discardPile).toEqual([monk, gold1]);
  });
});

describe('mission control interrupt at auction', () => {
  it('does not duplicate a mission card won at auction into the hand after it is resolved', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const gold2: Card = { id: 'g2', kind: 'credits', value: 2 };
    let state = baseState({
      players: [
        makePlayer('p1', 'Bob'),
        makePlayer('p2', 'James', [gold2]),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card: mission, payerId: 'p2', bidAmount: 2 },
      phase: 'auction',
    });

    state = payForAuction(state, ['g2']);
    expect(state.pendingAction).toEqual({
      type: 'mission-resolve',
      playerId: 'p2',
      card: mission,
      resumeAfter: 'auction',
    });

    state = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);

    const james = state.players.find((p) => p.id === 'p2')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(james.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });

  it('does not duplicate a mission card won at auction into the hand after it is declined', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const gold2: Card = { id: 'g2', kind: 'credits', value: 2 };
    let state = baseState({
      players: [
        makePlayer('p1', 'Bob'),
        makePlayer('p2', 'James', [gold2]),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card: mission, payerId: 'p2', bidAmount: 2 },
      phase: 'auction',
    });

    state = payForAuction(state, ['g2']);
    expect(state.pendingAction.type).toBe('mission-resolve');

    state = declineMissionCard(state);

    const james = state.players.find((p) => p.id === 'p2')!;
    expect(state.discardPile).toContainEqual(mission);
    expect(james.hand.find((c) => c.id === 'm1')).toBeUndefined();
    expect(state.discardPile.filter((c) => c.id === 'm1')).toHaveLength(1);
  });
});

describe('forfeitPayment', () => {
  it('seizes a random card from the penalized player and re-auctions, excluding them', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const onlyCard: Card = { id: 'only', kind: 'credits', value: 1 };
    const state = baseState({
      players: [
        makePlayer('p1', 'Bob', [onlyCard]),
        makePlayer('p2', 'James'),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card, payerId: 'p1', bidAmount: 5 },
      phase: 'auction',
    });

    const result = forfeitPayment(state);

    const bob = result.players.find((p) => p.id === 'p1')!;
    expect(bob.hand).toEqual([]);
    const otherHands = result.players.filter((p) => p.id !== 'p1').map((p) => p.hand.length);
    expect(otherHands.reduce((a, b) => a + b, 0)).toBe(1);

    expect(result.pendingAction.type).toBe('auction-bid');
    if (result.pendingAction.type === 'auction-bid') {
      expect(result.pendingAction.bid.card).toEqual(card);
      expect(result.pendingAction.bid.passedIds).toEqual(['p1']);
    }
    vi.restoreAllMocks();
  });
});
