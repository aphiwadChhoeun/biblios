import { CSSProperties } from 'react';
import { CATEGORY_LABEL, CATEGORY_ORDER, GameState } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';
import { useCountUp } from './useCountUp';
import GameTitle from './GameTitle';

const TIE_BREAK_REASON: Record<string, string> = {
  credits: 'most credits',
  crew: 'largest crew',
  'category-cascade': 'category cascade',
};

function TotalCell({ total, isWinner }: { total: number; isWinner: boolean }) {
  const shown = useCountUp(total);
  return <td className={`mono${isWinner ? ' is-winner' : ''}`}>{shown}</td>;
}

export default function EndScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  if (state.pendingAction.type !== 'game-over') return null;
  const result = state.pendingAction.result;
  const winner = state.players.find((p) => p.id === result.winnerId)!;

  return (
    <div className="launch-shell">
      <div className="launch-console wide panel end-screen">
        <GameTitle kicker="Mission complete" />

        <div className="winner-block">
          <span className="winner-name">{winner.name} wins</span>
          {result.tieBreakStage !== 'none' && (
            <span className="tiebreak-note">
              Decided on a tie-break: {TIE_BREAK_REASON[result.tieBreakStage] ?? result.tieBreakStage}.
            </span>
          )}
        </div>

        <table className="score-table">
          <thead>
            <tr>
              <th>Cargo</th>
              {state.players.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
              <th>Winner</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((category) => {
              const catResult = result.categoryResults.find((r) => r.category === category)!;
              const catWinner = catResult.winnerId
                ? state.players.find((p) => p.id === catResult.winnerId)!
                : null;
              return (
                <tr key={category} style={{ '--hue': CATEGORY_COLOR[category] } as CSSProperties}>
                  <td>
                    <span aria-hidden="true">{CATEGORY_ICON[category]}</span> {CATEGORY_LABEL[category]}
                  </td>
                  {state.players.map((p) => (
                    <td key={p.id} className="mono">
                      {catResult.totals[p.id]}
                    </td>
                  ))}
                  <td className={catWinner ? 'cat-winner' : ''}>
                    {catWinner ? catWinner.name : '—'}
                    {catResult.tieBreakUsed ? ' (tie-break)' : ''}
                  </td>
                  <td className="mono points">{catResult.pointsAwarded}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total victory points</td>
              {state.players.map((p) => (
                <TotalCell key={p.id} total={result.diceTotals[p.id]} isWinner={p.id === result.winnerId} />
              ))}
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        <div className="launch-actions">
          <button className="start-button" onClick={onNewGame}>
            Start New Mission
          </button>
        </div>
      </div>
    </div>
  );
}
