import { CATEGORY_LABEL, Card } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

export function describeCard(card: Card): string {
  if (card.kind === 'category') return `${CATEGORY_LABEL[card.category]} ${card.value}${card.tieBreakLetter}`;
  if (card.kind === 'credits') return `Credits ${card.value}`;
  return `Mission Control ${card.modifier === 'mixed' ? '±1' : card.modifier === 'plus' ? '+1' : '-1'} (${card.diceCount}d)`;
}

export function OwnHand({ hand }: { hand: Card[] }) {
  return (
    <div className="own-hand">
      {hand.map((card) => (
        <div
          key={card.id}
          className={`card card-${card.kind}`}
          style={card.kind === 'category' ? { borderColor: CATEGORY_COLOR[card.category] } : undefined}
        >
          {card.kind === 'category' && <span>{CATEGORY_ICON[card.category]}</span>}
          <span>{describeCard(card)}</span>
        </div>
      ))}
    </div>
  );
}

export function OpponentSeat({
  name,
  cardCount,
  isActive,
}: {
  name: string;
  cardCount: number;
  isActive: boolean;
}) {
  return (
    <div className={`opponent-seat${isActive ? ' active' : ''}`}>
      <div className="opponent-name">{name}</div>
      <div className="opponent-cardback">{'🂠'.repeat(Math.min(cardCount, 10))} {cardCount}</div>
    </div>
  );
}
