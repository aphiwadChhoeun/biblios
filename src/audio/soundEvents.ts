import { GameState } from '../engine/types';

export type SoundKey = 'draw' | 'bid' | 'auction-win' | 'mission-alert' | 'game-over';

/** Pure diff over two GameState snapshots taken immediately before/after a
 *  single dispatch call. Detection is state-shape based (not action based) so
 *  it works uniformly for both human-dispatched and AI-dispatched moves. */
export function detectSoundEvent(prev: GameState, next: GameState): SoundKey | null {
  const prevPending = prev.pendingAction;
  const nextPending = next.pendingAction;

  if (nextPending.type === 'game-over' && prevPending.type !== 'game-over') {
    return 'game-over';
  }

  if (nextPending.type === 'mission-resolve' && prevPending.type !== 'mission-resolve') {
    return 'mission-alert';
  }

  if (nextPending.type === 'auction-pay' && prevPending.type !== 'auction-pay') {
    return 'auction-win';
  }

  if (prevPending.type === 'auction-bid' && nextPending.type === 'auction-bid') {
    if (nextPending.bid.highBid > prevPending.bid.highBid) return 'bid';
  }

  // A card just left the Cargo Bay draft, or a fresh card was drawn from the
  // Supply Deck for allocation.
  if (prevPending.type === 'gift-draw') return 'draw';
  if (
    nextPending.type === 'gift-allocate' &&
    (prevPending.type !== 'gift-allocate' || prevPending.drawnCard.id !== nextPending.drawnCard.id)
  ) {
    return 'draw';
  }

  return null;
}
