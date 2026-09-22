import { CSSProperties } from 'react';
import { CATEGORY_ORDER } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_SHORT } from './theme';

/** Masthead for the setup, resume and end screens. The five cargo hues run
 *  underneath it, so the thing you compete over is the first thing you see. */
export default function GameTitle({ kicker }: { kicker?: string }) {
  return (
    <div className="masthead">
      <h1 className="game-title">Star Manifest</h1>
      <div className="title-rule" />
      {kicker && <span className="nameplate">{kicker}</span>}
      <div className="cargo-key">
        {CATEGORY_ORDER.map((category) => (
          <span
            key={category}
            className="cargo-chip"
            style={{ '--hue': CATEGORY_COLOR[category] } as CSSProperties}
          >
            <span aria-hidden="true">{CATEGORY_ICON[category]}</span>
            {CATEGORY_SHORT[category]}
          </span>
        ))}
      </div>
    </div>
  );
}
