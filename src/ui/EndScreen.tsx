import { CSSProperties } from 'react';
import { CATEGORY_LABEL, CATEGORY_ORDER, GameState } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';
import { useScoreCascade } from './useScoreCascade';
import GameTitle from './GameTitle';

const TIE_BREAK_REASON: Record<string, string> = {
  credits: 'most credits',
  crew: 'largest crew',
  'category-cascade': 'category cascade',
};

export default function EndScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  // Hooks must run before the early return below, so this is keyed off the
  // fixed category count rather than anything inside the result.
  const { revealedCount, done, skip } = useScoreCascade(CATEGORY_ORDER.length);

  if (state.pendingAction.type !== 'game-over') return null;
  const result = state.pendingAction.result;
  const winner = state.players.find((p) => p.id === result.winnerId)!;

  // CategoryResult already carries its category; order it for display.
  const orderedResults = CATEGORY_ORDER.map(
    (category) => result.categoryResults.find((r) => r.category === category)!
  );

  // Totals are built from the categories revealed so far, so the score climbs
  // with the cascade instead of jumping to its final value.
  const runningTotals: Record<string, number> = {};
  for (const p of state.players) runningTotals[p.id] = 0;
  for (const row of orderedResults.slice(0, revealedCount)) {
    if (row.winnerId) runningTotals[row.winnerId] += row.pointsAwarded;
  }

  return (
    <div className="launch-shell">
      <div className="launch-console wide panel end-screen">
        <GameTitle kicker="Mission complete" />

        <div className="winner-block">
          {done ? (
            <span className="winner-name">{winner.name} wins</span>
          ) : (
            <span className="winner-name pending">Tallying the manifest…</span>
          )}
          {done && result.tieBreakStage !== 'none' && (
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
            {orderedResults.map((row, i) => {
              const revealed = i < revealedCount;
              const catWinner = row.winnerId ? state.players.find((p) => p.id === row.winnerId)! : null;
              return (
                <tr
                  key={row.category}
                  className={revealed ? 'revealed' : 'pending'}
                  style={{ '--hue': CATEGORY_COLOR[row.category] } as CSSProperties}
                >
                  <td>
                    <span aria-hidden="true">{CATEGORY_ICON[row.category]}</span> {CATEGORY_LABEL[row.category]}
                  </td>
                  {state.players.map((p) => (
                    <td key={p.id} className="mono">
                      {revealed ? row.totals[p.id] : '·'}
                    </td>
                  ))}
                  <td className={catWinner ? 'cat-winner' : ''}>
                    {revealed ? (catWinner ? catWinner.name : '—') : ''}
                    {revealed && row.tieBreakUsed ? ' (tie-break)' : ''}
                  </td>
                  <td className="mono points">{revealed ? row.pointsAwarded : ''}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={done ? 'settled' : ''}>
              <td>Total victory points</td>
              {state.players.map((p) => (
                <td
                  key={p.id}
                  className={`mono${done && p.id === result.winnerId ? ' is-winner' : ''}`}
                  data-testid={`total-${p.id}`}
                >
                  {runningTotals[p.id]}
                </td>
              ))}
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        <div className="launch-actions">
          {done ? (
            <button className="start-button" onClick={onNewGame}>
              Start New Mission
            </button>
          ) : (
            <button onClick={skip}>Skip tally</button>
          )}
        </div>
      </div>
    </div>
  );
}
