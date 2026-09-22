import { dispatch } from './gameEngine';
import {
  CATEGORY_ORDER,
  Card,
  CategoryCard,
  CategoryId,
  CreditsCard,
  EngineAction,
  GameState,
  MissionAdjustment,
  Player,
} from './types';

function cardScore(card: Card, dice: Record<CategoryId, number>): number {
  if (card.kind === 'category') return card.value * dice[card.category];
  if (card.kind === 'mission') return 12;
  return card.value * 2;
}

export function decideGiftAllocation(state: GameState): 'self' | 'auction' | 'cargo' {
  if (state.pendingAction.type !== 'gift-allocate') {
    throw new Error('decideGiftAllocation called outside gift-allocate step');
  }
  const { drawnCard, selfFilled, auctionFilled } = state.pendingAction;
  const score = cardScore(drawnCard, state.dice);
  const HIGH_VALUE_THRESHOLD = 8;

  if (!selfFilled && score >= HIGH_VALUE_THRESHOLD) return 'self';
  if (!auctionFilled && score < HIGH_VALUE_THRESHOLD) return 'auction';
  if (!selfFilled) return 'self';
  if (!auctionFilled) return 'auction';
  return 'cargo';
}

export function decideGiftDraw(state: GameState): string {
  if (state.pendingAction.type !== 'gift-draw') {
    throw new Error('decideGiftDraw called outside gift-draw step');
  }
  if (state.cargoBay.length === 0) {
    throw new Error('Cargo Bay is empty');
  }
  let best = state.cargoBay[0];
  let bestScore = cardScore(best, state.dice);
  for (const card of state.cargoBay.slice(1)) {
    const score = cardScore(card, state.dice);
    if (score > bestScore) {
      best = card;
      bestScore = score;
    }
  }
  return best.id;
}

function categoryStanding(state: GameState, playerId: string, category: CategoryId): number {
  const player = state.players.find((p) => p.id === playerId)!;
  return player.hand
    .filter((c): c is CategoryCard => c.kind === 'category' && c.category === category)
    .reduce((sum, c) => sum + c.value, 0);
}

function bestOpponentStanding(state: GameState, playerId: string, category: CategoryId): number {
  return Math.max(
    0,
    ...state.players.filter((p) => p.id !== playerId).map((p) => categoryStanding(state, p.id, category))
  );
}

function affordableMax(player: Player, card: Card): number {
  if (card.kind === 'credits') return player.hand.length;
  return player.hand
    .filter((c): c is CreditsCard => c.kind === 'credits')
    .reduce((sum, c) => sum + c.value, 0);
}

export interface BidDecision {
  action: 'bid' | 'pass';
  amount?: number;
}

export function decideBid(state: GameState, playerId: string): BidDecision {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('decideBid called outside auction-bid step');
  }
  const { bid } = state.pendingAction;
  const player = state.players.find((p) => p.id === playerId)!;
  const card = bid.card;

  let budget: number;
  if (card.kind === 'category') {
    const myStanding = categoryStanding(state, playerId, card.category);
    const opponentStanding = bestOpponentStanding(state, playerId, card.category);
    const urgency = myStanding >= opponentStanding ? 1.5 : 1;
    budget = Math.round(card.value * state.dice[card.category] * urgency * 0.5);
  } else if (card.kind === 'mission') {
    budget = 4;
  } else {
    budget = 2;
  }

  const nextBid = bid.highBid + 1;
  if (nextBid > budget || nextBid > affordableMax(player, card)) {
    return { action: 'pass' };
  }
  return { action: 'bid', amount: nextBid };
}

function cardPriority(card: Card): number {
  if (card.kind === 'credits') return 0;
  if (card.kind === 'mission') return 3;
  return 1;
}

export function decidePayment(state: GameState): string[] | null {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('decidePayment called outside auction-pay step');
  }
  const { card, payerId, bidAmount } = state.pendingAction;
  const payer = state.players.find((p) => p.id === payerId)!;

  if (card.kind === 'credits') {
    if (payer.hand.length < bidAmount) return null;
    const sorted = [...payer.hand].sort((a, b) => cardPriority(a) - cardPriority(b));
    return sorted.slice(0, bidAmount).map((c) => c.id);
  }

  const creditsCards = payer.hand
    .filter((c): c is CreditsCard => c.kind === 'credits')
    .sort((a, b) => a.value - b.value);
  const totalAvailable = creditsCards.reduce((sum, c) => sum + c.value, 0);
  if (totalAvailable < bidAmount) return null;

  const chosen: string[] = [];
  let paid = 0;
  for (const c of creditsCards) {
    if (paid >= bidAmount) break;
    chosen.push(c.id);
    paid += c.value;
  }
  return chosen;
}

export function decideMissionAdjustments(state: GameState, playerId: string): MissionAdjustment[] {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('decideMissionAdjustments called outside mission-resolve step');
  }
  const card = state.pendingAction.card;
  const ranked = CATEGORY_ORDER.map((category) => ({
    category,
    lead: categoryStanding(state, playerId, category) - bestOpponentStanding(state, playerId, category),
  })).sort((a, b) => b.lead - a.lead);

  const adjustments: MissionAdjustment[] = [];
  for (let i = 0; i < card.diceCount; i += 1) {
    const target = ranked[i];
    const direction: 'plus' | 'minus' =
      card.modifier === 'mixed' ? (target.lead >= 0 ? 'plus' : 'minus') : card.modifier;
    adjustments.push({ category: target.category, direction });
  }
  return adjustments;
}

function actorIdFor(state: GameState): string | null {
  const pa = state.pendingAction;
  switch (pa.type) {
    case 'gift-allocate':
    case 'gift-draw':
    case 'auction-reveal':
    case 'mission-resolve':
      return pa.playerId;
    case 'auction-bid':
      return pa.bid.nextBidderId;
    case 'auction-pay':
      return pa.payerId;
    default:
      return null;
  }
}

export function isAITurn(state: GameState): boolean {
  const actorId = actorIdFor(state);
  if (!actorId) return false;
  const player = state.players.find((p) => p.id === actorId);
  return !!player?.isAI;
}

export function computeAIAction(state: GameState): EngineAction {
  const actorId = actorIdFor(state)!;
  switch (state.pendingAction.type) {
    case 'gift-allocate':
      return { type: 'allocate', destination: decideGiftAllocation(state) };
    case 'gift-draw':
      return { type: 'draw-cargo', cardId: decideGiftDraw(state) };
    case 'auction-reveal':
      return { type: 'reveal' };
    case 'auction-bid': {
      const decision = decideBid(state, actorId);
      return decision.action === 'bid' ? { type: 'bid', amount: decision.amount! } : { type: 'pass' };
    }
    case 'auction-pay': {
      const cardIds = decidePayment(state);
      return cardIds ? { type: 'pay', cardIds } : { type: 'forfeit-payment' };
    }
    case 'mission-resolve':
      return { type: 'resolve-mission', adjustments: decideMissionAdjustments(state, actorId) };
    default:
      throw new Error(`No AI action available for pending action '${state.pendingAction.type}'`);
  }
}

export function advanceAI(state: GameState): GameState {
  if (!isAITurn(state)) return state;
  return dispatch(state, computeAIAction(state));
}

export function runAIUntilHumanTurn(state: GameState): GameState {
  let current = state;
  let guard = 0;
  while (isAITurn(current) && guard < 10000) {
    current = advanceAI(current);
    guard += 1;
  }
  return current;
}
