import { CATEGORY_LABEL, CATEGORY_ORDER, GameState } from '../engine/types';

export default function EndScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  if (state.pendingAction.type !== 'game-over') return null;
  const result = state.pendingAction.result;
  const winner = state.players.find((p) => p.id === result.winnerId)!;

  return (
    <div className="end-screen">
      <h1>Mission Complete</h1>
      <h2>{winner.name} wins!</h2>
      {result.tieBreakStage !== 'none' && <p>Tie broken by: {result.tieBreakStage}</p>}
      <table>
        <thead>
          <tr>
            <th>Category</th>
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
            return (
              <tr key={category}>
                <td>{CATEGORY_LABEL[category]}</td>
                {state.players.map((p) => (
                  <td key={p.id}>{catResult.totals[p.id]}</td>
                ))}
                <td>
                  {catResult.winnerId ? state.players.find((p) => p.id === catResult.winnerId)!.name : '—'}
                  {catResult.tieBreakUsed ? ' (tie-break)' : ''}
                </td>
                <td>{catResult.pointsAwarded}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Total Victory Points</td>
            {state.players.map((p) => (
              <td key={p.id}>{result.diceTotals[p.id]}</td>
            ))}
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
      <button onClick={onNewGame}>Start new mission</button>
    </div>
  );
}
