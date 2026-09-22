import { beginAuctionPhase } from './auctionPhase';
import { Card, GameState, MissionCard } from './types';

function drawOne(state: GameState): { card: Card; rest: Card[] } {
  const [card, ...rest] = state.supplyDeck;
  return { card, rest };
}

export function startGiftTurn(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const { card, rest } = drawOne(state);
  return {
    ...state,
    supplyDeck: rest,
    giftTurn: { cardsDrawn: 1, selfFilled: false, auctionFilled: false, selfCard: null },
    pendingAction: {
      type: 'gift-allocate',
      playerId: activePlayer.id,
      drawnCard: card,
      selfFilled: false,
      auctionFilled: false,
    },
  };
}

export function allocateGiftCard(state: GameState, destination: 'self' | 'auction' | 'cargo'): GameState {
  if (state.pendingAction.type !== 'gift-allocate') {
    throw new Error('allocateGiftCard called outside gift-allocate step');
  }
  const { drawnCard, selfFilled, auctionFilled, playerId } = state.pendingAction;
  const giftTurn = state.giftTurn!;

  if (destination === 'self' && selfFilled) throw new Error('Self slot already filled this turn');
  if (destination === 'auction' && auctionFilled) throw new Error('Auction slot already filled this turn');

  let nextState: GameState = { ...state };
  let interrupted = false;

  if (destination === 'self') {
    nextState.giftTurn = { ...giftTurn, selfFilled: true, selfCard: drawnCard };
    if (drawnCard.kind === 'mission') interrupted = true;
  } else if (destination === 'auction') {
    nextState.auctionBay = [...state.auctionBay, drawnCard];
    nextState.giftTurn = { ...giftTurn, auctionFilled: true };
  } else {
    nextState.cargoBay = [...state.cargoBay, drawnCard];
    nextState.giftTurn = giftTurn;
  }

  if (interrupted) {
    return {
      ...nextState,
      pendingAction: {
        type: 'mission-resolve',
        playerId,
        card: drawnCard as MissionCard,
        resumeAfter: 'gift-allocate',
      },
    };
  }

  return advanceGiftFlow(nextState);
}

function advanceGiftFlow(state: GameState): GameState {
  const giftTurn = state.giftTurn!;
  if (giftTurn.cardsDrawn < state.giftCardsPerTurn && state.supplyDeck.length > 0) {
    const { card, rest } = drawOne(state);
    return {
      ...state,
      supplyDeck: rest,
      giftTurn: { ...giftTurn, cardsDrawn: giftTurn.cardsDrawn + 1 },
      pendingAction: {
        type: 'gift-allocate',
        playerId: state.players[state.activePlayerIndex].id,
        drawnCard: card,
        selfFilled: giftTurn.selfFilled,
        auctionFilled: giftTurn.auctionFilled,
      },
    };
  }
  return finishGiftTurn(state);
}

function playerIdsLeftOf(players: GameState['players'], activeIndex: number): string[] {
  const order: string[] = [];
  for (let offset = 1; offset < players.length; offset += 1) {
    order.push(players[(activeIndex + offset) % players.length].id);
  }
  return order;
}

function finishGiftTurn(state: GameState): GameState {
  const giftTurn = state.giftTurn!;
  const activeIndex = state.activePlayerIndex;
  const players = state.players.map((p, i) =>
    i === activeIndex && giftTurn.selfCard ? { ...p, hand: [...p.hand, giftTurn.selfCard] } : p
  );

  const nextState: GameState = {
    ...state,
    players,
    giftTurn: null,
    giftDraftQueue: playerIdsLeftOf(players, activeIndex),
  };

  return advanceGiftDraft(nextState);
}

function advanceGiftDraft(state: GameState): GameState {
  if (state.cargoBay.length === 0 || state.giftDraftQueue.length === 0) {
    return endGiftTurnRotation(state);
  }
  return { ...state, pendingAction: { type: 'gift-draw', playerId: state.giftDraftQueue[0] } };
}

export function drawFromCargoBay(state: GameState, cardId: string): GameState {
  if (state.pendingAction.type !== 'gift-draw') {
    throw new Error('drawFromCargoBay called outside gift-draw step');
  }
  const { playerId } = state.pendingAction;
  const card = state.cargoBay.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not in Cargo Bay`);

  const cargoBay = state.cargoBay.filter((c) => c.id !== cardId);
  const players = state.players.map((p) => (p.id === playerId ? { ...p, hand: [...p.hand, card] } : p));
  const giftDraftQueue = state.giftDraftQueue.slice(1);

  const nextState: GameState = { ...state, cargoBay, players, giftDraftQueue };

  if (card.kind === 'mission') {
    return {
      ...nextState,
      pendingAction: { type: 'mission-resolve', playerId, card, resumeAfter: 'gift-draft' },
    };
  }

  return advanceGiftDraft(nextState);
}

function endGiftTurnRotation(state: GameState): GameState {
  if (state.supplyDeck.length === 0) {
    return beginAuctionPhase(state);
  }
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  return startGiftTurn({ ...state, activePlayerIndex: nextActiveIndex });
}

export function continueGiftAfterMission(
  state: GameState,
  resumeAfter: 'gift-allocate' | 'gift-draft'
): GameState {
  return resumeAfter === 'gift-allocate' ? advanceGiftFlow(state) : advanceGiftDraft(state);
}
