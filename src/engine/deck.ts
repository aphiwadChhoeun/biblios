import { Card, CategoryCard, CategoryId, CreditsCard, MissionCard } from './types';

const CATEGORY_SPECS: { category: CategoryId; values: number[] }[] = [
  { category: 'fuel', values: [2, 2, 2, 2, 3, 3, 3, 4, 4] },
  { category: 'crew', values: [2, 2, 2, 2, 3, 3, 3, 4, 4] },
  { category: 'chart', values: [1, 1, 1, 1, 1, 1, 1, 2, 2] },
  { category: 'data', values: [1, 1, 1, 1, 1, 1, 1, 2, 2] },
  { category: 'artifact', values: [1, 1, 1, 1, 1, 1, 1, 2, 2] },
];

const LETTERS = 'ABCDEFGHI';

const MISSION_SPECS: { modifier: MissionCard['modifier']; diceCount: MissionCard['diceCount'] }[] = [
  { modifier: 'plus', diceCount: 1 },
  { modifier: 'plus', diceCount: 1 },
  { modifier: 'minus', diceCount: 1 },
  { modifier: 'minus', diceCount: 1 },
  { modifier: 'plus', diceCount: 2 },
  { modifier: 'plus', diceCount: 2 },
  { modifier: 'minus', diceCount: 2 },
  { modifier: 'minus', diceCount: 2 },
  { modifier: 'mixed', diceCount: 1 },
];

export function buildFullDeck(): Card[] {
  const cards: Card[] = [];
  let idCounter = 0;
  const nextId = () => {
    idCounter += 1;
    return `card-${idCounter}`;
  };

  for (const spec of CATEGORY_SPECS) {
    spec.values.forEach((value, index) => {
      const card: CategoryCard = {
        id: nextId(),
        kind: 'category',
        category: spec.category,
        value,
        tieBreakLetter: LETTERS[index],
      };
      cards.push(card);
    });
  }

  (['1', '2', '3'] as const).forEach((valueStr) => {
    const value = Number(valueStr) as 1 | 2 | 3;
    for (let i = 0; i < 11; i += 1) {
      const card: CreditsCard = { id: nextId(), kind: 'credits', value };
      cards.push(card);
    }
  });

  for (const spec of MISSION_SPECS) {
    const card: MissionCard = { id: nextId(), kind: 'mission', modifier: spec.modifier, diceCount: spec.diceCount };
    cards.push(card);
  }

  return cards;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function applySetupDiscard(deck: Card[], playerCount: number, rng: () => number = Math.random): Card[] {
  let remaining = deck.slice();

  function discardNCreditsOfEachValue(n: number) {
    (['1', '2', '3'] as const).forEach((valueStr) => {
      const value = Number(valueStr) as 1 | 2 | 3;
      let toRemove = n;
      remaining = remaining.filter((card) => {
        if (toRemove > 0 && card.kind === 'credits' && card.value === value) {
          toRemove -= 1;
          return false;
        }
        return true;
      });
    });
  }

  function discardRandom(n: number) {
    const shuffled = shuffle(remaining, rng);
    const removedIds = new Set(shuffled.slice(0, n).map((c) => c.id));
    remaining = remaining.filter((c) => !removedIds.has(c.id));
  }

  if (playerCount === 2) {
    discardNCreditsOfEachValue(2);
    discardRandom(21);
  } else if (playerCount === 3) {
    discardNCreditsOfEachValue(1);
    discardRandom(12);
  } else if (playerCount === 4) {
    discardRandom(7);
  } else {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }

  return remaining;
}

export function buildSetupDeck(playerCount: number, rng: () => number = Math.random): Card[] {
  const full = buildFullDeck();
  const afterDiscard = applySetupDiscard(full, playerCount, rng);
  return shuffle(afterDiscard, rng);
}
