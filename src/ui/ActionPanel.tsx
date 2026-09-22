import { useState } from 'react';
import { Card, CATEGORY_LABEL, CATEGORY_ORDER, EngineAction, GameState, MissionAdjustment } from '../engine/types';
import { describeCard } from './PlayerHand';
import CargoBay from './CargoBay';

export default function ActionPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;

  if (pending.type === 'gift-allocate') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name} drew a card</h3>
        <div className="drawn-card">{describeCard(pending.drawnCard)}</div>
        <div className="action-buttons">
          <button disabled={pending.selfFilled} onClick={() => onAction({ type: 'allocate', destination: 'self' })}>
            Keep for yourself
          </button>
          <button disabled={pending.auctionFilled} onClick={() => onAction({ type: 'allocate', destination: 'auction' })}>
            Send to Auction Bay
          </button>
          <button onClick={() => onAction({ type: 'allocate', destination: 'cargo' })}>Send to Cargo Bay</button>
        </div>
      </div>
    );
  }

  if (pending.type === 'gift-draw') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name}: choose a card from the Cargo Bay</h3>
        <CargoBay cards={state.cargoBay} selectable onSelect={(cardId) => onAction({ type: 'draw-cargo', cardId })} />
      </div>
    );
  }

  if (pending.type === 'auction-reveal') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name}: reveal the next auction card</h3>
        <button onClick={() => onAction({ type: 'reveal' })}>Reveal</button>
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
  const unit = bid.card.kind === 'credits' ? 'card(s)' : 'Credits';
  const [amount, setAmount] = useState(bid.highBid + 1);

  return (
    <div className="action-panel">
      <h3>Auctioning: {describeCard(bid.card)}</h3>
      <p>
        High bid: {bid.highBid} {unit}{' '}
        {bid.highBidderId ? `(by ${state.players.find((p) => p.id === bid.highBidderId)!.name})` : ''}
      </p>
      <p>{bidder.name} to bid or pass</p>
      <input type="number" min={bid.highBid + 1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      <button onClick={() => onAction({ type: 'bid', amount })}>Bid</button>
      <button onClick={() => onAction({ type: 'pass' })}>Pass</button>
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

  const unit = pending.card.kind === 'credits' ? 'cards' : 'Credits value';
  return (
    <div className="action-panel">
      <h3>
        {payer.name} must pay {pending.bidAmount} {unit}
      </h3>
      <div className="pay-hand">
        {payer.hand.map((card: Card) => (
          <button key={card.id} className={selected.includes(card.id) ? 'card selected' : 'card'} onClick={() => toggle(card.id)}>
            {describeCard(card)}
          </button>
        ))}
      </div>
      <button onClick={() => onAction({ type: 'pay', cardIds: selected })}>Pay</button>
      <button onClick={() => onAction({ type: 'forfeit-payment' })}>Forfeit</button>
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

  return (
    <div className="action-panel">
      <h3>
        Mission Control card: choose {card.diceCount} categor{card.diceCount > 1 ? 'ies' : 'y'} to adjust
      </h3>
      <div className="mission-grid">
        {CATEGORY_ORDER.map((category) => (
          <div key={category} className="mission-row">
            <span>{CATEGORY_LABEL[category]}</span>
            {(card.modifier === 'plus' || card.modifier === 'mixed') && (
              <button onClick={() => setPick(category, 'plus')}>+1</button>
            )}
            {(card.modifier === 'minus' || card.modifier === 'mixed') && (
              <button onClick={() => setPick(category, 'minus')}>-1</button>
            )}
          </div>
        ))}
      </div>
      <button disabled={picks.length !== card.diceCount} onClick={() => onAction({ type: 'resolve-mission', adjustments: picks })}>
        Confirm
      </button>
      <button onClick={() => onAction({ type: 'decline-mission' })}>Discard without effect</button>
    </div>
  );
}
