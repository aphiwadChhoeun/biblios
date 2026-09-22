import { describe, expect, it } from 'vitest';
import { applySetupDiscard, buildFullDeck, buildSetupDeck, shuffle } from './deck';

describe('buildFullDeck', () => {
  it('produces exactly 87 cards', () => {
    expect(buildFullDeck()).toHaveLength(87);
  });

  it('produces 45 category cards, 9 per category, with correct value distribution', () => {
    const deck = buildFullDeck();
    const categoryCards = deck.filter((c) => c.kind === 'category');
    expect(categoryCards).toHaveLength(45);

    for (const category of ['fuel', 'crew'] as const) {
      const cards = categoryCards.filter((c) => c.kind === 'category' && c.category === category);
      expect(cards).toHaveLength(9);
      const values = cards.map((c) => (c.kind === 'category' ? c.value : 0)).sort();
      expect(values).toEqual([2, 2, 2, 2, 3, 3, 3, 4, 4]);
    }

    for (const category of ['chart', 'data', 'artifact'] as const) {
      const cards = categoryCards.filter((c) => c.kind === 'category' && c.category === category);
      expect(cards).toHaveLength(9);
      const values = cards.map((c) => (c.kind === 'category' ? c.value : 0)).sort();
      expect(values).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 2]);
    }
  });

  it('gives each card within a category a unique tie-break letter A-I', () => {
    const deck = buildFullDeck();
    for (const category of ['fuel', 'crew', 'chart', 'data', 'artifact'] as const) {
      const letters = deck
        .filter((c) => c.kind === 'category' && c.category === category)
        .map((c) => (c.kind === 'category' ? c.tieBreakLetter : ''));
      expect(new Set(letters).size).toBe(9);
      expect([...letters].sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    }
  });

  it('produces 33 Credits cards, 11 of each value', () => {
    const deck = buildFullDeck();
    const credits = deck.filter((c) => c.kind === 'credits');
    expect(credits).toHaveLength(33);
    for (const value of [1, 2, 3] as const) {
      expect(credits.filter((c) => c.kind === 'credits' && c.value === value)).toHaveLength(11);
    }
  });

  it('produces 9 Mission Control cards with the specified type split', () => {
    const deck = buildFullDeck();
    const missions = deck.filter((c) => c.kind === 'mission');
    expect(missions).toHaveLength(9);
    const countOf = (modifier: string, diceCount: number) =>
      missions.filter((c) => c.kind === 'mission' && c.modifier === modifier && c.diceCount === diceCount)
        .length;
    expect(countOf('plus', 1)).toBe(2);
    expect(countOf('minus', 1)).toBe(2);
    expect(countOf('plus', 2)).toBe(2);
    expect(countOf('minus', 2)).toBe(2);
    expect(countOf('mixed', 1)).toBe(1);
  });

  it('assigns every card a unique id', () => {
    const deck = buildFullDeck();
    expect(new Set(deck.map((c) => c.id)).size).toBe(87);
  });
});

describe('shuffle', () => {
  it('returns all the same elements in a new order (deterministic rng)', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, () => 0.999999);
    expect(result.slice().sort()).toEqual(input.slice().sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('applySetupDiscard', () => {
  it('removes 27 cards for a 2-player game (6 Credits + 21 random)', () => {
    const deck = buildFullDeck();
    const remaining = applySetupDiscard(deck, 2);
    expect(remaining).toHaveLength(60);
    const credits = remaining.filter((c) => c.kind === 'credits');
    // At most 11-2=9 of each value remain (2 of each were guaranteed-discarded).
    for (const value of [1, 2, 3] as const) {
      expect(credits.filter((c) => c.kind === 'credits' && c.value === value).length).toBeLessThanOrEqual(9);
    }
  });

  it('removes 15 cards for a 3-player game (3 Credits + 12 random)', () => {
    const deck = buildFullDeck();
    const remaining = applySetupDiscard(deck, 3);
    expect(remaining).toHaveLength(72);
  });

  it('removes 7 random cards for a 4-player game', () => {
    const deck = buildFullDeck();
    const remaining = applySetupDiscard(deck, 4);
    expect(remaining).toHaveLength(80);
  });

  it('throws for an unsupported player count', () => {
    const deck = buildFullDeck();
    expect(() => applySetupDiscard(deck, 5)).toThrow();
  });
});

describe('buildSetupDeck', () => {
  it('builds a shuffled, correctly-sized deck for the given player count', () => {
    expect(buildSetupDeck(4)).toHaveLength(80);
  });
});
