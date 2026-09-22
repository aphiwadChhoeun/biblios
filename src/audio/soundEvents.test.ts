import { describe, expect, it } from 'vitest';
import { detectSoundEvent } from './soundEvents';
import { Card, GameState } from '../engine/types';

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

const cardA: Card = { id: 'a', kind: 'category', category: 'fuel', value: 1, tieBreakLetter: 'A' };
const cardB: Card = { id: 'b', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'B' };
const missionCard: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };

describe('detectSoundEvent', () => {
  it('returns null when nothing relevant changed', () => {
    const state = baseState({
      pendingAction: {
        type: 'gift-allocate',
        playerId: 'p1',
        drawnCard: cardA,
        selfFilled: false,
        auctionFilled: false,
        cargoAllowed: true,
      },
    });
    expect(detectSoundEvent(state, state)).toBeNull();
  });

  it('detects a draw when a fresh Supply Deck card is presented for allocation', () => {
    const prev = baseState({
      pendingAction: {
        type: 'gift-allocate',
        playerId: 'p1',
        drawnCard: cardA,
        selfFilled: false,
        auctionFilled: false,
        cargoAllowed: true,
      },
    });
    const next = baseState({
      pendingAction: {
        type: 'gift-allocate',
        playerId: 'p1',
        drawnCard: cardB,
        selfFilled: true,
        auctionFilled: false,
        cargoAllowed: true,
      },
    });
    expect(detectSoundEvent(prev, next)).toBe('draw');
  });

  it('detects a draw the first time gift-allocate appears', () => {
    const prev = baseState({ pendingAction: { type: 'scoring' } });
    const next = baseState({
      pendingAction: {
        type: 'gift-allocate',
        playerId: 'p1',
        drawnCard: cardA,
        selfFilled: false,
        auctionFilled: false,
        cargoAllowed: true,
      },
    });
    expect(detectSoundEvent(prev, next)).toBe('draw');
  });

  it('detects a draw when a card is drafted out of the Cargo Bay', () => {
    const prev = baseState({ pendingAction: { type: 'gift-draw', playerId: 'p1' } });
    const next = baseState({ pendingAction: { type: 'gift-draw', playerId: 'p2' } });
    expect(detectSoundEvent(prev, next)).toBe('draw');
  });

  it('detects a bid when the high bid increases', () => {
    const prev = baseState({
      phase: 'auction',
      pendingAction: {
        type: 'auction-bid',
        bid: { card: cardA, highBid: 1, highBidderId: 'p1', passedIds: [], nextBidderId: 'p2' },
      },
    });
    const next = baseState({
      phase: 'auction',
      pendingAction: {
        type: 'auction-bid',
        bid: { card: cardA, highBid: 2, highBidderId: 'p2', passedIds: [], nextBidderId: 'p3' },
      },
    });
    expect(detectSoundEvent(prev, next)).toBe('bid');
  });

  it('does not play a bid sound on a pass', () => {
    const prev = baseState({
      phase: 'auction',
      pendingAction: {
        type: 'auction-bid',
        bid: { card: cardA, highBid: 1, highBidderId: 'p1', passedIds: [], nextBidderId: 'p2' },
      },
    });
    const next = baseState({
      phase: 'auction',
      pendingAction: {
        type: 'auction-bid',
        bid: { card: cardA, highBid: 1, highBidderId: 'p1', passedIds: ['p2'], nextBidderId: 'p3' },
      },
    });
    expect(detectSoundEvent(prev, next)).toBeNull();
  });

  it('detects an auction win when payment begins', () => {
    const prev = baseState({
      phase: 'auction',
      pendingAction: {
        type: 'auction-bid',
        bid: { card: cardA, highBid: 4, highBidderId: 'p2', passedIds: ['p1', 'p3'], nextBidderId: 'p1' },
      },
    });
    const next = baseState({
      phase: 'auction',
      pendingAction: { type: 'auction-pay', card: cardA, payerId: 'p2', bidAmount: 4 },
    });
    expect(detectSoundEvent(prev, next)).toBe('auction-win');
  });

  it('detects a mission alert when a Mission Control card interrupts play', () => {
    const prev = baseState({
      pendingAction: {
        type: 'gift-allocate',
        playerId: 'p1',
        drawnCard: missionCard,
        selfFilled: false,
        auctionFilled: false,
        cargoAllowed: true,
      },
    });
    const next = baseState({
      pendingAction: { type: 'mission-resolve', playerId: 'p1', card: missionCard, resumeAfter: 'gift-allocate' },
    });
    expect(detectSoundEvent(prev, next)).toBe('mission-alert');
  });

  it('prioritizes the mission alert over a draw sound when both would fire', () => {
    const prev = baseState({ pendingAction: { type: 'gift-draw', playerId: 'p1' } });
    const next = baseState({
      pendingAction: { type: 'mission-resolve', playerId: 'p1', card: missionCard, resumeAfter: 'gift-draft' },
    });
    expect(detectSoundEvent(prev, next)).toBe('mission-alert');
  });

  it('detects game over when scoring finishes', () => {
    const prev = baseState({ phase: 'auction', pendingAction: { type: 'auction-reveal', playerId: 'p1' } });
    const next = baseState({
      phase: 'scoring',
      pendingAction: {
        type: 'game-over',
        result: {
          categoryResults: [],
          diceTotals: {},
          winnerId: 'p1',
          tieBreakStage: 'none',
        },
      },
    });
    expect(detectSoundEvent(prev, next)).toBe('game-over');
  });
});
