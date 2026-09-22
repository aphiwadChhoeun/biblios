import { CATEGORY_ORDER, Card, CategoryCard, CategoryId, CategoryResult, CreditsCard, GameState, ScoringResult } from './types';

function categoryTotal(hand: Card[], category: CategoryId): number {
  return hand
    .filter((c): c is CategoryCard => c.kind === 'category' && c.category === category)
    .reduce((sum, c) => sum + c.value, 0);
}

function bestTieBreakLetter(hand: Card[], category: CategoryId): string | null {
  const letters = hand
    .filter((c): c is CategoryCard => c.kind === 'category' && c.category === category)
    .map((c) => c.tieBreakLetter);
  if (letters.length === 0) return null;
  return [...letters].sort()[0];
}

function creditsTotal(hand: Card[]): number {
  return hand.filter((c): c is CreditsCard => c.kind === 'credits').reduce((sum, c) => sum + c.value, 0);
}

function resolveCategory(state: GameState, category: CategoryId): CategoryResult {
  const totals: Record<string, number> = {};
  for (const player of state.players) {
    totals[player.id] = categoryTotal(player.hand, category);
  }
  const maxTotal = Math.max(...Object.values(totals));
  const contenders = state.players.filter((p) => totals[p.id] === maxTotal && maxTotal > 0);

  let winnerId: string | null = null;
  let tieBreakUsed = false;

  if (contenders.length === 1) {
    winnerId = contenders[0].id;
  } else if (contenders.length > 1) {
    tieBreakUsed = true;
    let bestPlayerId = contenders[0].id;
    let bestLetter = bestTieBreakLetter(contenders[0].hand, category)!;
    for (const contender of contenders.slice(1)) {
      const letter = bestTieBreakLetter(contender.hand, category)!;
      if (letter < bestLetter) {
        bestLetter = letter;
        bestPlayerId = contender.id;
      }
    }
    winnerId = bestPlayerId;
  }

  return {
    category,
    totals,
    winnerId,
    tieBreakUsed,
    pointsAwarded: winnerId ? state.dice[category] : 0,
  };
}

function determineGameWinner(
  state: GameState,
  diceTotals: Record<string, number>
): { playerId: string; stage: ScoringResult['tieBreakStage'] } {
  let candidates = state.players.map((p) => p.id);
  const maxDice = Math.max(...candidates.map((id) => diceTotals[id]));
  candidates = candidates.filter((id) => diceTotals[id] === maxDice);
  if (candidates.length === 1) return { playerId: candidates[0], stage: 'none' };

  const creditsByPlayer = Object.fromEntries(state.players.map((p) => [p.id, creditsTotal(p.hand)]));
  const maxCredits = Math.max(...candidates.map((id) => creditsByPlayer[id]));
  const afterCredits = candidates.filter((id) => creditsByPlayer[id] === maxCredits);
  if (afterCredits.length === 1) return { playerId: afterCredits[0], stage: 'credits' };
  candidates = afterCredits;

  const crewByPlayer = Object.fromEntries(
    state.players.map((p) => [p.id, categoryTotal(p.hand, 'crew')])
  );
  const maxCrew = Math.max(...candidates.map((id) => crewByPlayer[id]));
  const afterCrew = candidates.filter((id) => crewByPlayer[id] === maxCrew);
  if (afterCrew.length === 1) return { playerId: afterCrew[0], stage: 'crew' };
  candidates = afterCrew;

  for (const category of CATEGORY_ORDER) {
    const totalsByPlayer = Object.fromEntries(
      state.players.map((p) => [p.id, categoryTotal(p.hand, category)])
    );
    const maxVal = Math.max(...candidates.map((id) => totalsByPlayer[id]));
    const filtered = candidates.filter((id) => totalsByPlayer[id] === maxVal);
    if (filtered.length === 1) return { playerId: filtered[0], stage: 'category-cascade' };
    candidates = filtered;
  }

  return { playerId: candidates[0], stage: 'category-cascade' };
}

export function beginScoring(state: GameState): GameState {
  const categoryResults = CATEGORY_ORDER.map((category) => resolveCategory(state, category));

  const diceTotals: Record<string, number> = {};
  for (const player of state.players) diceTotals[player.id] = 0;
  for (const result of categoryResults) {
    if (result.winnerId) diceTotals[result.winnerId] += result.pointsAwarded;
  }

  const winner = determineGameWinner(state, diceTotals);

  const result: ScoringResult = {
    categoryResults,
    diceTotals,
    winnerId: winner.playerId,
    tieBreakStage: winner.stage,
  };

  return {
    ...state,
    phase: 'scoring',
    pendingAction: { type: 'game-over', result },
  };
}
