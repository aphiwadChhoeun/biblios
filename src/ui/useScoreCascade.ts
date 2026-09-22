import { useCallback, useEffect, useState } from 'react';

export interface ScoreCascade {
  revealedCount: number;
  done: boolean;
  skip: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveals a final score one category at a time. Returns how many categories
 * have landed so far, so the caller can build running totals from them rather
 * than jumping straight to the final figures.
 */
export function useScoreCascade(total: number, stepMs = 500): ScoreCascade {
  const skipAnimation = prefersReducedMotion();
  const [revealedCount, setRevealedCount] = useState(() => (skipAnimation ? total : 0));

  useEffect(() => {
    if (skipAnimation) return undefined;
    const timer = setInterval(() => setRevealedCount((n) => Math.min(n + 1, total)), stepMs);
    return () => clearInterval(timer);
  }, [total, stepMs, skipAnimation]);

  const skip = useCallback(() => setRevealedCount(total), [total]);

  return { revealedCount, done: revealedCount >= total, skip };
}
