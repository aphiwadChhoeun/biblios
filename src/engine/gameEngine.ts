import { buildSetupDeck } from './deck';
import {
  allocateGiftCard,
  continueGiftAfterMission,
  drawFromCargoBay,
  startGiftTurn,
} from './giftPhase';
import {
  continueAuctionAfterMission,
  forfeitPayment,
  passBid,
  payForAuction,
  placeBid,
  revealTopCard,
} from './auctionPhase';
import { declineMissionCard, resolveMissionCard } from './missionControl';
import { CategoryId, EngineAction, GameState, Player } from './types';

export interface PlayerConfig {
  name: string;
  isAI: boolean;
}

const GIFT_CARDS_PER_TURN: Record<number, number> = { 2: 3, 3: 4, 4: 5 };

export function createGame(configs: PlayerConfig[], rng: () => number = Math.random): GameState {
  if (configs.length < 2 || configs.length > 4) {
    throw new Error('Biblios supports 2-4 players');
  }

  const players: Player[] = configs.map((c, i) => ({
    id: `player-${i}`,
    name: c.name,
    isAI: c.isAI,
    hand: [],
  }));

  const dice: Record<CategoryId, number> = { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 };
  const supplyDeck = buildSetupDeck(configs.length, rng);

  const baseState: GameState = {
    phase: 'gift',
    players,
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice,
    supplyDeck,
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: GIFT_CARDS_PER_TURN[configs.length],
    pendingAction: { type: 'scoring' },
    log: [{ message: 'Mission started.' }],
  };

  return startGiftTurn(baseState);
}

export function dispatch(state: GameState, action: EngineAction): GameState {
  const pending = state.pendingAction;
  switch (pending.type) {
    case 'gift-allocate': {
      if (action.type !== 'allocate') throw new Error(`Expected 'allocate', got '${action.type}'`);
      return allocateGiftCard(state, action.destination);
    }
    case 'gift-draw': {
      if (action.type !== 'draw-cargo') throw new Error(`Expected 'draw-cargo', got '${action.type}'`);
      return drawFromCargoBay(state, action.cardId);
    }
    case 'auction-reveal': {
      if (action.type !== 'reveal') throw new Error(`Expected 'reveal', got '${action.type}'`);
      return revealTopCard(state);
    }
    case 'auction-bid': {
      if (action.type === 'bid') return placeBid(state, action.amount);
      if (action.type === 'pass') return passBid(state);
      throw new Error(`Expected 'bid' or 'pass', got '${action.type}'`);
    }
    case 'auction-pay': {
      if (action.type === 'pay') return payForAuction(state, action.cardIds);
      if (action.type === 'forfeit-payment') return forfeitPayment(state);
      throw new Error(`Expected 'pay' or 'forfeit-payment', got '${action.type}'`);
    }
    case 'mission-resolve': {
      const resumeAfter = pending.resumeAfter;
      let resolved: GameState;
      if (action.type === 'resolve-mission') {
        resolved = resolveMissionCard(state, action.adjustments);
      } else if (action.type === 'decline-mission') {
        resolved = declineMissionCard(state);
      } else {
        throw new Error(`Expected 'resolve-mission' or 'decline-mission', got '${action.type}'`);
      }
      if (resumeAfter === 'auction') return continueAuctionAfterMission(resolved);
      return continueGiftAfterMission(resolved, resumeAfter);
    }
    case 'game-over':
      return state;
    default:
      return state;
  }
}
