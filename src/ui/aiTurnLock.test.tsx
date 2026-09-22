import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BoardScreen from './BoardScreen';
import { Card, GameState, Player } from '../engine/types';

function cat(id: string, value: number, letter: string): Card {
  return { id, kind: 'category', category: 'fuel', value, tieBreakLetter: letter };
}

function player(id: string, name: string, isAI: boolean): Player {
  return { id, name, isAI, hand: [cat(`${id}-c`, 2, 'A')] };
}

/** Parked on a gift-allocate that belongs to the AI seat. */
function aiTurnState(): GameState {
  return {
    phase: 'gift',
    players: [player('player-0', 'Captain 1', false), player('player-1', 'Captain 2', true)],
    activePlayerIndex: 1,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 3,
    pendingAction: {
      type: 'gift-allocate',
      playerId: 'player-1',
      drawnCard: cat('drawn', 3, 'B'),
      selfFilled: false,
      auctionFilled: false,
      cargoAllowed: true,
    },
    log: [{ message: 'Mission started.' }],
  };
}

describe('interaction during an AI turn', () => {
  it('does not dispatch an action when the pending actor is an AI', async () => {
    const onAction = vi.fn();
    render(<BoardScreen state={aiTurnState()} onAction={onAction} />);

    const keep = screen.queryByRole('button', { name: /Keep it/i });
    keep?.click();

    expect(onAction).not.toHaveBeenCalled();
  });
});
