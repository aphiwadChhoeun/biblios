import { Card } from '../engine/types';
import CardFace from './CardFace';

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
    <div className="cargo-bay panel">
      <div>
        <h3>Cargo Bay</h3>
        <span className="nameplate">Shared hold</span>
      </div>
      <div className="cargo-cards">
        {cards.map((card, i) => (
          <CardFace
            key={card.id}
            card={card}
            index={i}
            animate
            disabled={!selectable}
            onClick={selectable ? () => onSelect?.(card.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
