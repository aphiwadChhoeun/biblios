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
  | {
      type: 'gift-allocate';
      playerId: string;
      drawnCard: Card;
      selfFilled: boolean;
      auctionFilled: boolean;
      cargoAllowed: boolean;
    }
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
