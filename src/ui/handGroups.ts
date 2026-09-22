import { Card, CATEGORY_LABEL, CATEGORY_ORDER, CategoryId } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

export interface HandGroup {
  key: string;
  label: string;
  icon: string;
  hue: string;
  cards: Card[];
  count: number;
  /** null where the cards do not meaningfully sum (Mission Control). */
  subtotal: number | null;
}

const CREDITS_HUE = '#d8c48a';
const MISSION_HUE = '#fc3d21';

function byValueDesc(a: Card, b: Card): number {
  const av = 'value' in a ? a.value : 0;
  const bv = 'value' in b ? b.value : 0;
  return bv - av;
}

function sumValues(cards: Card[]): number {
  return cards.reduce((total, card) => total + ('value' in card ? card.value : 0), 0);
}

/**
 * Splits a hand into display groups: the five cargo categories in scoring
 * order, then credits, then Mission Control. Empty groups are dropped.
 *
 * Mission Control gets no subtotal on purpose — a +1 and a -1 do not add up to
 * anything a player could act on, so showing a number there would mislead.
 */
export function groupHand(hand: Card[]): HandGroup[] {
  const groups: HandGroup[] = [];

  for (const category of CATEGORY_ORDER) {
    const cards = hand
      .filter((c): c is Extract<Card, { kind: 'category' }> => c.kind === 'category' && c.category === category)
      .sort(byValueDesc);
    if (cards.length === 0) continue;
    groups.push({
      key: category as CategoryId,
      label: CATEGORY_LABEL[category],
      icon: CATEGORY_ICON[category],
      hue: CATEGORY_COLOR[category],
      cards,
      count: cards.length,
      subtotal: sumValues(cards),
    });
  }

  const creditCards = hand.filter((c) => c.kind === 'credits').sort(byValueDesc);
  if (creditCards.length > 0) {
    groups.push({
      key: 'credits',
      label: 'Credits',
      icon: '🪙',
      hue: CREDITS_HUE,
      cards: creditCards,
      count: creditCards.length,
      subtotal: sumValues(creditCards),
    });
  }

  const missionCards = hand.filter((c) => c.kind === 'mission');
  if (missionCards.length > 0) {
    groups.push({
      key: 'mission',
      label: 'Mission Control',
      icon: '🛰️',
      hue: MISSION_HUE,
      cards: missionCards,
      count: missionCards.length,
      subtotal: null,
    });
  }

  return groups;
}
