import { useRef } from 'react';
import { EngineAction, GameState, Player } from '../engine/types';
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

  // The hand tray stays populated through AI turns so the player can keep
  // reading their cards. It may only ever show a seat with isAI === false:
  // rendering the acting bot's hand would break the hidden-information
  // mechanic. During an AI turn we fall back to the human who acted last.
  const lastHumanId = useRef<string | null>(null);
  if (actor && !actor.isAI) lastHumanId.current = actor.id;
  const humanSeats = state.players.filter((p) => !p.isAI);
  const handOwner: Player | null =
    actor && !actor.isAI
      ? actor
      : humanSeats.find((p) => p.id === lastHumanId.current) ?? humanSeats[0] ?? null;
  const isHandOwnersTurn = !!handOwner && handOwner.id === actorId;

  // beginAuctionPhase shuffles the auction bay into supplyDeck and empties the
  // bay, so during the auction it is supplyDeck that holds the cards still to
  // come under the hammer.
  const auctionDeckCount = state.phase === 'auction' ? state.supplyDeck.length : state.auctionBay.length;
  const entries = state.log.slice(-40);

  // While a bot holds the turn the board is read-only: controls are disabled
  // and the cursor switches to the standby reticle.
  const interactive = !!actor && !actor.isAI;

  return (
    <div className={`board-screen${interactive ? '' : ' locked'}`}>
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
          {state.phase === 'auction' ? (
            <span className="pile-stat" data-testid="auction-deck-count">
              <b>{auctionDeckCount}</b>
              <span>Auction deck</span>
            </span>
          ) : (
            <>
              <span className="pile-stat">
                <b>{state.supplyDeck.length}</b>
                <span>Supply</span>
              </span>
              <span className="pile-stat" data-testid="auction-deck-count">
                <b>{auctionDeckCount}</b>
                <span>Auction</span>
              </span>
            </>
          )}
          <span className="pile-stat">
            <b>{state.discardPile.length}</b>
            <span>Discard</span>
          </span>
        </div>
      </header>

      <aside className="seat-roster">
        <span className="nameplate">Captains</span>
        {state.players
          .filter((p) => (handOwner ? p.id !== handOwner.id : true))
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
        <ActionPanel state={state} onAction={onAction} interactive={interactive} />
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

      <footer className={`hand-tray${handOwner && !isHandOwnersTurn ? ' waiting' : ''}`}>
        <div className="hand-tray-label">
          <b>{handOwner ? `${handOwner.name}'s hand` : 'Hand'}</b>
          <span className="nameplate">
            {handOwner
              ? isHandOwnersTurn
                ? `${handOwner.hand.length} card${handOwner.hand.length === 1 ? '' : 's'}`
                : `Waiting · ${handOwner.hand.length} card${handOwner.hand.length === 1 ? '' : 's'}`
              : 'No human seat'}
          </span>
        </div>
        {handOwner ? (
          <OwnHand hand={handOwner.hand} />
        ) : (
          <p className="hand-concealed">Every seat is played by the computer.</p>
        )}
      </footer>
    </div>
  );
}
