import { shuffle } from './deck';
import { beginScoring } from './scoring';
import { BidState, Card, CreditsCard, GameState, Player } from './types';

export function beginAuctionPhase(state: GameState): GameState {
  const shuffledAuctionDeck = shuffle(state.auctionBay);
  const nextState: GameState = {
    ...state,
    phase: 'auction',
    supplyDeck: shuffledAuctionDeck,
    auctionBay: [],
    activePlayerIndex: state.firstPlayerIndex,
    giftTurn: null,
    giftDraftQueue: [],
  };
  return revealNextForActive(nextState);
}

function revealNextForActive(state: GameState): GameState {
  return {
    ...state,
    pendingAction: { type: 'auction-reveal', playerId: state.players[state.activePlayerIndex].id },
  };
}

export function revealTopCard(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-reveal') {
    throw new Error('revealTopCard called outside auction-reveal step');
  }
  if (state.supplyDeck.length === 0) {
    return beginScoring(state);
  }
  const [card, ...rest] = state.supplyDeck;
  const firstBidderIndex = (state.activePlayerIndex + 1) % state.players.length;
  const bid: BidState = {
    card,
    highBid: 0,
    highBidderId: null,
    passedIds: [],
    nextBidderId: state.players[firstBidderIndex].id,
  };
  return { ...state, supplyDeck: rest, pendingAction: { type: 'auction-bid', bid } };
}

function playerIndexOf(state: GameState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function nextClockwise(state: GameState, fromPlayerId: string, excluded: string[]): string | null {
  const n = state.players.length;
  const startIdx = playerIndexOf(state, fromPlayerId);
  for (let offset = 1; offset <= n; offset += 1) {
    const candidate = state.players[(startIdx + offset) % n];
    if (!excluded.includes(candidate.id)) return candidate.id;
  }
  return null;
}

function advanceBidTurn(state: GameState, bid: BidState, actorId: string): GameState {
  const remaining = state.players.map((p) => p.id).filter((id) => !bid.passedIds.includes(id));

  if (bid.highBidderId === null) {
    if (remaining.length === 0) {
      return discardAuctionCard(state, bid.card);
    }
    const next = nextClockwise(state, actorId, bid.passedIds);
    if (next === null) {
      return discardAuctionCard(state, bid.card);
    }
    return { ...state, pendingAction: { type: 'auction-bid', bid: { ...bid, nextBidderId: next } } };
  }

  const stillIn = remaining.filter((id) => id !== bid.highBidderId);
  if (stillIn.length === 0) {
    return beginPayment(state, bid);
  }
  const next = nextClockwise(state, actorId, bid.passedIds)!;
  return { ...state, pendingAction: { type: 'auction-bid', bid: { ...bid, nextBidderId: next } } };
}

export function placeBid(state: GameState, amount: number): GameState {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('placeBid called outside auction-bid step');
  }
  const bid = state.pendingAction.bid;
  if (amount <= bid.highBid) {
    throw new Error(`Bid must exceed current high bid of ${bid.highBid}`);
  }
  const bidderId = bid.nextBidderId;
  const updatedBid: BidState = { ...bid, highBid: amount, highBidderId: bidderId };
  return advanceBidTurn(state, updatedBid, bidderId);
}

export function passBid(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('passBid called outside auction-bid step');
  }
  const bid = state.pendingAction.bid;
  const passingId = bid.nextBidderId;
  const updatedBid: BidState = { ...bid, passedIds: [...bid.passedIds, passingId] };
  return advanceBidTurn(state, updatedBid, passingId);
}

function discardAuctionCard(state: GameState, card: Card): GameState {
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  return revealNextForActive({
    ...state,
    discardPile: [...state.discardPile, card],
    activePlayerIndex: nextActiveIndex,
  });
}

function beginPayment(state: GameState, bid: BidState): GameState {
  return {
    ...state,
    pendingAction: { type: 'auction-pay', card: bid.card, payerId: bid.highBidderId!, bidAmount: bid.highBid },
  };
}

export function payForAuction(state: GameState, cardIds: string[]): GameState {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('payForAuction called outside auction-pay step');
  }
  const { card, payerId, bidAmount } = state.pendingAction;
  const payer = state.players.find((p) => p.id === payerId)!;
  const paymentCards = cardIds.map((id) => {
    const found = payer.hand.find((c) => c.id === id);
    if (!found) throw new Error(`Card ${id} not in ${payerId}'s hand`);
    return found;
  });

  if (card.kind === 'credits') {
    if (paymentCards.length !== bidAmount) {
      throw new Error(`Must pay with exactly ${bidAmount} card(s)`);
    }
  } else {
    if (paymentCards.some((c) => c.kind !== 'credits')) {
      throw new Error('Can only pay with Credits cards for a non-Credits auction');
    }
    const totalValue = (paymentCards as CreditsCard[]).reduce((sum, c) => sum + c.value, 0);
    if (totalValue < bidAmount) {
      throw new Error(`Payment of ${totalValue} does not cover bid of ${bidAmount}`);
    }
  }

  const paidIds = new Set(cardIds);
  const remainingHand = payer.hand.filter((c) => !paidIds.has(c.id));
  const players = state.players.map((p) => (p.id === payerId ? { ...p, hand: [...remainingHand, card] } : p));

  const nextState: GameState = {
    ...state,
    players,
    discardPile: [...state.discardPile, ...paymentCards],
  };

  if (card.kind === 'mission') {
    return {
      ...nextState,
      pendingAction: { type: 'mission-resolve', playerId: payerId, card, resumeAfter: 'auction' },
    };
  }

  return advanceAuctionTurn(nextState);
}

export function forfeitPayment(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('forfeitPayment called outside auction-pay step');
  }
  const { card, payerId } = state.pendingAction;
  const penalizedPlayer = state.players.find((p) => p.id === payerId)!;

  let players = state.players;
  for (const other of state.players) {
    if (other.id === payerId) continue;
    players = seizeRandomCard(players, payerId, other.id);
  }

  const nextState: GameState = {
    ...state,
    players,
    log: [...state.log, { message: `${penalizedPlayer.name} could not pay and was penalized.` }],
  };

  return reAuctionCard(nextState, card, payerId);
}

function seizeRandomCard(players: Player[], fromId: string, toId: string): Player[] {
  const fromPlayer = players.find((p) => p.id === fromId)!;
  if (fromPlayer.hand.length === 0) return players;
  const idx = Math.floor(Math.random() * fromPlayer.hand.length);
  const seized = fromPlayer.hand[idx];
  return players.map((p) => {
    if (p.id === fromId) return { ...p, hand: p.hand.filter((_, i) => i !== idx) };
    if (p.id === toId) return { ...p, hand: [...p.hand, seized] };
    return p;
  });
}

function reAuctionCard(state: GameState, card: Card, excludedPlayerId: string): GameState {
  const firstBidderId = nextClockwise(state, excludedPlayerId, [excludedPlayerId]);
  const bid: BidState = {
    card,
    highBid: 0,
    highBidderId: null,
    passedIds: [excludedPlayerId],
    nextBidderId: firstBidderId!,
  };
  return { ...state, pendingAction: { type: 'auction-bid', bid } };
}

function advanceAuctionTurn(state: GameState): GameState {
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  const nextState = { ...state, activePlayerIndex: nextActiveIndex };
  if (nextState.supplyDeck.length === 0) {
    return beginScoring(nextState);
  }
  return revealNextForActive(nextState);
}

export function continueAuctionAfterMission(state: GameState): GameState {
  return advanceAuctionTurn(state);
}
