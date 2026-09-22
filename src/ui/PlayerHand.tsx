import { Card } from '../engine/types';
import CardFace, { describeCard } from './CardFace';

export { describeCard };

export function OwnHand({ hand }: { hand: Card[] }) {
  return (
    <div className="own-hand">
      {hand.map((card, i) => (
        <CardFace key={card.id} card={card} index={i} />
      ))}
    </div>
  );
}

export function OpponentSeat({
  name,
  cardCount,
  isActive,
  isAI,
}: {
  name: string;
  cardCount: number;
  isActive: boolean;
  isAI?: boolean;
}) {
  return (
    <div className={`opponent-seat${isActive ? ' active' : ''}`}>
      <div className="opponent-name">{name}</div>
      <div className="opponent-role">{isActive ? 'Acting now' : isAI ? 'Computer' : 'Standing by'}</div>
      <div className="opponent-cardback">
        <span className="cardback-stack" aria-hidden="true">
          {Array.from({ length: Math.min(cardCount, 12) }, (_, i) => (
            <span key={i} className="cardback" />
          ))}
        </span>
        <span className="cardback-count">
          {cardCount} card{cardCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
