import { EngineAction, GameState } from '../engine/types';
import CommandConsole from './CommandConsole';
import { OwnHand, OpponentSeat } from './PlayerHand';
import CargoBay from './CargoBay';
import ActionPanel from './ActionPanel';
import { PHASE_LABEL } from './theme';

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
  // Only reveal a hand face-up as the human player's "own hand" when the pending actor is a
  // human. AI turns auto-advance and would otherwise briefly show the bot's hidden hand,
  // breaking the game's hidden-information mechanic.
  const showOwnHand = !!actor && !actor.isAI;
  const entries = state.log.slice(-40);

  return (
    <div className="board-screen">
      <header className="telemetry-strip">
        <div className="strip-identity">
          <span className="strip-title">Star Manifest</span>
          <span className="strip-phase">
            {PHASE_LABEL[state.phase]}
            {actor ? <span className="actor"> · {actor.name}</span> : ''}
          </span>
        </div>
        <CommandConsole dice={state.dice} />
        <div className="piles-info mono">
          <span className="pile-stat">
            <b>{state.supplyDeck.length}</b>
            <span>Supply</span>
          </span>
          <span className="pile-stat">
            <b>{state.auctionBay.length}</b>
            <span>Auction</span>
          </span>
          <span className="pile-stat">
            <b>{state.discardPile.length}</b>
            <span>Discard</span>
          </span>
        </div>
      </header>

      <aside className="seat-roster">
        <span className="nameplate">Captains</span>
        {state.players
          .filter((p) => (showOwnHand ? p.id !== actor!.id : true))
          .map((p) => (
            <OpponentSeat
              key={p.id}
              name={p.name}
              cardCount={p.hand.length}
              isActive={p.id === actorId}
              isAI={p.isAI}
            />
          ))}
      </aside>

      <main className="main-stage">
        <ActionPanel state={state} onAction={onAction} />
        {showCargoBayPanel && <CargoBay cards={state.cargoBay} selectable={false} />}
      </main>

      <section className="log-panel" aria-label="Mission log">
        {entries
          .slice()
          .reverse()
          .map((entry, i) => (
            <div className="log-entry" key={entries.length - i}>
              <span className="log-mark" aria-hidden="true">
                {i === 0 ? '▸' : '·'}
              </span>
              <span>{entry.message}</span>
            </div>
          ))}
      </section>

      <footer className="hand-tray">
        <div className="hand-tray-label">
          <b>{showOwnHand ? `${actor!.name}'s hand` : 'Hand'}</b>
          <span className="nameplate">
            {showOwnHand ? `${actor!.hand.length} card${actor!.hand.length === 1 ? '' : 's'}` : 'Concealed'}
          </span>
        </div>
        {showOwnHand ? (
          <OwnHand hand={actor!.hand} />
        ) : (
          <p className="hand-concealed">Cards stay face down while the computer takes its turn.</p>
        )}
      </footer>
    </div>
  );
}
