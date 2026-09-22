import { CSSProperties } from 'react';
import { Card } from '../engine/types';
import CardFace, { describeCard } from './CardFace';
import { groupHand } from './handGroups';

export { describeCard };

export function OwnHand({ hand }: { hand: Card[] }) {
  const groups = groupHand(hand);

  return (
    <div className="own-hand">
      {groups.map((group) => (
        <section key={group.key} className="hand-group" style={{ '--hue': group.hue } as CSSProperties}>
          <header className="hand-group-head">
            <span aria-hidden="true">{group.icon}</span>
            <span className="hand-group-name">{group.label}</span>
            <span className="hand-group-tally mono">
              {group.subtotal === null ? `${group.count}` : `${group.count} · ${group.subtotal}`}
            </span>
          </header>
          <div className="hand-group-cards">
            {group.cards.map((card, i) => (
              <CardFace key={card.id} card={card} index={i} />
            ))}
          </div>
        </section>
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
