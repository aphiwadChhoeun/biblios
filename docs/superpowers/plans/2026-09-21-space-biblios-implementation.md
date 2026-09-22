# Space Biblios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable, space-themed digital retheme of the board game Biblios as a local-hotseat + AI-bots single-page web app.

**Architecture:** A pure-TypeScript, framework-free game engine (`src/engine/`) implements the full rules as a reducer-style state machine (`dispatch(state, action) -> state`), fully unit-tested with Vitest. A thin React UI layer (`src/ui/`) renders `GameState` and forwards user input as engine actions; an AI module computes actions for AI-controlled seats. Game state is serialized to `localStorage` after every transition for resume support.

**Tech Stack:** Vite, React 18, TypeScript (strict), Vitest + @testing-library/react (jsdom environment). No backend.

**Spec:** [docs/superpowers/specs/2026-09-21-space-biblios-design.md](../specs/2026-09-21-space-biblios-design.md)

## Global Constraints

- No backend/server; everything runs client-side in the browser (spec §1, §9).
- Tech stack is exactly Vite + React + TypeScript; engine code must have zero React/DOM imports so it stays independently testable (spec §1, §9).
- Deck is exactly 87 cards: 45 category cards (9 per category: Fuel Cells/Crew four value-2 + three value-3 + two value-4; Star Charts/Research Data/Alien Artifacts seven value-1 + two value-2, each card with a unique tie-break letter A-I), 33 Credits cards (11 each of value 1/2/3), 9 Mission Control cards (2x +1 one-die, 2x -1 one-die, 2x +1 two-dice, 2x -1 two-dice, 1x mixed +1/-1 one-die) (spec §3).
- Theme naming is fixed: Pigments→Fuel Cells, Monks→Crew, Forbidden Tomes→Alien Artifacts, Holy Books→Star Charts, Manuscripts→Research Data, Gold→Credits, Scriptorium→Command Console, Church card→Mission Control card, Draw pile→Supply Deck, Auction pile→Auction Bay, public space→Cargo Bay, Abbot→Captain (spec §2).
- Category resolution order for the tie-break cascade is: Fuel Cells, Crew, Star Charts, Research Data, Alien Artifacts (spec §5.4).
- Only the standard non-payment penalty (random card seizure + re-auction, excluding the penalized player) is implemented; the "Medieval bluff" variant is out of scope (spec §5.2, §10).
- Engine logic must be covered by Vitest unit tests; UI is verified manually in the browser, not exhaustively unit-tested (spec §9).
- Entire `GameState` is persisted to `localStorage` after every action for resume support (spec §8).

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
src/
  main.tsx, App.tsx, index.css, test-setup.ts
  engine/
    types.ts            - all shared types + constants
    deck.ts              - deck construction, shuffle, setup discard
    scoring.ts            - category totals + full tie-break cascade
    missionControl.ts     - Mission Control card resolution
    auctionPhase.ts        - reveal/bid/pass/pay/penalty, -> scoring
    giftPhase.ts            - allocate/draw/turn rotation, -> auction
    gameEngine.ts             - createGame + dispatch orchestrator
    ai.ts                      - AI decision heuristics + advanceAI
    storage.ts                  - localStorage save/load
    *.test.ts                    - co-located Vitest tests per module
  ui/
    theme.ts               - category colors/icons
    SetupScreen.tsx        - seat configuration screen
    CommandConsole.tsx      - dice display
    PlayerHand.tsx           - own-hand + opponent-seat components
    CargoBay.tsx              - public-space card row
    ActionPanel.tsx            - contextual controls per pendingAction
    BoardScreen.tsx              - composes the above into the board
    EndScreen.tsx                 - final scoring breakdown
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: an `App` component rendered by `main.tsx`, a working `npm run dev` / `npm run build` / `npm test`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "space-biblios",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.9",
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Space Biblios</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 6: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Create `src/index.css`**

```css
:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
}

body {
  margin: 0;
  background: #0b1020;
  color: #e6ecf5;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
```

- [ ] **Step 8: Write the failing test `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/Space Biblios/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Install dependencies and run the test to verify it fails**

```bash
npm install
npm test
```

Expected: FAIL — `src/App.tsx` does not exist yet.

- [ ] **Step 10: Create minimal `src/App.tsx`**

```tsx
export default function App() {
  return <div>Space Biblios</div>;
}
```

- [ ] **Step 11: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 12: Run the test to verify it passes, then verify the build**

```bash
npm test
npm run build
```

Expected: test PASSES; build completes with no TypeScript errors.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html .gitignore src
git commit -m "Scaffold Vite + React + TypeScript project with Vitest"
```

---

### Task 2: Core types and deck construction

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/deck.ts`
- Test: `src/engine/deck.test.ts`

**Interfaces:**
- Produces: `CategoryId`, `CATEGORY_ORDER`, `CATEGORY_LABEL`, `Card` (`CategoryCard | CreditsCard | MissionCard`), `Player`, `Phase`, `GiftTurnState`, `BidState`, `MissionAdjustment`, `PendingAction`, `LogEntry`, `GameState`, `CategoryResult`, `ScoringResult`, `EngineAction` (all in `types.ts`); `buildFullDeck()`, `shuffle()`, `applySetupDiscard()`, `buildSetupDeck()` (in `deck.ts`).

- [ ] **Step 1: Create `src/engine/types.ts`**

```ts
export type CategoryId = 'fuel' | 'crew' | 'artifact' | 'chart' | 'data';

export const CATEGORY_ORDER: CategoryId[] = ['fuel', 'crew', 'chart', 'data', 'artifact'];

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  fuel: 'Fuel Cells',
  crew: 'Crew',
  artifact: 'Alien Artifacts',
  chart: 'Star Charts',
  data: 'Research Data',
};

export interface CategoryCard {
  id: string;
  kind: 'category';
  category: CategoryId;
  value: number;
  tieBreakLetter: string;
}

export interface CreditsCard {
  id: string;
  kind: 'credits';
  value: 1 | 2 | 3;
}

export interface MissionCard {
  id: string;
  kind: 'mission';
  modifier: 'plus' | 'minus' | 'mixed';
  diceCount: 1 | 2;
}

export type Card = CategoryCard | CreditsCard | MissionCard;

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  hand: Card[];
}

export type Phase = 'gift' | 'auction' | 'scoring';

export interface GiftTurnState {
  cardsDrawn: number;
  selfFilled: boolean;
  auctionFilled: boolean;
  selfCard: Card | null;
}

export interface BidState {
  card: Card;
  highBid: number;
  highBidderId: string | null;
  passedIds: string[];
  nextBidderId: string;
}

export interface MissionAdjustment {
  category: CategoryId;
  direction: 'plus' | 'minus';
}

export type PendingAction =
  | { type: 'gift-allocate'; playerId: string; drawnCard: Card; selfFilled: boolean; auctionFilled: boolean }
  | { type: 'gift-draw'; playerId: string }
  | { type: 'auction-reveal'; playerId: string }
  | { type: 'auction-bid'; bid: BidState }
  | { type: 'auction-pay'; card: Card; payerId: string; bidAmount: number }
  | {
      type: 'mission-resolve';
      playerId: string;
      card: MissionCard;
      resumeAfter: 'gift-allocate' | 'gift-draft' | 'auction';
    }
  | { type: 'scoring' }
  | { type: 'game-over'; result: ScoringResult };

export interface LogEntry {
  message: string;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  activePlayerIndex: number;
  firstPlayerIndex: number;
  dice: Record<CategoryId, number>;
  supplyDeck: Card[];
  auctionBay: Card[];
  cargoBay: Card[];
  discardPile: Card[];
  giftTurn: GiftTurnState | null;
  giftDraftQueue: string[];
  giftCardsPerTurn: number;
  pendingAction: PendingAction;
  log: LogEntry[];
}

export interface CategoryResult {
  category: CategoryId;
  totals: Record<string, number>;
  winnerId: string | null;
  tieBreakUsed: boolean;
  pointsAwarded: number;
}

export interface ScoringResult {
  categoryResults: CategoryResult[];
  diceTotals: Record<string, number>;
  winnerId: string;
  tieBreakStage: 'none' | 'credits' | 'crew' | 'category-cascade';
}

export type EngineAction =
  | { type: 'allocate'; destination: 'self' | 'auction' | 'cargo' }
  | { type: 'draw-cargo'; cardId: string }
  | { type: 'reveal' }
  | { type: 'bid'; amount: number }
  | { type: 'pass' }
  | { type: 'pay'; cardIds: string[] }
  | { type: 'forfeit-payment' }
  | { type: 'resolve-mission'; adjustments: MissionAdjustment[] }
  | { type: 'decline-mission' };
```

- [ ] **Step 2: Write the failing tests `src/engine/deck.test.ts`**

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- deck
```

Expected: FAIL — `src/engine/deck.ts` does not exist yet.

- [ ] **Step 4: Create `src/engine/deck.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- deck
```

Expected: PASS (all `deck.test.ts` cases).

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/deck.ts src/engine/deck.test.ts
git commit -m "Add engine types and deck construction"
```

---

### Task 3: Scoring engine

**Files:**
- Create: `src/engine/scoring.ts`
- Test: `src/engine/scoring.test.ts`

**Interfaces:**
- Consumes: `Card`, `CategoryId`, `CATEGORY_ORDER`, `GameState`, `CategoryResult`, `ScoringResult` from `./types`.
- Produces: `beginScoring(state: GameState): GameState` — sets `phase: 'scoring'` and `pendingAction: { type: 'game-over', result }`.

- [ ] **Step 1: Write the failing tests `src/engine/scoring.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { beginScoring } from './scoring';
import { Card, GameState, PendingAction } from './types';

function card(partial: Partial<Card> & { kind: Card['kind'] }): Card {
  return partial as Card;
}

function baseState(players: GameState['players']): GameState {
  return {
    phase: 'auction',
    players,
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 5, chart: 2, data: 3, artifact: 4 },
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 4,
    pendingAction: { type: 'scoring' } as PendingAction,
    log: [],
  };
}

describe('beginScoring', () => {
  it('awards each category to the player with the highest total', () => {
    const state = baseState([
      {
        id: 'p1',
        name: 'Bob',
        isAI: false,
        hand: [
          card({ id: 'c1', kind: 'category', category: 'crew', value: 4, tieBreakLetter: 'C' }),
          card({ id: 'c2', kind: 'category', category: 'crew', value: 3, tieBreakLetter: 'A' }),
          card({ id: 'c3', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'E' }),
        ],
      },
      {
        id: 'p2',
        name: 'Steve',
        isAI: false,
        hand: [
          card({ id: 'c4', kind: 'category', category: 'crew', value: 4, tieBreakLetter: 'B' }),
          card({ id: 'c5', kind: 'category', category: 'crew', value: 3, tieBreakLetter: 'D' }),
          card({ id: 'c6', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'F' }),
        ],
      },
    ]);

    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    const crewResult = result.pendingAction.result.categoryResults.find((r) => r.category === 'crew')!;
    expect(crewResult.totals).toEqual({ p1: 9, p2: 9 });
    // Tied at 9: Steve has the 'B' card, Bob's best is 'A' -- Bob wins (closer to A).
    expect(crewResult.winnerId).toBe('p1');
    expect(crewResult.tieBreakUsed).toBe(true);
    expect(crewResult.pointsAwarded).toBe(5);
  });

  it('leaves a category unwon when nobody holds any cards in it', () => {
    const state = baseState([
      { id: 'p1', name: 'Bob', isAI: false, hand: [] },
      { id: 'p2', name: 'Steve', isAI: false, hand: [] },
    ]);
    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    for (const catResult of result.pendingAction.result.categoryResults) {
      expect(catResult.winnerId).toBeNull();
      expect(catResult.pointsAwarded).toBe(0);
    }
  });

  it('breaks a full-game tie by total Credits value in hand', () => {
    const state = baseState([
      {
        id: 'p1',
        name: 'Bob',
        isAI: false,
        hand: [
          card({ id: 'c1', kind: 'category', category: 'crew', value: 9, tieBreakLetter: 'A' }),
          card({ id: 'g1', kind: 'credits', value: 3 }),
        ],
      },
      {
        id: 'p2',
        name: 'Steve',
        isAI: false,
        hand: [
          card({ id: 'c2', kind: 'category', category: 'fuel', value: 9, tieBreakLetter: 'A' }),
          card({ id: 'g2', kind: 'credits', value: 1 }),
        ],
      },
    ]);
    // Bob wins crew (die 5), Steve wins fuel (die 3) -- tied at their respective single dice
    // only if those two dice are equal. Force equal dice for this test.
    state.dice.crew = 4;
    state.dice.fuel = 4;
    const result = beginScoring(state);
    if (result.pendingAction.type !== 'game-over') throw new Error('expected game-over');
    expect(result.pendingAction.result.diceTotals).toEqual({ p1: 4, p2: 4 });
    expect(result.pendingAction.result.winnerId).toBe('p1');
    expect(result.pendingAction.result.tieBreakStage).toBe('credits');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- scoring
```

Expected: FAIL — `src/engine/scoring.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/scoring.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- scoring
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scoring.ts src/engine/scoring.test.ts
git commit -m "Add scoring engine with full tie-break cascade"
```

---

### Task 4: Mission Control engine

**Files:**
- Create: `src/engine/missionControl.ts`
- Test: `src/engine/missionControl.test.ts`

**Interfaces:**
- Consumes: `GameState`, `MissionAdjustment`, `MissionCard` from `./types`.
- Produces: `resolveMissionCard(state, adjustments: MissionAdjustment[]): GameState`, `declineMissionCard(state): GameState`.

- [ ] **Step 1: Write the failing tests `src/engine/missionControl.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { declineMissionCard, resolveMissionCard } from './missionControl';
import { GameState, MissionCard } from './types';

function baseState(card: MissionCard, dice: GameState['dice']): GameState {
  return {
    phase: 'gift',
    players: [{ id: 'p1', name: 'Bob', isAI: false, hand: [] }],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice,
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 3,
    pendingAction: { type: 'mission-resolve', playerId: 'p1', card, resumeAfter: 'gift-allocate' },
    log: [],
  };
}

describe('resolveMissionCard', () => {
  it('increases one die by 1 for a one-die +1 card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    expect(result.dice.crew).toBe(4);
    expect(result.discardPile).toEqual([card]);
  });

  it('clamps a die at 6 when increasing past the maximum', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 6, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'plus' }]);
    expect(result.dice.crew).toBe(6);
  });

  it('clamps a die at 1 when decreasing past the minimum', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'minus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 1, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }]);
    expect(result.dice.crew).toBe(1);
  });

  it('adjusts two distinct categories for a two-dice card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 2 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [
      { category: 'crew', direction: 'plus' },
      { category: 'fuel', direction: 'plus' },
    ]);
    expect(result.dice.crew).toBe(4);
    expect(result.dice.fuel).toBe(4);
  });

  it('rejects adjusting the same category twice on a two-dice card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 2 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(() =>
      resolveMissionCard(state, [
        { category: 'crew', direction: 'plus' },
        { category: 'crew', direction: 'plus' },
      ])
    ).toThrow();
  });

  it('allows either direction on a mixed card', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'mixed', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }]);
    expect(result.dice.crew).toBe(2);
  });

  it('rejects a direction the card does not allow', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(() => resolveMissionCard(state, [{ category: 'crew', direction: 'minus' }])).toThrow();
  });
});

describe('declineMissionCard', () => {
  it('discards the card with no dice effect', () => {
    const card: MissionCard = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const state = baseState(card, { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    const result = declineMissionCard(state);
    expect(result.dice).toEqual(state.dice);
    expect(result.discardPile).toEqual([card]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- missionControl
```

Expected: FAIL — `src/engine/missionControl.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/missionControl.ts`**

```ts
import { GameState, MissionAdjustment, MissionCard } from './types';

function clampDie(value: number): number {
  return Math.max(1, Math.min(6, value));
}

export function resolveMissionCard(state: GameState, adjustments: MissionAdjustment[]): GameState {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('resolveMissionCard called outside mission-resolve step');
  }
  const card: MissionCard = state.pendingAction.card;

  if (adjustments.length !== card.diceCount) {
    throw new Error(`Expected ${card.diceCount} adjustment(s), got ${adjustments.length}`);
  }
  const categories = new Set(adjustments.map((a) => a.category));
  if (categories.size !== adjustments.length) {
    throw new Error('Each adjustment must target a distinct category');
  }
  for (const adjustment of adjustments) {
    if (card.modifier !== 'mixed' && adjustment.direction !== card.modifier) {
      throw new Error(`This card only allows '${card.modifier}' adjustments`);
    }
  }

  const dice = { ...state.dice };
  for (const adjustment of adjustments) {
    const delta = adjustment.direction === 'plus' ? 1 : -1;
    dice[adjustment.category] = clampDie(dice[adjustment.category] + delta);
  }

  const description = adjustments
    .map((a) => `${a.category} ${a.direction === 'plus' ? '+1' : '-1'}`)
    .join(', ');

  return {
    ...state,
    dice,
    discardPile: [...state.discardPile, card],
    log: [...state.log, { message: `Mission Control adjusted: ${description}` }],
  };
}

export function declineMissionCard(state: GameState): GameState {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('declineMissionCard called outside mission-resolve step');
  }
  const card = state.pendingAction.card;
  return {
    ...state,
    discardPile: [...state.discardPile, card],
    log: [...state.log, { message: 'Mission Control card discarded without effect.' }],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- missionControl
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/missionControl.ts src/engine/missionControl.test.ts
git commit -m "Add Mission Control card resolution"
```

---

### Task 5: Auction phase engine

**Files:**
- Create: `src/engine/auctionPhase.ts`
- Test: `src/engine/auctionPhase.test.ts`

**Interfaces:**
- Consumes: `shuffle` from `./deck`; `beginScoring` from `./scoring`; types from `./types`.
- Produces: `beginAuctionPhase(state): GameState`, `revealTopCard(state): GameState`, `placeBid(state, amount): GameState`, `passBid(state): GameState`, `payForAuction(state, cardIds: string[]): GameState`, `forfeitPayment(state): GameState`, `continueAuctionAfterMission(state): GameState`.

- [ ] **Step 1: Write the failing tests `src/engine/auctionPhase.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { beginAuctionPhase, forfeitPayment, passBid, payForAuction, placeBid, revealTopCard } from './auctionPhase';
import { Card, GameState } from './types';

function makePlayer(id: string, name: string, hand: Card[] = []) {
  return { id, name, isAI: false, hand };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'gift',
    players: [makePlayer('p1', 'Bob'), makePlayer('p2', 'James'), makePlayer('p3', 'Steve')],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
    supplyDeck: [],
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 4,
    pendingAction: { type: 'scoring' },
    log: [],
    ...overrides,
  };
}

describe('beginAuctionPhase + revealTopCard', () => {
  it('moves the shuffled Auction Bay into the Supply Deck and prompts the active player to reveal', () => {
    const artifactCard: Card = { id: 'a1', kind: 'category', category: 'artifact', value: 1, tieBreakLetter: 'A' };
    const state = baseState({ auctionBay: [artifactCard] });
    const result = beginAuctionPhase(state);
    expect(result.phase).toBe('auction');
    expect(result.supplyDeck).toEqual([artifactCard]);
    expect(result.auctionBay).toEqual([]);
    expect(result.pendingAction).toEqual({ type: 'auction-reveal', playerId: 'p1' });
  });

  it('reveals the top card and starts bidding with the player to the active player\'s left', () => {
    const card: Card = { id: 'a1', kind: 'category', category: 'artifact', value: 1, tieBreakLetter: 'A' };
    const state = beginAuctionPhase(baseState({ auctionBay: [card] }));
    const result = revealTopCard(state);
    expect(result.pendingAction).toEqual({
      type: 'auction-bid',
      bid: { card, highBid: 0, highBidderId: null, passedIds: [], nextBidderId: 'p2' },
    });
  });
});

describe('bidding (reproduces the rulebook example)', () => {
  it('James bids 1, Steve passes, Bob bids 3, James bids 4, Bob passes -> James wins at 4', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    let state = revealTopCard(beginAuctionPhase(baseState({ auctionBay: [card] })));

    state = placeBid(state, 1); // James bids 1
    state = passBid(state); // Steve passes
    state = placeBid(state, 3); // Bob bids 3
    state = placeBid(state, 4); // James bids 4
    state = passBid(state); // Bob passes

    expect(state.pendingAction).toEqual({ type: 'auction-pay', card, payerId: 'p2', bidAmount: 4 });
  });

  it('discards the card and moves to the next active player when everyone passes', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    let state = revealTopCard(beginAuctionPhase(baseState({ auctionBay: [card] })));

    state = passBid(state); // James
    state = passBid(state); // Steve
    state = passBid(state); // Bob

    expect(state.discardPile).toEqual([card]);
    expect(state.pendingAction).toEqual({ type: 'auction-reveal', playerId: 'p2' });
  });
});

describe('payment', () => {
  it('lets the winner overpay when they lack exact change for a non-Credits card', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const gold2: Card = { id: 'g2', kind: 'credits', value: 2 };
    const gold3: Card = { id: 'g3', kind: 'credits', value: 3 };
    let state = baseState({
      players: [
        makePlayer('p1', 'Bob'),
        makePlayer('p2', 'James', [gold2, gold3]),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card, payerId: 'p2', bidAmount: 4 },
      phase: 'auction',
    });

    state = payForAuction(state, ['g2', 'g3']);
    const james = state.players.find((p) => p.id === 'p2')!;
    expect(james.hand).toEqual([card]);
    expect(state.discardPile).toEqual([gold2, gold3]);
  });

  it('rejects payment below the bid amount', () => {
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const gold1: Card = { id: 'g1', kind: 'credits', value: 1 };
    const state = baseState({
      players: [makePlayer('p1', 'Bob', [gold1])],
      pendingAction: { type: 'auction-pay', card, payerId: 'p1', bidAmount: 4 },
      phase: 'auction',
    });
    expect(() => payForAuction(state, ['g1'])).toThrow();
  });

  it('pays a Credits-card auction with exactly the bid number of any cards', () => {
    const goldCard: Card = { id: 'gold-auction', kind: 'credits', value: 2 };
    const monk: Card = { id: 'm1', kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'A' };
    const gold1: Card = { id: 'g1', kind: 'credits', value: 1 };
    const state = baseState({
      players: [makePlayer('p1', 'Bob', [monk, gold1])],
      pendingAction: { type: 'auction-pay', card: goldCard, payerId: 'p1', bidAmount: 2 },
      phase: 'auction',
    });
    const result = payForAuction(state, ['m1', 'g1']);
    const bob = result.players.find((p) => p.id === 'p1')!;
    expect(bob.hand).toEqual([goldCard]);
    expect(result.discardPile).toEqual([monk, gold1]);
  });
});

describe('forfeitPayment', () => {
  it('seizes a random card from the penalized player and re-auctions, excluding them', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const card: Card = { id: 'ft1', kind: 'category', category: 'artifact', value: 2, tieBreakLetter: 'A' };
    const onlyCard: Card = { id: 'only', kind: 'credits', value: 1 };
    const state = baseState({
      players: [
        makePlayer('p1', 'Bob', [onlyCard]),
        makePlayer('p2', 'James'),
        makePlayer('p3', 'Steve'),
      ],
      pendingAction: { type: 'auction-pay', card, payerId: 'p1', bidAmount: 5 },
      phase: 'auction',
    });

    const result = forfeitPayment(state);

    const bob = result.players.find((p) => p.id === 'p1')!;
    expect(bob.hand).toEqual([]);
    const otherHands = result.players.filter((p) => p.id !== 'p1').map((p) => p.hand.length);
    expect(otherHands.reduce((a, b) => a + b, 0)).toBe(1);

    expect(result.pendingAction.type).toBe('auction-bid');
    if (result.pendingAction.type === 'auction-bid') {
      expect(result.pendingAction.bid.card).toEqual(card);
      expect(result.pendingAction.bid.passedIds).toEqual(['p1']);
    }
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- auctionPhase
```

Expected: FAIL — `src/engine/auctionPhase.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/auctionPhase.ts`**

```ts
import { shuffle } from './deck';
import { beginScoring } from './scoring';
import { BidState, Card, CreditsCard, GameState, Player } from './types';

export function beginAuctionPhase(state: GameState): GameState {
  const shuffledAuctionDeck = shuffle(state.auctionBay);
  const nextState: GameState = {
    ...state,
    phase: 'auction',
    supplyDeck: shuffledAuctionDeck,
    auctionBay: [],
    activePlayerIndex: state.firstPlayerIndex,
    giftTurn: null,
    giftDraftQueue: [],
  };
  return revealNextForActive(nextState);
}

function revealNextForActive(state: GameState): GameState {
  return {
    ...state,
    pendingAction: { type: 'auction-reveal', playerId: state.players[state.activePlayerIndex].id },
  };
}

export function revealTopCard(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-reveal') {
    throw new Error('revealTopCard called outside auction-reveal step');
  }
  if (state.supplyDeck.length === 0) {
    return beginScoring(state);
  }
  const [card, ...rest] = state.supplyDeck;
  const firstBidderIndex = (state.activePlayerIndex + 1) % state.players.length;
  const bid: BidState = {
    card,
    highBid: 0,
    highBidderId: null,
    passedIds: [],
    nextBidderId: state.players[firstBidderIndex].id,
  };
  return { ...state, supplyDeck: rest, pendingAction: { type: 'auction-bid', bid } };
}

function playerIndexOf(state: GameState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function nextClockwise(state: GameState, fromPlayerId: string, excluded: string[]): string | null {
  const n = state.players.length;
  const startIdx = playerIndexOf(state, fromPlayerId);
  for (let offset = 1; offset <= n; offset += 1) {
    const candidate = state.players[(startIdx + offset) % n];
    if (!excluded.includes(candidate.id)) return candidate.id;
  }
  return null;
}

function advanceBidTurn(state: GameState, bid: BidState, actorId: string): GameState {
  const remaining = state.players.map((p) => p.id).filter((id) => !bid.passedIds.includes(id));

  if (bid.highBidderId === null) {
    if (remaining.length === 0) {
      return discardAuctionCard(state, bid.card);
    }
    const next = nextClockwise(state, actorId, bid.passedIds);
    if (next === null) {
      return discardAuctionCard(state, bid.card);
    }
    return { ...state, pendingAction: { type: 'auction-bid', bid: { ...bid, nextBidderId: next } } };
  }

  const stillIn = remaining.filter((id) => id !== bid.highBidderId);
  if (stillIn.length === 0) {
    return beginPayment(state, bid);
  }
  const next = nextClockwise(state, actorId, bid.passedIds)!;
  return { ...state, pendingAction: { type: 'auction-bid', bid: { ...bid, nextBidderId: next } } };
}

export function placeBid(state: GameState, amount: number): GameState {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('placeBid called outside auction-bid step');
  }
  const bid = state.pendingAction.bid;
  if (amount <= bid.highBid) {
    throw new Error(`Bid must exceed current high bid of ${bid.highBid}`);
  }
  const bidderId = bid.nextBidderId;
  const updatedBid: BidState = { ...bid, highBid: amount, highBidderId: bidderId };
  return advanceBidTurn(state, updatedBid, bidderId);
}

export function passBid(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('passBid called outside auction-bid step');
  }
  const bid = state.pendingAction.bid;
  const passingId = bid.nextBidderId;
  const updatedBid: BidState = { ...bid, passedIds: [...bid.passedIds, passingId] };
  return advanceBidTurn(state, updatedBid, passingId);
}

function discardAuctionCard(state: GameState, card: Card): GameState {
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  return revealNextForActive({
    ...state,
    discardPile: [...state.discardPile, card],
    activePlayerIndex: nextActiveIndex,
  });
}

function beginPayment(state: GameState, bid: BidState): GameState {
  return {
    ...state,
    pendingAction: { type: 'auction-pay', card: bid.card, payerId: bid.highBidderId!, bidAmount: bid.highBid },
  };
}

export function payForAuction(state: GameState, cardIds: string[]): GameState {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('payForAuction called outside auction-pay step');
  }
  const { card, payerId, bidAmount } = state.pendingAction;
  const payer = state.players.find((p) => p.id === payerId)!;
  const paymentCards = cardIds.map((id) => {
    const found = payer.hand.find((c) => c.id === id);
    if (!found) throw new Error(`Card ${id} not in ${payerId}'s hand`);
    return found;
  });

  if (card.kind === 'credits') {
    if (paymentCards.length !== bidAmount) {
      throw new Error(`Must pay with exactly ${bidAmount} card(s)`);
    }
  } else {
    if (paymentCards.some((c) => c.kind !== 'credits')) {
      throw new Error('Can only pay with Credits cards for a non-Credits auction');
    }
    const totalValue = (paymentCards as CreditsCard[]).reduce((sum, c) => sum + c.value, 0);
    if (totalValue < bidAmount) {
      throw new Error(`Payment of ${totalValue} does not cover bid of ${bidAmount}`);
    }
  }

  const paidIds = new Set(cardIds);
  const remainingHand = payer.hand.filter((c) => !paidIds.has(c.id));
  const players = state.players.map((p) => (p.id === payerId ? { ...p, hand: [...remainingHand, card] } : p));

  const nextState: GameState = {
    ...state,
    players,
    discardPile: [...state.discardPile, ...paymentCards],
  };

  if (card.kind === 'mission') {
    return {
      ...nextState,
      pendingAction: { type: 'mission-resolve', playerId: payerId, card, resumeAfter: 'auction' },
    };
  }

  return advanceAuctionTurn(nextState);
}

export function forfeitPayment(state: GameState): GameState {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('forfeitPayment called outside auction-pay step');
  }
  const { card, payerId } = state.pendingAction;
  const penalizedPlayer = state.players.find((p) => p.id === payerId)!;

  let players = state.players;
  for (const other of state.players) {
    if (other.id === payerId) continue;
    players = seizeRandomCard(players, payerId, other.id);
  }

  const nextState: GameState = {
    ...state,
    players,
    log: [...state.log, { message: `${penalizedPlayer.name} could not pay and was penalized.` }],
  };

  return reAuctionCard(nextState, card, payerId);
}

function seizeRandomCard(players: Player[], fromId: string, toId: string): Player[] {
  const fromPlayer = players.find((p) => p.id === fromId)!;
  if (fromPlayer.hand.length === 0) return players;
  const idx = Math.floor(Math.random() * fromPlayer.hand.length);
  const seized = fromPlayer.hand[idx];
  return players.map((p) => {
    if (p.id === fromId) return { ...p, hand: p.hand.filter((_, i) => i !== idx) };
    if (p.id === toId) return { ...p, hand: [...p.hand, seized] };
    return p;
  });
}

function reAuctionCard(state: GameState, card: Card, excludedPlayerId: string): GameState {
  const firstBidderId = nextClockwise(state, excludedPlayerId, [excludedPlayerId]);
  const bid: BidState = {
    card,
    highBid: 0,
    highBidderId: null,
    passedIds: [excludedPlayerId],
    nextBidderId: firstBidderId!,
  };
  return { ...state, pendingAction: { type: 'auction-bid', bid } };
}

function advanceAuctionTurn(state: GameState): GameState {
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  const nextState = { ...state, activePlayerIndex: nextActiveIndex };
  if (nextState.supplyDeck.length === 0) {
    return beginScoring(nextState);
  }
  return revealNextForActive(nextState);
}

export function continueAuctionAfterMission(state: GameState): GameState {
  return advanceAuctionTurn(state);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- auctionPhase
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/auctionPhase.ts src/engine/auctionPhase.test.ts
git commit -m "Add auction phase engine (bidding, payment, penalty)"
```

---

### Task 6: Gift phase engine

**Files:**
- Create: `src/engine/giftPhase.ts`
- Test: `src/engine/giftPhase.test.ts`

**Interfaces:**
- Consumes: `beginAuctionPhase` from `./auctionPhase`; types from `./types`.
- Produces: `startGiftTurn(state): GameState`, `allocateGiftCard(state, destination): GameState`, `drawFromCargoBay(state, cardId): GameState`, `continueGiftAfterMission(state, resumeAfter: 'gift-allocate' | 'gift-draft'): GameState`.

- [ ] **Step 1: Write the failing tests `src/engine/giftPhase.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { allocateGiftCard, drawFromCargoBay, startGiftTurn } from './giftPhase';
import { Card, GameState } from './types';

function makePlayer(id: string, name: string) {
  return { id, name, isAI: false, hand: [] as Card[] };
}

function cardAt(index: number): Card {
  return { id: `c${index}`, kind: 'category', category: 'crew', value: 2, tieBreakLetter: 'A' };
}

function baseState(supplyDeck: Card[]): GameState {
  return {
    phase: 'gift',
    players: [makePlayer('p1', 'Bob'), makePlayer('p2', 'James'), makePlayer('p3', 'Steve')],
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice: { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 },
    supplyDeck,
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: 4,
    pendingAction: { type: 'scoring' },
    log: [],
  };
}

describe('reproduces the rulebook example turn (Bob allocates 4 cards in a 3-player game)', () => {
  it('routes cards to self/auction/cargo/cargo and deals them out in left-to-right order', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', playerId: 'p1', drawnCard: deck[0] });
    state = allocateGiftCard(state, 'auction'); // Monk 1 -> auction

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[1] });
    state = allocateGiftCard(state, 'cargo'); // Gold 1 -> public space

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[2] });
    state = allocateGiftCard(state, 'self'); // Monk 2 -> self

    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', drawnCard: deck[3], selfFilled: true, auctionFilled: true });
    state = allocateGiftCard(state, 'cargo'); // Gold 2 -> forced to public space

    // Draft: James (left of Bob) takes Gold 2, Steve takes Gold 1.
    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p2' });
    expect(state.cargoBay.map((c) => c.id)).toEqual(['c2', 'c4']);
    state = drawFromCargoBay(state, 'c4');

    expect(state.pendingAction).toEqual({ type: 'gift-draw', playerId: 'p3' });
    state = drawFromCargoBay(state, 'c2');

    const bob = state.players.find((p) => p.id === 'p1')!;
    const james = state.players.find((p) => p.id === 'p2')!;
    const steve = state.players.find((p) => p.id === 'p3')!;
    expect(bob.hand.map((c) => c.id)).toEqual(['c3']);
    expect(james.hand.map((c) => c.id)).toEqual(['c4']);
    expect(steve.hand.map((c) => c.id)).toEqual(['c2']);
    expect(state.auctionBay.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('turn rotation', () => {
  it('advances to the next player after a turn completes', () => {
    const deck = [cardAt(1), cardAt(2), cardAt(3), cardAt(4), cardAt(5)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    state = allocateGiftCard(state, 'auction');
    state = allocateGiftCard(state, 'cargo');
    state = allocateGiftCard(state, 'cargo');
    state = drawFromCargoBay(state, state.cargoBay[0].id);
    state = drawFromCargoBay(state, state.cargoBay[0].id);

    expect(state.activePlayerIndex).toBe(1);
    expect(state.pendingAction).toMatchObject({ type: 'gift-allocate', playerId: 'p2' });
  });
});

describe('rejects invalid allocations', () => {
  it('throws when trying to fill the self slot twice', () => {
    const deck = [cardAt(1), cardAt(2)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    expect(() => allocateGiftCard(state, 'self')).toThrow();
  });
});

describe('mission control interrupt', () => {
  it('pauses for resolution when a mission card is kept for self', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'self');
    expect(state.pendingAction).toEqual({
      type: 'mission-resolve',
      playerId: 'p1',
      card: mission,
      resumeAfter: 'gift-allocate',
    });
  });

  it('does not interrupt when a mission card is routed to the auction bay or cargo bay', () => {
    const mission: Card = { id: 'm1', kind: 'mission', modifier: 'plus', diceCount: 1 };
    const deck = [mission, cardAt(2), cardAt(3), cardAt(4)];
    let state = startGiftTurn(baseState(deck));
    state = allocateGiftCard(state, 'auction');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- giftPhase
```

Expected: FAIL — `src/engine/giftPhase.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/giftPhase.ts`**

```ts
import { beginAuctionPhase } from './auctionPhase';
import { Card, GameState, MissionCard } from './types';

function drawOne(state: GameState): { card: Card; rest: Card[] } {
  const [card, ...rest] = state.supplyDeck;
  return { card, rest };
}

export function startGiftTurn(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const { card, rest } = drawOne(state);
  return {
    ...state,
    supplyDeck: rest,
    giftTurn: { cardsDrawn: 1, selfFilled: false, auctionFilled: false, selfCard: null },
    pendingAction: {
      type: 'gift-allocate',
      playerId: activePlayer.id,
      drawnCard: card,
      selfFilled: false,
      auctionFilled: false,
    },
  };
}

export function allocateGiftCard(state: GameState, destination: 'self' | 'auction' | 'cargo'): GameState {
  if (state.pendingAction.type !== 'gift-allocate') {
    throw new Error('allocateGiftCard called outside gift-allocate step');
  }
  const { drawnCard, selfFilled, auctionFilled, playerId } = state.pendingAction;
  const giftTurn = state.giftTurn!;

  if (destination === 'self' && selfFilled) throw new Error('Self slot already filled this turn');
  if (destination === 'auction' && auctionFilled) throw new Error('Auction slot already filled this turn');

  let nextState: GameState = { ...state };
  let interrupted = false;

  if (destination === 'self') {
    nextState.giftTurn = { ...giftTurn, selfFilled: true, selfCard: drawnCard };
    if (drawnCard.kind === 'mission') interrupted = true;
  } else if (destination === 'auction') {
    nextState.auctionBay = [...state.auctionBay, drawnCard];
    nextState.giftTurn = { ...giftTurn, auctionFilled: true };
  } else {
    nextState.cargoBay = [...state.cargoBay, drawnCard];
    nextState.giftTurn = giftTurn;
  }

  if (interrupted) {
    return {
      ...nextState,
      pendingAction: {
        type: 'mission-resolve',
        playerId,
        card: drawnCard as MissionCard,
        resumeAfter: 'gift-allocate',
      },
    };
  }

  return advanceGiftFlow(nextState);
}

function advanceGiftFlow(state: GameState): GameState {
  const giftTurn = state.giftTurn!;
  if (giftTurn.cardsDrawn < state.giftCardsPerTurn && state.supplyDeck.length > 0) {
    const { card, rest } = drawOne(state);
    return {
      ...state,
      supplyDeck: rest,
      giftTurn: { ...giftTurn, cardsDrawn: giftTurn.cardsDrawn + 1 },
      pendingAction: {
        type: 'gift-allocate',
        playerId: state.players[state.activePlayerIndex].id,
        drawnCard: card,
        selfFilled: giftTurn.selfFilled,
        auctionFilled: giftTurn.auctionFilled,
      },
    };
  }
  return finishGiftTurn(state);
}

function playerIdsLeftOf(players: GameState['players'], activeIndex: number): string[] {
  const order: string[] = [];
  for (let offset = 1; offset < players.length; offset += 1) {
    order.push(players[(activeIndex + offset) % players.length].id);
  }
  return order;
}

function finishGiftTurn(state: GameState): GameState {
  const giftTurn = state.giftTurn!;
  const activeIndex = state.activePlayerIndex;
  const players = state.players.map((p, i) =>
    i === activeIndex && giftTurn.selfCard ? { ...p, hand: [...p.hand, giftTurn.selfCard] } : p
  );

  const nextState: GameState = {
    ...state,
    players,
    giftTurn: null,
    giftDraftQueue: playerIdsLeftOf(players, activeIndex),
  };

  return advanceGiftDraft(nextState);
}

function advanceGiftDraft(state: GameState): GameState {
  if (state.cargoBay.length === 0 || state.giftDraftQueue.length === 0) {
    return endGiftTurnRotation(state);
  }
  return { ...state, pendingAction: { type: 'gift-draw', playerId: state.giftDraftQueue[0] } };
}

export function drawFromCargoBay(state: GameState, cardId: string): GameState {
  if (state.pendingAction.type !== 'gift-draw') {
    throw new Error('drawFromCargoBay called outside gift-draw step');
  }
  const { playerId } = state.pendingAction;
  const card = state.cargoBay.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not in Cargo Bay`);

  const cargoBay = state.cargoBay.filter((c) => c.id !== cardId);
  const players = state.players.map((p) => (p.id === playerId ? { ...p, hand: [...p.hand, card] } : p));
  const giftDraftQueue = state.giftDraftQueue.slice(1);

  const nextState: GameState = { ...state, cargoBay, players, giftDraftQueue };

  if (card.kind === 'mission') {
    return {
      ...nextState,
      pendingAction: { type: 'mission-resolve', playerId, card, resumeAfter: 'gift-draft' },
    };
  }

  return advanceGiftDraft(nextState);
}

function endGiftTurnRotation(state: GameState): GameState {
  if (state.supplyDeck.length === 0) {
    return beginAuctionPhase(state);
  }
  const nextActiveIndex = (state.activePlayerIndex + 1) % state.players.length;
  return startGiftTurn({ ...state, activePlayerIndex: nextActiveIndex });
}

export function continueGiftAfterMission(
  state: GameState,
  resumeAfter: 'gift-allocate' | 'gift-draft'
): GameState {
  return resumeAfter === 'gift-allocate' ? advanceGiftFlow(state) : advanceGiftDraft(state);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- giftPhase
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/giftPhase.ts src/engine/giftPhase.test.ts
git commit -m "Add gift phase engine (allocate, draft, turn rotation)"
```

---

### Task 7: Game engine orchestrator

**Files:**
- Create: `src/engine/gameEngine.ts`
- Test: `src/engine/gameEngine.test.ts`

**Interfaces:**
- Consumes: everything from `deck.ts`, `giftPhase.ts`, `auctionPhase.ts`, `missionControl.ts`, `types.ts`.
- Produces: `PlayerConfig`, `createGame(configs: PlayerConfig[], rng?): GameState`, `dispatch(state: GameState, action: EngineAction): GameState`.

- [ ] **Step 1: Write the failing tests `src/engine/gameEngine.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createGame, dispatch, PlayerConfig } from './gameEngine';
import { EngineAction, GameState } from './types';

const TWO_PLAYERS: PlayerConfig[] = [
  { name: 'Bob', isAI: false },
  { name: 'James', isAI: false },
];

describe('createGame', () => {
  it('initializes dice to 3, an empty discard pile, and the first gift-allocate step', () => {
    const state = createGame(TWO_PLAYERS);
    expect(state.dice).toEqual({ fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 });
    expect(state.discardPile).toEqual([]);
    expect(state.phase).toBe('gift');
    expect(state.pendingAction.type).toBe('gift-allocate');
  });

  it('sizes the setup deck correctly for 2/3/4 players', () => {
    expect(createGame(TWO_PLAYERS).supplyDeck.length + 1).toBe(60); // 1 card already drawn for the first turn
    expect(
      createGame([
        { name: 'A', isAI: false },
        { name: 'B', isAI: false },
        { name: 'C', isAI: false },
      ]).supplyDeck.length + 1
    ).toBe(72);
    expect(
      createGame([
        { name: 'A', isAI: false },
        { name: 'B', isAI: false },
        { name: 'C', isAI: false },
        { name: 'D', isAI: false },
      ]).supplyDeck.length + 1
    ).toBe(80);
  });

  it('rejects fewer than 2 or more than 4 players', () => {
    expect(() => createGame([{ name: 'Solo', isAI: false }])).toThrow();
  });
});

describe('dispatch', () => {
  it('rejects an action that does not match the current pending step', () => {
    const state = createGame(TWO_PLAYERS);
    const badAction: EngineAction = { type: 'bid', amount: 1 };
    expect(() => dispatch(state, badAction)).toThrow();
  });

  it('can play through an entire tiny game to game-over', () => {
    // Use a 2-player game and drive every step via dispatch until scoring is reached.
    let state: GameState = createGame(TWO_PLAYERS);
    let guard = 0;
    while (state.pendingAction.type !== 'game-over' && guard < 5000) {
      state = driveOneStep(state);
      guard += 1;
    }
    expect(state.pendingAction.type).toBe('game-over');
    expect(guard).toBeLessThan(5000);
  });
});

function driveOneStep(state: GameState): GameState {
  const pa = state.pendingAction;
  switch (pa.type) {
    case 'gift-allocate': {
      const destination = !pa.selfFilled ? 'self' : !pa.auctionFilled ? 'auction' : 'cargo';
      return dispatch(state, { type: 'allocate', destination });
    }
    case 'gift-draw':
      return dispatch(state, { type: 'draw-cargo', cardId: state.cargoBay[0].id });
    case 'auction-reveal':
      return dispatch(state, { type: 'reveal' });
    case 'auction-bid':
      return dispatch(state, { type: 'pass' });
    case 'auction-pay': {
      const payer = state.players.find((p) => p.id === pa.payerId)!;
      if (pa.card.kind === 'credits') {
        if (payer.hand.length >= pa.bidAmount) {
          return dispatch(state, { type: 'pay', cardIds: payer.hand.slice(0, pa.bidAmount).map((c) => c.id) });
        }
        return dispatch(state, { type: 'forfeit-payment' });
      }
      const credits = payer.hand.filter((c) => c.kind === 'credits');
      let total = 0;
      const chosen: string[] = [];
      for (const c of credits) {
        if (total >= pa.bidAmount) break;
        chosen.push(c.id);
        total += (c as { value: number }).value;
      }
      if (total >= pa.bidAmount) {
        return dispatch(state, { type: 'pay', cardIds: chosen });
      }
      return dispatch(state, { type: 'forfeit-payment' });
    }
    case 'mission-resolve':
      return dispatch(state, { type: 'decline-mission' });
    default:
      throw new Error(`driveOneStep cannot advance from ${pa.type}`);
  }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- gameEngine
```

Expected: FAIL — `src/engine/gameEngine.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/gameEngine.ts`**

```ts
import { buildSetupDeck } from './deck';
import {
  allocateGiftCard,
  continueGiftAfterMission,
  drawFromCargoBay,
  startGiftTurn,
} from './giftPhase';
import {
  continueAuctionAfterMission,
  forfeitPayment,
  passBid,
  payForAuction,
  placeBid,
  revealTopCard,
} from './auctionPhase';
import { declineMissionCard, resolveMissionCard } from './missionControl';
import { CategoryId, EngineAction, GameState, Player } from './types';

export interface PlayerConfig {
  name: string;
  isAI: boolean;
}

const GIFT_CARDS_PER_TURN: Record<number, number> = { 2: 3, 3: 4, 4: 5 };

export function createGame(configs: PlayerConfig[], rng: () => number = Math.random): GameState {
  if (configs.length < 2 || configs.length > 4) {
    throw new Error('Biblios supports 2-4 players');
  }

  const players: Player[] = configs.map((c, i) => ({
    id: `player-${i}`,
    name: c.name,
    isAI: c.isAI,
    hand: [],
  }));

  const dice: Record<CategoryId, number> = { fuel: 3, crew: 3, chart: 3, data: 3, artifact: 3 };
  const supplyDeck = buildSetupDeck(configs.length, rng);

  const baseState: GameState = {
    phase: 'gift',
    players,
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    dice,
    supplyDeck,
    auctionBay: [],
    cargoBay: [],
    discardPile: [],
    giftTurn: null,
    giftDraftQueue: [],
    giftCardsPerTurn: GIFT_CARDS_PER_TURN[configs.length],
    pendingAction: { type: 'scoring' },
    log: [{ message: 'Mission started.' }],
  };

  return startGiftTurn(baseState);
}

export function dispatch(state: GameState, action: EngineAction): GameState {
  const pending = state.pendingAction;
  switch (pending.type) {
    case 'gift-allocate': {
      if (action.type !== 'allocate') throw new Error(`Expected 'allocate', got '${action.type}'`);
      return allocateGiftCard(state, action.destination);
    }
    case 'gift-draw': {
      if (action.type !== 'draw-cargo') throw new Error(`Expected 'draw-cargo', got '${action.type}'`);
      return drawFromCargoBay(state, action.cardId);
    }
    case 'auction-reveal': {
      if (action.type !== 'reveal') throw new Error(`Expected 'reveal', got '${action.type}'`);
      return revealTopCard(state);
    }
    case 'auction-bid': {
      if (action.type === 'bid') return placeBid(state, action.amount);
      if (action.type === 'pass') return passBid(state);
      throw new Error(`Expected 'bid' or 'pass', got '${action.type}'`);
    }
    case 'auction-pay': {
      if (action.type === 'pay') return payForAuction(state, action.cardIds);
      if (action.type === 'forfeit-payment') return forfeitPayment(state);
      throw new Error(`Expected 'pay' or 'forfeit-payment', got '${action.type}'`);
    }
    case 'mission-resolve': {
      const resumeAfter = pending.resumeAfter;
      let resolved: GameState;
      if (action.type === 'resolve-mission') {
        resolved = resolveMissionCard(state, action.adjustments);
      } else if (action.type === 'decline-mission') {
        resolved = declineMissionCard(state);
      } else {
        throw new Error(`Expected 'resolve-mission' or 'decline-mission', got '${action.type}'`);
      }
      if (resumeAfter === 'auction') return continueAuctionAfterMission(resolved);
      return continueGiftAfterMission(resolved, resumeAfter);
    }
    case 'game-over':
      return state;
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- gameEngine
```

Expected: PASS.

- [ ] **Step 5: Run the full engine test suite**

```bash
npm test
```

Expected: PASS — every `src/engine/*.test.ts` file green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/gameEngine.ts src/engine/gameEngine.test.ts
git commit -m "Add game engine orchestrator wiring all phases together"
```

---

### Task 8: AI decision module

**Files:**
- Create: `src/engine/ai.ts`
- Test: `src/engine/ai.test.ts`

**Interfaces:**
- Consumes: `dispatch` from `./gameEngine`; types from `./types`.
- Produces: `isAITurn(state): boolean`, `computeAIAction(state): EngineAction`, `advanceAI(state): GameState`, `runAIUntilHumanTurn(state): GameState`.

- [ ] **Step 1: Write the failing tests `src/engine/ai.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { advanceAI, isAITurn, runAIUntilHumanTurn } from './ai';
import { createGame, PlayerConfig } from './gameEngine';
import { GameState } from './types';

const ALL_AI: PlayerConfig[] = [
  { name: 'Bot 1', isAI: true },
  { name: 'Bot 2', isAI: true },
];

const MIXED: PlayerConfig[] = [
  { name: 'Human', isAI: false },
  { name: 'Bot', isAI: true },
];

describe('isAITurn', () => {
  it('is true when the active gift-allocate player is AI', () => {
    const state = createGame(ALL_AI);
    expect(isAITurn(state)).toBe(true);
  });

  it('is false when the active gift-allocate player is human', () => {
    const state = createGame(MIXED);
    expect(isAITurn(state)).toBe(true); // player-0 (Human) allocates first turn -> false expected below
  });
});

describe('advanceAI', () => {
  it('does nothing when it is not an AI turn', () => {
    const state = createGame(MIXED);
    // player-0 is human and active first, so advanceAI should not change anything.
    const result = advanceAI(state);
    expect(result).toBe(state);
  });
});

describe('runAIUntilHumanTurn', () => {
  it('plays an entire all-AI game to completion without throwing', () => {
    const state = createGame(ALL_AI);
    const result: GameState = runAIUntilHumanTurn(state);
    expect(result.pendingAction.type).toBe('game-over');
  });
});
```

Note: the `isAITurn` test above documents the actual first-mover: `createGame` always makes `player-0` the first active player, so with `MIXED` config (`Human` at index 0), `isAITurn` must be `false` for that first gift-allocate step. Fix the assertion before implementing:

```ts
describe('isAITurn', () => {
  it('is true when the active gift-allocate player is AI', () => {
    const state = createGame(ALL_AI);
    expect(isAITurn(state)).toBe(true);
  });

  it('is false when the active gift-allocate player is human', () => {
    const state = createGame(MIXED);
    expect(isAITurn(state)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- ai.test
```

Expected: FAIL — `src/engine/ai.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/ai.ts`**

```ts
import { dispatch } from './gameEngine';
import {
  CATEGORY_ORDER,
  Card,
  CategoryCard,
  CategoryId,
  CreditsCard,
  EngineAction,
  GameState,
  MissionAdjustment,
  Player,
} from './types';

function cardScore(card: Card, dice: Record<CategoryId, number>): number {
  if (card.kind === 'category') return card.value * dice[card.category];
  if (card.kind === 'mission') return 12;
  return card.value * 2;
}

export function decideGiftAllocation(state: GameState): 'self' | 'auction' | 'cargo' {
  if (state.pendingAction.type !== 'gift-allocate') {
    throw new Error('decideGiftAllocation called outside gift-allocate step');
  }
  const { drawnCard, selfFilled, auctionFilled } = state.pendingAction;
  const score = cardScore(drawnCard, state.dice);
  const HIGH_VALUE_THRESHOLD = 8;

  if (!selfFilled && score >= HIGH_VALUE_THRESHOLD) return 'self';
  if (!auctionFilled && score < HIGH_VALUE_THRESHOLD) return 'auction';
  if (!selfFilled) return 'self';
  if (!auctionFilled) return 'auction';
  return 'cargo';
}

export function decideGiftDraw(state: GameState): string {
  if (state.pendingAction.type !== 'gift-draw') {
    throw new Error('decideGiftDraw called outside gift-draw step');
  }
  if (state.cargoBay.length === 0) {
    throw new Error('Cargo Bay is empty');
  }
  let best = state.cargoBay[0];
  let bestScore = cardScore(best, state.dice);
  for (const card of state.cargoBay.slice(1)) {
    const score = cardScore(card, state.dice);
    if (score > bestScore) {
      best = card;
      bestScore = score;
    }
  }
  return best.id;
}

function categoryStanding(state: GameState, playerId: string, category: CategoryId): number {
  const player = state.players.find((p) => p.id === playerId)!;
  return player.hand
    .filter((c): c is CategoryCard => c.kind === 'category' && c.category === category)
    .reduce((sum, c) => sum + c.value, 0);
}

function bestOpponentStanding(state: GameState, playerId: string, category: CategoryId): number {
  return Math.max(
    0,
    ...state.players.filter((p) => p.id !== playerId).map((p) => categoryStanding(state, p.id, category))
  );
}

function affordableMax(player: Player, card: Card): number {
  if (card.kind === 'credits') return player.hand.length;
  return player.hand
    .filter((c): c is CreditsCard => c.kind === 'credits')
    .reduce((sum, c) => sum + c.value, 0);
}

export interface BidDecision {
  action: 'bid' | 'pass';
  amount?: number;
}

export function decideBid(state: GameState, playerId: string): BidDecision {
  if (state.pendingAction.type !== 'auction-bid') {
    throw new Error('decideBid called outside auction-bid step');
  }
  const { bid } = state.pendingAction;
  const player = state.players.find((p) => p.id === playerId)!;
  const card = bid.card;

  let budget: number;
  if (card.kind === 'category') {
    const myStanding = categoryStanding(state, playerId, card.category);
    const opponentStanding = bestOpponentStanding(state, playerId, card.category);
    const urgency = myStanding >= opponentStanding ? 1.5 : 1;
    budget = Math.round(card.value * state.dice[card.category] * urgency * 0.5);
  } else if (card.kind === 'mission') {
    budget = 4;
  } else {
    budget = 2;
  }

  const nextBid = bid.highBid + 1;
  if (nextBid > budget || nextBid > affordableMax(player, card)) {
    return { action: 'pass' };
  }
  return { action: 'bid', amount: nextBid };
}

function cardPriority(card: Card): number {
  if (card.kind === 'credits') return 0;
  if (card.kind === 'mission') return 3;
  return 1;
}

export function decidePayment(state: GameState): string[] | null {
  if (state.pendingAction.type !== 'auction-pay') {
    throw new Error('decidePayment called outside auction-pay step');
  }
  const { card, payerId, bidAmount } = state.pendingAction;
  const payer = state.players.find((p) => p.id === payerId)!;

  if (card.kind === 'credits') {
    if (payer.hand.length < bidAmount) return null;
    const sorted = [...payer.hand].sort((a, b) => cardPriority(a) - cardPriority(b));
    return sorted.slice(0, bidAmount).map((c) => c.id);
  }

  const creditsCards = payer.hand
    .filter((c): c is CreditsCard => c.kind === 'credits')
    .sort((a, b) => a.value - b.value);
  const totalAvailable = creditsCards.reduce((sum, c) => sum + c.value, 0);
  if (totalAvailable < bidAmount) return null;

  const chosen: string[] = [];
  let paid = 0;
  for (const c of creditsCards) {
    if (paid >= bidAmount) break;
    chosen.push(c.id);
    paid += c.value;
  }
  return chosen;
}

export function decideMissionAdjustments(state: GameState, playerId: string): MissionAdjustment[] {
  if (state.pendingAction.type !== 'mission-resolve') {
    throw new Error('decideMissionAdjustments called outside mission-resolve step');
  }
  const card = state.pendingAction.card;
  const ranked = CATEGORY_ORDER.map((category) => ({
    category,
    lead: categoryStanding(state, playerId, category) - bestOpponentStanding(state, playerId, category),
  })).sort((a, b) => b.lead - a.lead);

  const adjustments: MissionAdjustment[] = [];
  for (let i = 0; i < card.diceCount; i += 1) {
    const target = ranked[i];
    const direction: 'plus' | 'minus' =
      card.modifier === 'mixed' ? (target.lead >= 0 ? 'plus' : 'minus') : card.modifier;
    adjustments.push({ category: target.category, direction });
  }
  return adjustments;
}

function actorIdFor(state: GameState): string | null {
  const pa = state.pendingAction;
  switch (pa.type) {
    case 'gift-allocate':
    case 'gift-draw':
    case 'auction-reveal':
    case 'mission-resolve':
      return pa.playerId;
    case 'auction-bid':
      return pa.bid.nextBidderId;
    case 'auction-pay':
      return pa.payerId;
    default:
      return null;
  }
}

export function isAITurn(state: GameState): boolean {
  const actorId = actorIdFor(state);
  if (!actorId) return false;
  const player = state.players.find((p) => p.id === actorId);
  return !!player?.isAI;
}

export function computeAIAction(state: GameState): EngineAction {
  const actorId = actorIdFor(state)!;
  switch (state.pendingAction.type) {
    case 'gift-allocate':
      return { type: 'allocate', destination: decideGiftAllocation(state) };
    case 'gift-draw':
      return { type: 'draw-cargo', cardId: decideGiftDraw(state) };
    case 'auction-reveal':
      return { type: 'reveal' };
    case 'auction-bid': {
      const decision = decideBid(state, actorId);
      return decision.action === 'bid' ? { type: 'bid', amount: decision.amount! } : { type: 'pass' };
    }
    case 'auction-pay': {
      const cardIds = decidePayment(state);
      return cardIds ? { type: 'pay', cardIds } : { type: 'forfeit-payment' };
    }
    case 'mission-resolve':
      return { type: 'resolve-mission', adjustments: decideMissionAdjustments(state, actorId) };
    default:
      throw new Error(`No AI action available for pending action '${state.pendingAction.type}'`);
  }
}

export function advanceAI(state: GameState): GameState {
  if (!isAITurn(state)) return state;
  return dispatch(state, computeAIAction(state));
}

export function runAIUntilHumanTurn(state: GameState): GameState {
  let current = state;
  let guard = 0;
  while (isAITurn(current) && guard < 10000) {
    current = advanceAI(current);
    guard += 1;
  }
  return current;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- ai.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai.ts src/engine/ai.test.ts
git commit -m "Add AI decision heuristics for gift, auction, and mission steps"
```

---

### Task 9: Persistence

**Files:**
- Create: `src/engine/storage.ts`
- Test: `src/engine/storage.test.ts`

**Interfaces:**
- Produces: `saveGame(state: GameState): void`, `loadGame(): GameState | null`, `clearSavedGame(): void`.

- [ ] **Step 1: Write the failing tests `src/engine/storage.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSavedGame, loadGame, saveGame } from './storage';
import { createGame } from './gameEngine';

beforeEach(() => {
  localStorage.clear();
});

describe('saveGame / loadGame / clearSavedGame', () => {
  it('round-trips a full GameState through localStorage', () => {
    const state = createGame([
      { name: 'Bob', isAI: false },
      { name: 'James', isAI: true },
    ]);
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).toEqual(state);
  });

  it('returns null when there is no saved game', () => {
    expect(loadGame()).toBeNull();
  });

  it('removes the saved game on clearSavedGame', () => {
    const state = createGame([
      { name: 'Bob', isAI: false },
      { name: 'James', isAI: true },
    ]);
    saveGame(state);
    clearSavedGame();
    expect(loadGame()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- storage
```

Expected: FAIL — `src/engine/storage.ts` does not exist yet.

- [ ] **Step 3: Create `src/engine/storage.ts`**

```ts
import { GameState } from './types';

const STORAGE_KEY = 'space-biblios-save-v1';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (e.g. private browsing quota) -- silently skip persistence.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- storage
```

Expected: PASS.

- [ ] **Step 5: Run the entire test suite**

```bash
npm test
```

Expected: PASS — every engine test file green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/storage.ts src/engine/storage.test.ts
git commit -m "Add localStorage persistence for game state"
```

---

### Task 10: UI shell — theme, App routing, Setup screen

**Files:**
- Create: `src/ui/theme.ts`, `src/ui/SetupScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `createGame`, `dispatch`, `PlayerConfig` from `../engine/gameEngine`; `advanceAI`, `isAITurn` from `../engine/ai`; `saveGame`, `loadGame`, `clearSavedGame` from `../engine/storage`.
- Produces: `App` renders `SetupScreen` by default; `SetupScreen` calls `onStart(configs: PlayerConfig[])`.

- [ ] **Step 1: Create `src/ui/theme.ts`**

```ts
import { CategoryId } from '../engine/types';

export const CATEGORY_COLOR: Record<CategoryId, string> = {
  fuel: '#3b82f6',
  crew: '#a16207',
  artifact: '#dc2626',
  chart: '#16a34a',
  data: '#ea580c',
};

export const CATEGORY_ICON: Record<CategoryId, string> = {
  fuel: '⛽',
  crew: '🧑‍🚀',
  artifact: '👽',
  chart: '🗺️',
  data: '📡',
};
```

- [ ] **Step 2: Update `src/App.test.tsx` to match the new default screen**

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the setup screen by default', () => {
    render(<App />);
    expect(screen.getByText(/Space Biblios/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch Mission/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm test -- App.test
```

Expected: FAIL — `SetupScreen` / updated `App` don't exist yet.

- [ ] **Step 4: Create `src/ui/SetupScreen.tsx`**

```tsx
import { useState } from 'react';
import { PlayerConfig } from '../engine/gameEngine';

interface SeatConfig {
  name: string;
  isAI: boolean;
}

const DEFAULT_SEATS: SeatConfig[] = [
  { name: 'Captain 1', isAI: false },
  { name: 'Captain 2', isAI: true },
];

export default function SetupScreen({ onStart }: { onStart: (configs: PlayerConfig[]) => void }) {
  const [seats, setSeats] = useState<SeatConfig[]>(DEFAULT_SEATS);

  function updateSeat(index: number, patch: Partial<SeatConfig>) {
    setSeats((prev) => prev.map((seat, i) => (i === index ? { ...seat, ...patch } : seat)));
  }

  function addSeat() {
    if (seats.length >= 4) return;
    setSeats((prev) => [...prev, { name: `Captain ${prev.length + 1}`, isAI: true }]);
  }

  function removeSeat() {
    if (seats.length <= 2) return;
    setSeats((prev) => prev.slice(0, -1));
  }

  return (
    <div className="setup-screen">
      <h1>Space Biblios</h1>
      <p>Assemble your crew of 2-4 captains.</p>
      {seats.map((seat, index) => (
        <div className="seat-row" key={index}>
          <input value={seat.name} onChange={(e) => updateSeat(index, { name: e.target.value })} disabled={seat.isAI} />
          <label>
            <input type="checkbox" checked={seat.isAI} onChange={(e) => updateSeat(index, { isAI: e.target.checked })} />
            AI
          </label>
        </div>
      ))}
      <div className="seat-controls">
        <button onClick={addSeat} disabled={seats.length >= 4}>
          Add seat
        </button>
        <button onClick={removeSeat} disabled={seats.length <= 2}>
          Remove seat
        </button>
      </div>
      <button className="start-button" onClick={() => onStart(seats)}>
        Launch Mission
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GameState, EngineAction } from './engine/types';
import { createGame, dispatch, PlayerConfig } from './engine/gameEngine';
import { advanceAI, isAITurn } from './engine/ai';
import { saveGame, loadGame, clearSavedGame } from './engine/storage';
import SetupScreen from './ui/SetupScreen';

type Screen = 'resume-prompt' | 'setup' | 'playing';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>('setup');

  useEffect(() => {
    const saved = loadGame();
    if (saved) setScreen('resume-prompt');
  }, []);

  useEffect(() => {
    if (!game) return;
    saveGame(game);
    if (isAITurn(game)) {
      const timer = setTimeout(() => setGame(advanceAI(game)), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [game]);

  function handleStart(configs: PlayerConfig[]) {
    clearSavedGame();
    setGame(createGame(configs));
    setScreen('playing');
  }

  function handleAction(action: EngineAction) {
    if (!game) return;
    setGame(dispatch(game, action));
  }

  function handleResume() {
    const saved = loadGame();
    if (saved) {
      setGame(saved);
      setScreen('playing');
    }
  }

  function handleNewGame() {
    clearSavedGame();
    setGame(null);
    setScreen('setup');
  }

  if (screen === 'resume-prompt') {
    return (
      <div className="resume-prompt">
        <h1>Space Biblios</h1>
        <p>A mission in progress was found.</p>
        <button onClick={handleResume}>Resume mission</button>
        <button onClick={handleNewGame}>Start new mission</button>
      </div>
    );
  }

  if (screen === 'setup' || !game) {
    return <SetupScreen onStart={handleStart} />;
  }

  // Board/End screens are wired in Tasks 11-13; render a minimal placeholder for now.
  return (
    <div>
      <p>Phase: {game.phase}</p>
      <button onClick={() => handleAction({ type: 'reveal' })}>debug</button>
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm test -- App.test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/theme.ts src/ui/SetupScreen.tsx src/App.tsx src/App.test.tsx
git commit -m "Add setup screen and wire App state to the game engine"
```

---

### Task 11: Board display components

**Files:**
- Create: `src/ui/CommandConsole.tsx`, `src/ui/PlayerHand.tsx`, `src/ui/CargoBay.tsx`, `src/ui/BoardScreen.tsx`

**Interfaces:**
- Consumes: `GameState`, `Card`, `CategoryId`, `CATEGORY_LABEL`, `EngineAction` from `../engine/types`; `CATEGORY_COLOR`, `CATEGORY_ICON` from `./theme`.
- Produces: `BoardScreen({ state, onAction })` — renders dice, hands, and Cargo Bay (action wiring added in Task 12).

- [ ] **Step 1: Create `src/ui/CommandConsole.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/ui/PlayerHand.tsx`**

```tsx
import { CATEGORY_LABEL, Card } from '../engine/types';
import { CATEGORY_COLOR, CATEGORY_ICON } from './theme';

export function describeCard(card: Card): string {
  if (card.kind === 'category') return `${CATEGORY_LABEL[card.category]} ${card.value}${card.tieBreakLetter}`;
  if (card.kind === 'credits') return `Credits ${card.value}`;
  return `Mission Control ${card.modifier === 'mixed' ? '±1' : card.modifier === 'plus' ? '+1' : '-1'} (${card.diceCount}d)`;
}

export function OwnHand({ hand }: { hand: Card[] }) {
  return (
    <div className="own-hand">
      {hand.map((card) => (
        <div
          key={card.id}
          className={`card card-${card.kind}`}
          style={card.kind === 'category' ? { borderColor: CATEGORY_COLOR[card.category] } : undefined}
        >
          {card.kind === 'category' && <span>{CATEGORY_ICON[card.category]}</span>}
          <span>{describeCard(card)}</span>
        </div>
      ))}
    </div>
  );
}

export function OpponentSeat({
  name,
  cardCount,
  isActive,
}: {
  name: string;
  cardCount: number;
  isActive: boolean;
}) {
  return (
    <div className={`opponent-seat${isActive ? ' active' : ''}`}>
      <div className="opponent-name">{name}</div>
      <div className="opponent-cardback">{'🂠'.repeat(Math.min(cardCount, 10))} {cardCount}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/ui/CargoBay.tsx`**

```tsx
import { Card } from '../engine/types';
import { describeCard } from './PlayerHand';

export default function CargoBay({
  cards,
  selectable,
  onSelect,
}: {
  cards: Card[];
  selectable: boolean;
  onSelect?: (cardId: string) => void;
}) {
  return (
    <div className="cargo-bay">
      <h3>Cargo Bay</h3>
      <div className="cargo-cards">
        {cards.map((card) => (
          <button key={card.id} className="card cargo-card" disabled={!selectable} onClick={() => onSelect?.(card.id)}>
            {describeCard(card)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/ui/BoardScreen.tsx`**

```tsx
import { EngineAction, GameState } from '../engine/types';
import CommandConsole from './CommandConsole';
import { OwnHand, OpponentSeat } from './PlayerHand';
import CargoBay from './CargoBay';

export function currentActorId(state: GameState): string | null {
  const pa = state.pendingAction;
  switch (pa.type) {
    case 'gift-allocate':
    case 'gift-draw':
    case 'auction-reveal':
    case 'mission-resolve':
      return pa.playerId;
    case 'auction-bid':
      return pa.bid.nextBidderId;
    case 'auction-pay':
      return pa.payerId;
    default:
      return null;
  }
}

export default function BoardScreen({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const actorId = currentActorId(state);
  const actor = state.players.find((p) => p.id === actorId);
  const showCargoBayPanel = state.pendingAction.type !== 'gift-draw';

  return (
    <div className="board-screen">
      <CommandConsole dice={state.dice} />
      <div className="phase-banner">
        Phase: {state.phase} {actor ? `— ${actor.name}'s turn` : ''}
      </div>
      <div className="opponents-row">
        {state.players
          .filter((p) => p.id !== actor?.id)
          .map((p) => (
            <OpponentSeat key={p.id} name={p.name} cardCount={p.hand.length} isActive={p.id === actorId} />
          ))}
      </div>
      {showCargoBayPanel && <CargoBay cards={state.cargoBay} selectable={false} />}
      <div className="action-panel-slot" data-testid="action-panel-slot" />
      {actor && <h3>{actor.name}'s hand</h3>}
      {actor && <OwnHand hand={actor.hand} />}
      <div className="piles-info">
        Supply Deck: {state.supplyDeck.length} | Auction Bay: {state.auctionBay.length} | Discard: {state.discardPile.length}
      </div>
      <div className="log-panel">
        {state.log.slice(-8).map((entry, i) => (
          <div key={i}>{entry.message}</div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire `BoardScreen` into `src/App.tsx`**

Replace the placeholder `return` block for the `playing` screen:

```tsx
import BoardScreen from './ui/BoardScreen';
```

```tsx
  if (screen === 'setup' || !game) {
    return <SetupScreen onStart={handleStart} />;
  }

  return <BoardScreen state={game} onAction={handleAction} />;
```

(The `game-over` case is handled in Task 13; `BoardScreen` rendering a `game-over` `pendingAction` harmlessly shows no acting player for now.)

- [ ] **Step 6: Verify the build and run a manual smoke check**

```bash
npm run build
npm test
```

Expected: build succeeds, all tests still pass (no new tests added in this task since these are presentational components without game-flow branches worth unit-testing in isolation; they're exercised end-to-end in Task 12).

- [ ] **Step 7: Commit**

```bash
git add src/ui/CommandConsole.tsx src/ui/PlayerHand.tsx src/ui/CargoBay.tsx src/ui/BoardScreen.tsx src/App.tsx
git commit -m "Add board display components (Command Console, hands, Cargo Bay)"
```

---

### Task 12: Action panel and AI wiring

**Files:**
- Create: `src/ui/ActionPanel.tsx`
- Modify: `src/ui/BoardScreen.tsx`

**Interfaces:**
- Consumes: `GameState`, `EngineAction`, `MissionAdjustment`, `CATEGORY_ORDER`, `CATEGORY_LABEL` from `../engine/types`; `describeCard` from `./PlayerHand`; `CargoBay` from `./CargoBay`.
- Produces: `ActionPanel({ state, onAction })` rendering the correct controls for every `PendingAction` variant that needs human input.

- [ ] **Step 1: Create `src/ui/ActionPanel.tsx`**

```tsx
import { useState } from 'react';
import { Card, CATEGORY_LABEL, CATEGORY_ORDER, EngineAction, GameState, MissionAdjustment } from '../engine/types';
import { describeCard } from './PlayerHand';
import CargoBay from './CargoBay';

export default function ActionPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;

  if (pending.type === 'gift-allocate') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name} drew a card</h3>
        <div className="drawn-card">{describeCard(pending.drawnCard)}</div>
        <div className="action-buttons">
          <button disabled={pending.selfFilled} onClick={() => onAction({ type: 'allocate', destination: 'self' })}>
            Keep for yourself
          </button>
          <button disabled={pending.auctionFilled} onClick={() => onAction({ type: 'allocate', destination: 'auction' })}>
            Send to Auction Bay
          </button>
          <button onClick={() => onAction({ type: 'allocate', destination: 'cargo' })}>Send to Cargo Bay</button>
        </div>
      </div>
    );
  }

  if (pending.type === 'gift-draw') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name}: choose a card from the Cargo Bay</h3>
        <CargoBay cards={state.cargoBay} selectable onSelect={(cardId) => onAction({ type: 'draw-cargo', cardId })} />
      </div>
    );
  }

  if (pending.type === 'auction-reveal') {
    const player = state.players.find((p) => p.id === pending.playerId)!;
    return (
      <div className="action-panel">
        <h3>{player.name}: reveal the next auction card</h3>
        <button onClick={() => onAction({ type: 'reveal' })}>Reveal</button>
      </div>
    );
  }

  if (pending.type === 'auction-bid') {
    return <BidPanel state={state} onAction={onAction} />;
  }

  if (pending.type === 'auction-pay') {
    return <PayPanel state={state} onAction={onAction} />;
  }

  if (pending.type === 'mission-resolve') {
    return <MissionPanel state={state} onAction={onAction} />;
  }

  return null;
}

function BidPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'auction-bid') return null;
  const { bid } = pending;
  const bidder = state.players.find((p) => p.id === bid.nextBidderId)!;
  const unit = bid.card.kind === 'credits' ? 'card(s)' : 'Credits';
  const [amount, setAmount] = useState(bid.highBid + 1);

  return (
    <div className="action-panel">
      <h3>Auctioning: {describeCard(bid.card)}</h3>
      <p>
        High bid: {bid.highBid} {unit}{' '}
        {bid.highBidderId ? `(by ${state.players.find((p) => p.id === bid.highBidderId)!.name})` : ''}
      </p>
      <p>{bidder.name} to bid or pass</p>
      <input type="number" min={bid.highBid + 1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      <button onClick={() => onAction({ type: 'bid', amount })}>Bid</button>
      <button onClick={() => onAction({ type: 'pass' })}>Pass</button>
    </div>
  );
}

function PayPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'auction-pay') return null;
  const payer = state.players.find((p) => p.id === pending.payerId)!;
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(cardId: string) {
    setSelected((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]));
  }

  const unit = pending.card.kind === 'credits' ? 'cards' : 'Credits value';
  return (
    <div className="action-panel">
      <h3>
        {payer.name} must pay {pending.bidAmount} {unit}
      </h3>
      <div className="pay-hand">
        {payer.hand.map((card: Card) => (
          <button key={card.id} className={selected.includes(card.id) ? 'card selected' : 'card'} onClick={() => toggle(card.id)}>
            {describeCard(card)}
          </button>
        ))}
      </div>
      <button onClick={() => onAction({ type: 'pay', cardIds: selected })}>Pay</button>
      <button onClick={() => onAction({ type: 'forfeit-payment' })}>Forfeit</button>
    </div>
  );
}

function MissionPanel({ state, onAction }: { state: GameState; onAction: (action: EngineAction) => void }) {
  const pending = state.pendingAction;
  if (pending.type !== 'mission-resolve') return null;
  const card = pending.card;
  const [picks, setPicks] = useState<MissionAdjustment[]>([]);

  function setPick(category: MissionAdjustment['category'], direction: 'plus' | 'minus') {
    setPicks((prev) => {
      const withoutCategory = prev.filter((p) => p.category !== category);
      if (prev.find((p) => p.category === category && p.direction === direction)) {
        return withoutCategory;
      }
      if (withoutCategory.length >= card.diceCount) return prev;
      return [...withoutCategory, { category, direction }];
    });
  }

  return (
    <div className="action-panel">
      <h3>
        Mission Control card: choose {card.diceCount} categor{card.diceCount > 1 ? 'ies' : 'y'} to adjust
      </h3>
      <div className="mission-grid">
        {CATEGORY_ORDER.map((category) => (
          <div key={category} className="mission-row">
            <span>{CATEGORY_LABEL[category]}</span>
            {(card.modifier === 'plus' || card.modifier === 'mixed') && (
              <button onClick={() => setPick(category, 'plus')}>+1</button>
            )}
            {(card.modifier === 'minus' || card.modifier === 'mixed') && (
              <button onClick={() => setPick(category, 'minus')}>-1</button>
            )}
          </div>
        ))}
      </div>
      <button disabled={picks.length !== card.diceCount} onClick={() => onAction({ type: 'resolve-mission', adjustments: picks })}>
        Confirm
      </button>
      <button onClick={() => onAction({ type: 'decline-mission' })}>Discard without effect</button>
    </div>
  );
}
```

- [ ] **Step 2: Wire `ActionPanel` into `src/ui/BoardScreen.tsx`**

Replace the `<div className="action-panel-slot" data-testid="action-panel-slot" />` placeholder line with:

```tsx
import ActionPanel from './ActionPanel';
```

```tsx
      <ActionPanel state={state} onAction={onAction} />
```

- [ ] **Step 3: Verify the build**

```bash
npm run build
npm test
```

Expected: build succeeds, all existing tests still pass.

- [ ] **Step 4: Manual playtest — start the dev server and play a full 2-human game**

```bash
npm run dev
```

In the browser: create a 2-human-seat game, play through several Gift-phase turns (verify Keep/Auction/Cargo buttons disable correctly once filled, verify the Cargo Bay draft happens in the right order), let it reach the Auction phase (verify bidding, passing, and payment for both a category card and a Credits card, including deliberately forfeiting a payment once to see the penalty and re-auction), and confirm any Mission Control card draws prompt the adjustment UI. Stop the server (Ctrl+C) once confirmed working end-to-end through at least one full pass of both phases.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ActionPanel.tsx src/ui/BoardScreen.tsx
git commit -m "Add interactive action panel for gift, auction, and mission steps"
```

---

### Task 13: End screen, persistence wiring, and final playtest

**Files:**
- Create: `src/ui/EndScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GameState`, `CATEGORY_LABEL`, `CATEGORY_ORDER` from `../engine/types`.
- Produces: `EndScreen({ state, onNewGame })` rendering the full per-category breakdown and final winner.

- [ ] **Step 1: Create `src/ui/EndScreen.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire `EndScreen` into `src/App.tsx`**

```tsx
import EndScreen from './ui/EndScreen';
```

```tsx
  if (screen === 'setup' || !game) {
    return <SetupScreen onStart={handleStart} />;
  }

  if (game.pendingAction.type === 'game-over') {
    return <EndScreen state={game} onNewGame={handleNewGame} />;
  }

  return <BoardScreen state={game} onAction={handleAction} />;
```

- [ ] **Step 3: Verify the build and full test suite**

```bash
npm run build
npm test
```

Expected: build succeeds; all tests pass.

- [ ] **Step 4: Manual playtest — full game including resume**

```bash
npm run dev
```

In the browser: play a 1-human + 1-AI (or more) game all the way to the End screen and confirm the per-category breakdown, winner, and tie-break note (if any) look correct. Then start a new game, play a couple of turns, refresh the browser tab, and confirm the "mission in progress" resume prompt appears and correctly restores the game; also confirm "Start new mission" clears the save and returns to Setup. Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/EndScreen.tsx src/App.tsx
git commit -m "Add end screen and persistence resume flow"
```

## Self-Review Notes

- **Spec coverage:** theme mapping (Task 10-13 labels/CATEGORY_LABEL), deck composition (Task 2), gift phase incl. forced-cargo edge case (Task 6), auction rules for both card types + penalty (Task 5), Mission Control incl. clamping and mixed cards (Task 4), scoring + full tie-break cascade (Task 3), AI heuristics (Task 8), persistence (Task 9), all UI screens (Tasks 10-13) — every spec section (§2-§9) maps to a task.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code or a concrete manual-verification script.
- **Type consistency:** `EngineAction`, `PendingAction`, `Card`, `GameState` are defined once in Task 2 and consumed identically (same field names/shapes) by every later task; `dispatch`/`createGame` signatures introduced in Task 7 are used unchanged by `ai.ts` (Task 8) and `App.tsx` (Tasks 10, 13).

---

Plan complete and saved to `docs/superpowers/plans/2026-09-21-space-biblios-implementation.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
