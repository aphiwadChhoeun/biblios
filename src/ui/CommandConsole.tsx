import { CATEGORY_LABEL, CATEGORY_ORDER, GameState } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

export default function CommandConsole({ dice }: { dice: GameState['dice'] }) {
  return (
    <div className="command-console">
      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="die" style={{ borderColor: CATEGORY_COLOR[category] }}>
          <span className="die-icon">{CATEGORY_ICON[category]}</span>
          <span className="die-label">{CATEGORY_LABEL[category]}</span>
          <span className="die-value">{dice[category]}</span>
        </div>
      ))}
    </div>
  );
}
