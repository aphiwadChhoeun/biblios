import { CSSProperties, useEffect, useRef, useState } from 'react';
import { CategoryId, CATEGORY_LABEL, CATEGORY_ORDER, GameState } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_SHORT } from './theme';

const DIE_MAX = 6;

/** Returns the set of categories whose die changed since the last render, so
 *  the gauge that actually moved is the one that lights up. */
function useChangedDice(dice: Record<CategoryId, number>): Set<CategoryId> {
  const previous = useRef(dice);
  const [changed, setChanged] = useState<Set<CategoryId>>(new Set());

  useEffect(() => {
    const moved = CATEGORY_ORDER.filter((c) => previous.current[c] !== dice[c]);
    previous.current = dice;
    if (moved.length === 0) return undefined;
    setChanged(new Set(moved));
    const timer = setTimeout(() => setChanged(new Set()), 600);
    return () => clearTimeout(timer);
  }, [dice]);

  return changed;
}

export default function CommandConsole({ dice }: { dice: GameState['dice'] }) {
  const changed = useChangedDice(dice);

  return (
    <div className="command-console">
      {CATEGORY_ORDER.map((category) => (
        <div
          key={category}
          className={`die${changed.has(category) ? ' changed' : ''}`}
          style={{ '--hue': CATEGORY_COLOR[category] } as CSSProperties}
          title={`${CATEGORY_LABEL[category]}: worth ${dice[category]} victory points`}
        >
          <div className="die-head">
            <span className="die-icon" aria-hidden="true">
              {CATEGORY_ICON[category]}
            </span>
            <span className="die-label">{CATEGORY_SHORT[category]}</span>
          </div>
          <span className="die-value mono">{dice[category]}</span>
          <span
            className="die-bar"
            style={{ width: `${(dice[category] / DIE_MAX) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}
