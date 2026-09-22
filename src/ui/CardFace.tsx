import { CSSProperties } from 'react';
import { CATEGORY_LABEL, Card } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

/** Plain-text description. Used for accessible labels and anywhere a card has
 *  to be described in a sentence. */
export function describeCard(card: Card): string {
  if (card.kind === 'category') return `${CATEGORY_LABEL[card.category]} ${card.value}${card.tieBreakLetter}`;
  if (card.kind === 'credits') return `Credits ${card.value}`;
  return `Mission Control ${card.modifier === 'mixed' ? '±1' : card.modifier === 'plus' ? '+1' : '-1'} (${card.diceCount}d)`;
}

function missionSymbol(card: Extract<Card, { kind: 'mission' }>): string {
  if (card.modifier === 'mixed') return '±1';
  return card.modifier === 'plus' ? '+1' : '−1';
}

interface CardFaceProps {
  card: Card;
  /** Stagger index for the deal-in animation. */
  index?: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** Deal the card in. Reserve this for cards that genuinely just arrived: a
   *  hand re-mounts on every turn hand-off and should not re-deal each time. */
  animate?: boolean;
}

/** One manifest slip. Renders as a button when it can be picked, a div when it
 *  is only being shown. */
export default function CardFace({
  card,
  index = 0,
  selected,
  onClick,
  disabled,
  className,
  animate = false,
}: CardFaceProps) {
  const hue =
    card.kind === 'category' ? CATEGORY_COLOR[card.category] : card.kind === 'credits' ? '#d8c48a' : '#fc3d21';

  const classes = [
    'card',
    `card-${card.kind}`,
    animate ? 'deal-in' : '',
    selected ? 'selected' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = { '--hue': hue, '--i': index } as CSSProperties;
  const label = describeCard(card);

  const body = (
    <>
      <span className="card-icon" aria-hidden="true">
        {card.kind === 'category' ? CATEGORY_ICON[card.category] : card.kind === 'credits' ? '🪙' : '🛰️'}
      </span>
      <span className="card-name">
        {card.kind === 'category'
          ? CATEGORY_LABEL[card.category]
          : card.kind === 'credits'
            ? 'Credits'
            : 'Mission Control'}
      </span>
      <span className="card-value">
        {card.kind === 'mission' ? missionSymbol(card) : card.value}
      </span>
      <span className="card-code">
        {card.kind === 'category'
          ? `SER ${card.tieBreakLetter}`
          : card.kind === 'credits'
            ? 'BEARER'
            : `${card.diceCount} ${card.diceCount > 1 ? 'DICE' : 'DIE'}`}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={selected}>
        {body}
      </button>
    );
  }

  return (
    <div className={classes} style={style} role="img" aria-label={label}>
      {body}
    </div>
  );
}
