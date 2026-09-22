import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BoardScreen from './BoardScreen';
import { Card, GameState, Player } from '../engine/types';

function categoryCard(id: string, value: number, tieBreakLetter: string): Card {
  return { id, kind: 'category', category: 'fuel', value, tieBreakLetter };
}

const HUMAN_CARD = categoryCard('human-card', 7, 'A');
const AI_CARD = categoryCard('ai-card', 4, 'B');

function player(id: string, name: string, isAI: boolean, hand: Card[]): Player {
  return { id, name, isAI, hand };
}

/** A two-seat game (one human, one AI) parked on the given pending action. */
function stateWithActor(actorId: string, overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'gift',
    players: [
      player('player-0', 'Captain 1', false, [HUMAN_CARD]),
      player('player-1', 'Captain 2', true, [AI_CARD]),
    ],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 3,
    pendingAction: { type: 'auction-reveal', playerId: actorId },
    log: [{ message: 'Mission started.' }],
    ...overrides,
  };
}

describe('BoardScreen hand visibility', () => {
  it("renders the human player's hand while an AI seat is acting", () => {
    render(<BoardScreen state={stateWithActor('player-1')} onAction={() => {}} />);

    expect(screen.getByLabelText('Fuel Cells 7A')).toBeInTheDocument();
  });

  it("never renders an AI seat's hand face-up", () => {
    render(<BoardScreen state={stateWithActor('player-1')} onAction={() => {}} />);

    expect(screen.queryByLabelText('Fuel Cells 4B')).not.toBeInTheDocument();
  });

  it("renders the acting human's own hand on their turn", () => {
    render(<BoardScreen state={stateWithActor('player-0')} onAction={() => {}} />);

    expect(screen.getByLabelText('Fuel Cells 7A')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fuel Cells 4B')).not.toBeInTheDocument();
  });

  it('shows no hand when every seat is an AI', () => {
    const allAI = stateWithActor('player-1', {
      players: [
        player('player-0', 'Captain 1', true, [HUMAN_CARD]),
        player('player-1', 'Captain 2', true, [AI_CARD]),
      ],
    });
    render(<BoardScreen state={allAI} onAction={() => {}} />);

    expect(screen.queryByLabelText('Fuel Cells 7A')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Fuel Cells 4B')).not.toBeInTheDocument();
  });
});

describe('BoardScreen auction deck count', () => {
  it('reports the cards left in the auction deck during the auction phase', () => {
    // beginAuctionPhase moves the bay into supplyDeck and empties auctionBay,
    // so the auction deck is supplyDeck once the phase flips.
    const auctioning = stateWithActor('player-0', {
      phase: 'auction',
      supplyDeck: [categoryCard('a', 1, 'C'), categoryCard('b', 2, 'D'), categoryCard('c', 3, 'E')],
      auctionBay: [],
    });
    render(<BoardScreen state={auctioning} onAction={() => {}} />);

    const stat = screen.getByTestId('auction-deck-count');
    expect(stat).toHaveTextContent('3');
  });
});
