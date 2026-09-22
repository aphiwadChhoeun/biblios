import { CSSProperties, useState } from 'react';
import { Card, CATEGORY_LABEL, CATEGORY_ORDER, EngineAction, GameState, MissionAdjustment } from '../engine/types';
import CardFace, { describeCard } from './CardFace';
import CargoBay from './CargoBay';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

export default function ActionPanel({
  state,
  onAction,
  interactive = true,
}: {
  state: GameState;
  onAction: (action: EngineAction) => void;
  /** False while an AI holds the turn. Disables every control inside. */
  interactive?: boolean;
}) {
  const body = PanelBody({ state, onAction });
  if (!body) return null;
  // A disabled fieldset natively disables every control it contains, so a
  // stray (or programmatic) click cannot dispatch on the AI's behalf.
  return (
    <fieldset className="action-fieldset" disabled={!interactive} aria-busy={!interactive}>
      {body}
    </fieldset>
  );
}

function PanelBody({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;

  if (pending.type === 'gift-allocate') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <div>
          <h3>{player.name} drew a card</h3>
          <p>Send it to one of the three destinations.</p>
        </div>
        <div className="card-spotlight">
          <CardFace card={pending.drawnCard} animate />
        </div>
        <div className="action-buttons">
          <button className="primary" disabled={pending.selfFilled} onClick={() => onAction({ type: 'allocate', destination: 'self' })}>
            Keep it
          </button>
          <button disabled={pending.auctionFilled} onClick={() => onAction({ type: 'allocate', destination: 'auction' })}>
            Send to auction bay
          </button>
          <button disabled={!pending.cargoAllowed} onClick={() => onAction({ type: 'allocate', destination: 'cargo' })}>
            Send to cargo bay
          </button>
        </div>
      </div>
    );
  }

  if (pending.type === 'gift-draw') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <div>
          <h3>{player.name}: take a card from the cargo bay</h3>
          <p>Pick one. The rest stay for the captains behind you.</p>
        </div>
        <CargoBay cards={state.cargoBay} selectable onSelect={(cardId) => onAction({ type: 'draw-cargo', cardId })} />
      </div>
    );
  }

  if (pending.type === 'auction-reveal') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <div>
          <h3>{player.name}: reveal the next auction card</h3>
          {/* The auction deck lives in supplyDeck once beginAuctionPhase runs. */}
          <p>
            {state.supplyDeck.length} card{state.supplyDeck.length === 1 ? '' : 's'} left in the auction deck.
          </p>
        </div>
        <div className="action-buttons">
          <button className="primary" onClick={() => onAction({ type: 'reveal' })}>
            Reveal card
          </button>
        </div>
      </div>
    );
  }

  if (pending.type === 'auction-bid') {
    return <BidPanel key={pending.bid.nextBidderId} state={state} onAction={onAction} />;
  }

  if (pending.type === 'auction-pay') {
    return <PayPanel state={state} onAction={onAction} />;
  }

  if (pending.type === 'mission-resolve') {
    return <MissionPanel state={state} onAction={onAction} />;
  }

  return null;
}

function BidPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'auction-bid') return null;
  const { bid } = pending;
  const bidder = state.players.find((p) => p.id === bid.nextBidderId)!;
  // Credits cards are bought with cards; everything else is bought with credits.
  const unit = (n: number) => (bid.card.kind === 'credits' ? `card${n === 1 ? '' : 's'}` : `credit${n === 1 ? '' : 's'}`);
  const [amount, setAmount] = useState(bid.highBid + 1);
  const highBidder = bid.highBidderId ? state.players.find((p) => p.id === bid.highBidderId)! : null;

  return (
    <div className="action-panel">
      <div>
        <h3>Up for auction</h3>
        <p>
          {describeCard(bid.card)}. {state.supplyDeck.length} card{state.supplyDeck.length === 1 ? '' : 's'} still to
          come.
        </p>
      </div>
      <div className="card-spotlight">
        <CardFace card={bid.card} animate />
      </div>
      <div className="bid-readout">
        <b>{highBidder ? bid.highBid : '—'}</b>
        <span className="bid-holder">
          {highBidder ? `${unit(bid.highBid)} bid by ${highBidder.name}` : 'No bids yet'}
        </span>
      </div>
      <p>{bidder.name} to bid or pass.</p>
      <div className="bid-controls">
        <label className="nameplate" htmlFor="bid-amount">
          Bid
        </label>
        <input
          id="bid-amount"
          type="number"
          min={bid.highBid + 1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button className="primary" onClick={() => onAction({ type: 'bid', amount })}>
          Place bid
        </button>
        <button onClick={() => onAction({ type: 'pass' })}>Pass</button>
      </div>
    </div>
  );
}

function PayPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'auction-pay') return null;
  const payer = state.players.find((p) => p.id === pending.payerId)!;
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(cardId: string) {
    setSelected((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]));
  }

  const unit =
    pending.card.kind === 'credits'
      ? `card${pending.bidAmount === 1 ? '' : 's'}`
      : `credit${pending.bidAmount === 1 ? '' : 's'} in value`;
  return (
    <div className="action-panel">
      <div>
        <h3>
          {payer.name} owes {pending.bidAmount} {unit}
        </h3>
        <p>Choose the cards to hand over, then settle up.</p>
      </div>
      <div className="pay-hand">
        {payer.hand.map((card: Card, i: number) => (
          <CardFace
            key={card.id}
            card={card}
            index={i}
            selected={selected.includes(card.id)}
            onClick={() => toggle(card.id)}
          />
        ))}
      </div>
      <div className="action-buttons">
        <button className="primary" onClick={() => onAction({ type: 'pay', cardIds: selected })}>
          Pay {selected.length} card{selected.length === 1 ? '' : 's'}
        </button>
        <button className="danger" onClick={() => onAction({ type: 'forfeit-payment' })}>
          Forfeit the card
        </button>
      </div>
    </div>
  );
}

function MissionPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'mission-resolve') return null;
  const card = pending.card;
  const [picks, setPicks] = useState<MissionAdjustment[]>([]);

  function setPick(category: MissionAdjustment['category'], direction: 'plus' | 'minus') {
    setPicks((prev) => {
      const withoutCategory = prev.filter((p) => p.category !== category);
      if (prev.find((p) => p.category === category && p.direction === direction)) {
        return withoutCategory;
      }
      if (withoutCategory.length >= card.diceCount) return prev;
      return [...withoutCategory, { category, direction }];
    });
  }

  function isPicked(category: MissionAdjustment['category'], direction: 'plus' | 'minus') {
    return picks.some((p) => p.category === category && p.direction === direction);
  }

  return (
    <div className="action-panel">
      <div>
        <h3>Mission Control</h3>
        <p>
          Adjust {card.diceCount} categor{card.diceCount > 1 ? 'ies' : 'y'}. This changes what that cargo is worth for
          everyone at the end of the game.
        </p>
      </div>
      <div className="mission-grid">
        {CATEGORY_ORDER.map((category) => (
          <div
            key={category}
            className="mission-row"
            style={{ '--hue': CATEGORY_COLOR[category] } as CSSProperties}
          >
            <span aria-hidden="true">{CATEGORY_ICON[category]}</span>
            <span className="mission-name">{CATEGORY_LABEL[category]}</span>
            {(card.modifier === 'plus' || card.modifier === 'mixed') && (
              <button
                className={isPicked(category, 'plus') ? 'picked' : ''}
                onClick={() => setPick(category, 'plus')}
                aria-label={`Raise ${CATEGORY_LABEL[category]} by one`}
              >
                +1
              </button>
            )}
            {(card.modifier === 'minus' || card.modifier === 'mixed') && (
              <button
                className={isPicked(category, 'minus') ? 'picked' : ''}
                onClick={() => setPick(category, 'minus')}
                aria-label={`Lower ${CATEGORY_LABEL[category]} by one`}
              >
                -1
              </button>
            )}
          </div>
        ))}
      </div>
      <span className="mission-picks">
        {picks.length} of {card.diceCount} selected
      </span>
      <div className="action-buttons">
        <button
          className="primary"
          disabled={picks.length !== card.diceCount}
          onClick={() => onAction({ type: 'resolve-mission', adjustments: picks })}
        >
          Confirm adjustment
        </button>
        <button onClick={() => onAction({ type: 'decline-mission' })}>Discard without effect</button>
      </div>
    </div>
  );
}
