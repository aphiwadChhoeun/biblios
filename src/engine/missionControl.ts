import { GameState, MissionAdjustment, MissionCard } from './types';

function clampDie(value: number): number {
  return Math.max(1, Math.min(6, value));
}

export function resolveMissionCard(state: GameState, adjustments: MissionAdjustment[]): GameState {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('resolveMissionCard called outside mission-resolve step');
  }
  const card: MissionCard = state.pendingAction.card;

  if (adjustments.length !== card.diceCount) {
    throw new Error(`Expected ${card.diceCount} adjustment(s), got ${adjustments.length}`);
  }
  const categories = new Set(adjustments.map((a) => a.category));
  if (categories.size !== adjustments.length) {
    throw new Error('Each adjustment must target a distinct category');
  }
  for (const adjustment of adjustments) {
    if (card.modifier !== 'mixed' && adjustment.direction !== card.modifier) {
      throw new Error(`This card only allows '${card.modifier}' adjustments`);
    }
  }

  const dice = { ...state.dice };
  for (const adjustment of adjustments) {
    const delta = adjustment.direction === 'plus' ? 1 : -1;
    dice[adjustment.category] = clampDie(dice[adjustment.category] + delta);
  }

  const description = adjustments
    .map((a) => `${a.category} ${a.direction === 'plus' ? '+1' : '-1'}`)
    .join(', ');

  return {
    ...state,
    dice,
    discardPile: [...state.discardPile, card],
    log: [...state.log, { message: `Mission Control adjusted: ${description}` }],
  };
}

export function declineMissionCard(state: GameState): GameState {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('declineMissionCard called outside mission-resolve step');
  }
  const card = state.pendingAction.card;
  return {
    ...state,
    discardPile: [...state.discardPile, card],
    log: [...state.log, { message: 'Mission Control card discarded without effect.' }],
  };
}
