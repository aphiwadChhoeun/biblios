import { EngineAction, GameState } from '../engine/types';
import CommandConsole from './CommandConsole';
import { OwnHand, OpponentSeat } from './PlayerHand';
import CargoBay from './CargoBay';
import ActionPanel from './ActionPanel';

export function currentActorId(state: GameState): string | null {
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

export default function BoardScreen({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const actorId = currentActorId(state);
  const actor = state.players.find((p) => p.id === actorId);
  const showCargoBayPanel = state.pendingAction.type !== 'gift-draw';

  return (
    <div className="board-screen">
      <CommandConsole dice={state.dice} />
      <div className="phase-banner">
        Phase: {state.phase} {actor ? `— ${actor.name}'s turn` : ''}
      </div>
      <div className="opponents-row">
        {state.players
          .filter((p) => p.id !== actor?.id)
          .map((p) => (
            <OpponentSeat key={p.id} name={p.name} cardCount={p.hand.length} isActive={p.id === actorId} />
          ))}
      </div>
      {showCargoBayPanel && <CargoBay cards={state.cargoBay} selectable={false} />}
      <ActionPanel state={state} onAction={onAction} />
      {actor && <h3>{actor.name}'s hand</h3>}
      {actor && <OwnHand hand={actor.hand} />}
      <div className="piles-info">
        Supply Deck: {state.supplyDeck.length} | Auction Bay: {state.auctionBay.length} | Discard: {state.discardPile.length}
      </div>
      <div className="log-panel">
        {state.log.slice(-8).map((entry, i) => (
          <div key={i}>{entry.message}</div>
        ))}
      </div>
    </div>
  );
}
