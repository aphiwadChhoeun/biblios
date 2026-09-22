import { describe, expect, it } from 'vitest';
import { groupHand } from './handGroups';
import { Card, CategoryId } from '../engine/types';

let seq = 0;
const nextId = () => `c${(seq += 1)}`;

function cat(category: CategoryId, value: number, tieBreakLetter = 'A'): Card {
  return { id: nextId(), kind: 'category', category, value, tieBreakLetter };
}
function credits(value: 1 | 2 | 3): Card {
  return { id: nextId(), kind: 'credits', value };
}
function mission(modifier: 'plus' | 'minus' | 'mixed', diceCount: 1 | 2): Card {
  return { id: nextId(), kind: 'mission', modifier, diceCount };
}

describe('groupHand', () => {
  it('returns an empty list for an empty hand', () => {
    expect(groupHand([])).toEqual([]);
  });

  it('omits groups with no cards', () => {
    const groups = groupHand([cat('fuel', 2), credits(1)]);
    expect(groups.map((g) => g.key)).toEqual(['fuel', 'credits']);
  });

  it('orders categories by CATEGORY_ORDER, then credits, then mission control', () => {
    const groups = groupHand([
      mission('plus', 1),
      credits(2),
      cat('artifact', 1),
      cat('fuel', 2),
      cat('data', 1),
      cat('crew', 3),
      cat('chart', 1),
    ]);

    expect(groups.map((g) => g.key)).toEqual(['fuel', 'crew', 'chart', 'data', 'artifact', 'credits', 'mission']);
  });

  it('sorts cards within a group by descending value', () => {
    const groups = groupHand([cat('fuel', 2), cat('fuel', 4), cat('fuel', 3)]);

    expect(groups[0].cards.map((c) => (c.kind === 'category' ? c.value : null))).toEqual([4, 3, 2]);
  });

  it('subtotals a category group by summing card values', () => {
    const groups = groupHand([cat('fuel', 4), cat('fuel', 3), cat('fuel', 2)]);

    expect(groups[0].count).toBe(3);
    expect(groups[0].subtotal).toBe(9);
  });

  it('subtotals credits by summing their values', () => {
    const groups = groupHand([credits(3), credits(2), credits(1), credits(1)]);

    expect(groups[0].count).toBe(4);
    expect(groups[0].subtotal).toBe(7);
  });

  it('gives the mission control group no subtotal, because its cards do not sum', () => {
    const groups = groupHand([mission('plus', 2), mission('minus', 1)]);

    expect(groups[0].key).toBe('mission');
    expect(groups[0].count).toBe(2);
    expect(groups[0].subtotal).toBeNull();
  });

  it('keeps every card from the hand', () => {
    const hand = [cat('fuel', 2), credits(1), mission('mixed', 1), cat('crew', 4)];
    const grouped = groupHand(hand).flatMap((g) => g.cards);

    expect(grouped).toHaveLength(hand.length);
    expect(new Set(grouped.map((c) => c.id))).toEqual(new Set(hand.map((c) => c.id)));
  });
});
