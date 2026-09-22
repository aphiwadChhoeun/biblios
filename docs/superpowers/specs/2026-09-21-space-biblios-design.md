# Space Biblios — Design Spec

Date: 2026-09-21
Status: Approved by user, pending implementation plan

## 1. Overview

A digital, space-themed retheme of the board game *Biblios* (Steve Finn, IELLO).
2-4 players, local hotseat with optional AI-controlled seats, single-page web
app, no backend. Built with Vite + React + TypeScript. Game logic lives in a
pure TypeScript engine module, independent of React, so it is directly
unit-testable and reusable by the AI bot logic.

## 2. Theme mapping

| Original | Space Biblios |
|---|---|
| Abbot | Captain |
| Pigments (blue) | Fuel Cells |
| Monks (tan/brown) | Crew |
| Forbidden Tomes (red) | Alien Artifacts |
| Holy Books (green) | Star Charts |
| Manuscripts (orange) | Research Data |
| Gold | Credits |
| Scriptorium (category value board) | Command Console |
| Church card | Mission Control card |
| Draw pile | Supply Deck |
| Auction pile | Auction Bay |
| Public space | Cargo Bay |

All rules text, UI labels, and card flavor use the right-hand column. Card
back art / category colors keep the original color coding (blue, tan, red,
green, orange) so the mapping to the physical game's color logic is
preserved for anyone who knows the original.

## 3. Deck composition (87 cards total)

Reconstructed from the published rules plus corroborated community
references, since the exact box-back card list isn't available online. This
is our authoritative deck for the digital version.

**Category cards — 45 total (9 per category)**

- Fuel Cells (Pigments): four value-2, three value-3, two value-4 (sums to 25)
- Crew (Monks): four value-2, three value-3, two value-4 (sums to 25)
- Star Charts (Holy Books): seven value-1, two value-2 (sums to 11)
- Research Data (Manuscripts): seven value-1, two value-2 (sums to 11)
- Alien Artifacts (Forbidden Tomes): seven value-1, two value-2 (sums to 11)

Each of the 9 cards within a category gets a unique tie-break letter A–I
(assignment order arbitrary, not tied to value).

**Credits (Gold) cards — 33 total**

- 11 of value 1, 11 of value 2, 11 of value 3

**Mission Control (Church) cards — 9 total**

- 2× "+1, one die"
- 2× "-1, one die"
- 2× "+1, two dice"
- 2× "-1, two dice"
- 1× "+1 or -1, one die" (mixed — owner picks the direction at resolution time)

45 + 33 + 9 = 87. ✓

**Setup discard (per rules, adapted)**

- 2 players: discard 6 Credits cards (2 of each value: 1/2/3), then 21
  additional random cards from the full remaining deck.
- 3 players: discard 3 Credits cards (1 of each value), then 12 additional
  random cards.
- 4 players: discard 7 random cards.

Then shuffle the remainder into the Supply Deck.

## 4. Data model

```ts
type CategoryId = 'fuel' | 'crew' | 'artifact' | 'chart' | 'data';
type CardKind = 'category' | 'credits' | 'mission';

interface CategoryCard {
  id: string;
  kind: 'category';
  category: CategoryId;
  value: number;
  tieBreakLetter: string; // 'A'..'I', unique within its category
}

interface CreditsCard {
  id: string;
  kind: 'credits';
  value: 1 | 2 | 3;
}

interface MissionCard {
  id: string;
  kind: 'mission';
  modifier: 'plus' | 'minus' | 'mixed';
  diceCount: 1 | 2;
}

type Card = CategoryCard | CreditsCard | MissionCard;

interface Player {
  id: string;
  name: string;
  isAI: boolean;
  hand: Card[];
}

type Phase = 'gift' | 'auction' | 'scoring';

interface GameState {
  phase: Phase;
  players: Player[];
  activePlayerIndex: number;   // whose turn it is (Gift phase / Auction phase)
  firstPlayerIndex: number;    // the game's starting active player (auction phase reuses this)
  dice: Record<CategoryId, number>; // 1-6 each, starts at 3
  supplyDeck: Card[];
  auctionBay: Card[];          // Gift phase: growing pool; Auction phase: shuffled into the draw order
  cargoBay: Card[];            // public space, face-up
  discardPile: Card[];
  pendingAction: PendingAction;
  log: LogEntry[];
}

// Drives what the UI must prompt for next, and who must act.
type PendingAction =
  | { type: 'gift-allocate'; playerId: string; drawnCard: Card; selfFilled: boolean; auctionFilled: boolean }
  | { type: 'gift-draw'; playerId: string }               // player choosing from Cargo Bay
  | { type: 'auction-reveal'; playerId: string }           // active player flips next card
  | { type: 'auction-bid'; card: Card; bidderId: string; highBid: number; highBidderId: string | null; passedIds: string[] }
  | { type: 'auction-pay'; card: Card; payerId: string; amount: number } // amount = credits owed OR # cards owed
  | { type: 'mission-resolve'; playerId: string; card: MissionCard }
  | { type: 'scoring' }
  | { type: 'game-over'; result: ScoringResult };
```

`GameState` is fully JSON-serializable (no functions/classes) so it can be
persisted directly to `localStorage`.

## 5. Phase flow (state machine)

The engine is a set of pure reducer functions, one per player action, each
taking `(state, action) => state`. There is no client-visible mutation;
every transition returns a new state object. A thin driver (in the React
layer) inspects `state.pendingAction`; if the actor is AI, it calls the AI
module to compute a decision and immediately dispatches it (with a short
UI delay for legibility). If the actor is human, it waits for UI input.

### 5.1 Gift phase

- Turn order: clockwise from `firstPlayerIndex`.
- Active player allocates N cards one at a time (N = 5/4/3 for 4/3/2
  players), each drawn from the Supply Deck:
  - Exactly 1 must go to "self" (face-down, added to hand only at the end
    of the active player's allocation step).
  - Exactly 1 must go to the Auction Bay (face-down).
  - All others go to the Cargo Bay (face-up, public).
  - Once the self slot is filled, `gift-allocate` for later draws only
    offers Auction Bay / Cargo Bay as valid moves; likewise once the
    Auction Bay slot is filled only self / Cargo Bay remain (this
    reproduces the "forced to Cargo Bay" edge case from the printed
    example).
- **Mission Control interrupt:** if the card allocated to self, or a card
  taken from the Cargo Bay by any player, is a Mission Control card, the
  phase immediately transitions to `mission-resolve` for that player
  before anything else proceeds. After resolution the phase resumes where
  it left off.
- After the active player finishes allocating, starting with the player to
  their left, each remaining player takes one card from the Cargo Bay
  (`gift-draw`), in turn order, until the Cargo Bay is empty.
- Turn passes to the next player left of the active player.
- Phase ends when the Supply Deck is exhausted (a turn may allocate fewer
  than N cards if the deck runs out mid-turn — allocate what remains, then
  proceed to the draw step as normal with a smaller Cargo Bay).

### 5.2 Auction phase

- The Auction Bay (built up during the Gift phase) is shuffled and becomes
  the new Supply Deck for this phase.
- `firstPlayerIndex` is active first, as in Gift phase.
- Each turn: active player flips the top card (`auction-reveal`).
  - **All-pass rule:** the player to the active player's left must bid ≥1
    or pass; each subsequent player (clockwise) must either raise the bid
    or pass; once passed, a player is out for that card. If everyone
    passes without a bid, the card is discarded and turn passes left.
  - **Non-Credits card:** bids are announced in Credits value. The winner
    may pay with any combination of Credits cards from hand — total paid
    must be ≥ the bid (exact change not required; the rules explicitly
    allow forced overpay). Cards used to pay go to the discard pile.
  - **Credits card:** bids are announced as a *number of cards* the bidder
    is willing to discard (any type/combination from hand, player's
    choice at payment time). Payment cards go face-down to the discard
    pile without revealing them.
  - **Non-payment penalty:** if the winning bidder cannot or does not pay
    (only possible for a Credits-card auction, or if a player misjudges
    their non-Credits hand — but by construction of the Credits-payment
    rule, a "cannot pay" case in a Credits-card auction happens when the
    bidder's hand has fewer cards than their bid), every other player
    takes one random card from the winning bidder's hand; the card is
    re-auctioned and the penalized player is excluded from that
    re-auction. (Standard penalty only — the "Medieval bluff" variant is
    out of scope.)
  - Winner adds the card to hand; if it's a Mission Control card, resolve
    it immediately (`mission-resolve`) before the next reveal.
  - Active player becomes the next player to the left (whether the
    previous card was won or discarded).
- Phase ends when the (shuffled) Auction Bay is exhausted.

### 5.3 Mission Control resolution

- Owner chooses which categories to adjust: 1 category for a one-die
  card, 2 *distinct* categories for a two-dice card (never the same
  category twice).
- `mixed` modifier: owner picks +1 or -1 at resolution time (single die).
- Dice are clamped to the range [1, 6].
- After resolving, the card goes to the discard pile. A player may also
  choose to decline using it, discarding it with no effect.

### 5.4 Scoring

- For each category, sum the values of each player's cards in that
  category. Highest total wins the category's die (its current face
  value = that many victory points), taken and set in front of the
  winner without changing its face.
- Tie-break cascade, applied in order until broken:
  1. The tied player holding the card with the tie-break letter closest
     to "A" in that category wins the category.
  2. (Game-level, after all categories are resolved) Highest sum of dice
     values wins the game.
  3. Still tied → most Credits cards' total value in hand wins.
  4. Still tied → highest Crew (Monks) category total wins.
  5. Still tied → walk the Scriptorium/Command Console category order
     (Fuel Cells, Crew, Star Charts, Research Data, Alien Artifacts —
     matching the original's Pigments→Monks→Holy Books→Manuscripts→
     Forbidden Tomes order) comparing each category's total until the
     tie breaks.

## 6. AI bots

Heuristic, not ML — deterministic scoring functions over the visible game
state (a bot only ever reasons over its own hand + public information).

- **Gift-phase allocation:** score each drawn card as
  `value * currentDie[category]` (Mission Control cards score as a fixed
  high constant since information/dice control is always valuable).
  Route the single highest-scoring not-yet-placed card to self; once self
  is filled, route the lowest-scoring remaining card to the Auction Bay;
  everything else to the Cargo Bay.
- **Gift-phase draw:** when picking from the Cargo Bay, take the
  highest-scoring available card by the same formula.
- **Auction bidding:** compute a max-bid budget from
  `card's scoring value` weighted by how much it would improve the bot's
  standing in that category (current total vs. best-known opponent
  total), then bid up to that budget, incrementing minimally each round;
  pass once a competing bid exceeds budget.
  - Non-Credits auctions: budget is expressed in Credits; bot pays using
    its smallest-value Credits cards first (minimize overpay).
  - Credits auctions: budget is expressed in number-of-cards; bot offers
    to pay with its lowest-priority cards (cards in categories where it's
    already losing badly, or excess Credits) first.
- **Mission Control usage:** prefer boosting the category where the bot
  has the largest lead, or reducing the category where an opponent has
  the largest visible lead (visible = revealed publicly through the
  Cargo Bay history — bots do not see opponents' hidden hands).

## 7. UI

1. **Setup screen** — choose 2-4 seats; per seat toggle Human/AI and
   (for humans) enter a name. "Start Mission" button.
2. **Board screen**
   - Command Console: 5 dice, one per category, colored/icon-labeled.
   - Own hand, face-up, grouped by category.
   - Other seats: card-back count only (hidden information).
   - Cargo Bay: face-up shared row.
   - Supply Deck / Auction Bay: count-only piles.
   - Phase + active-player banner.
   - Contextual action panel driven by `pendingAction`:
     Gift allocate (Keep / Auction Bay / Cargo Bay buttons on the drawn
     card), Gift draw (click a Cargo Bay card), Auction bid (bid input +
     Pass), Auction pay (card picker for Credits-card auctions),
     Mission Control resolve (category picker(s) + direction for mixed).
   - A running log panel (short text log of allocations/bids/results).
3. **End screen** — per-category breakdown (each player's total and
   cards), the winner and why (including which tie-break rule fired, if
   any), each category's awarded die value, final victory point totals,
   and a "New Mission" button.

## 8. Persistence

Entire `GameState` is serialized to `localStorage` after every dispatched
action. On app load, if a saved state exists, prompt "Resume mission?" vs
"New mission" (discarding the save). The save is cleared once a game
reaches `game-over` and the user starts a new one.

## 9. Tech stack

- Vite + React + TypeScript, no backend/server.
- Engine: plain `.ts` modules, no React import, fully unit-tested.
- State wiring: a React context/reducer thin layer that calls engine
  reducers and persists to `localStorage`.
- Testing: Vitest for the engine (deck composition, gift-phase
  allocation rules incl. forced-last-card case, auction payment rules for
  both card types, non-payment penalty, Mission Control dice clamping,
  full scoring/tie-break cascade). Lightweight/no exhaustive UI testing
  beyond manual verification in the browser.

## 10. Known open assumptions

- Church/Mission Control exact card-type counts (9 cards, split as in
  §3) are a reconstruction, since the physical box-back list isn't
  published in any accessible text source. If the user has the physical
  box and wants exact counts corrected later, this is the section to
  revisit.
- Only the standard non-payment penalty is implemented; the "Medieval
  bluff" variant from the rulebook is out of scope.
- No online/networked multiplayer; local hotseat + AI only.
