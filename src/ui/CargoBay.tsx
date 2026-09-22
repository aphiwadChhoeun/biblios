import { Card } from '../engine/types';
import { describeCard } from './PlayerHand';

export default function CargoBay({
  cards,
  selectable,
  onSelect,
}: {
  cards: Card[];
  selectable: boolean;
  onSelect?: (cardId: string) => void;
}) {
  return (
    <div className="cargo-bay">
      <h3>Cargo Bay</h3>
      <div className="cargo-cards">
        {cards.map((card) => (
          <button key={card.id} className="card cargo-card" disabled={!selectable} onClick={() => onSelect?.(card.id)}>
            {describeCard(card)}
          </button>
        ))}
      </div>
    </div>
  );
}
