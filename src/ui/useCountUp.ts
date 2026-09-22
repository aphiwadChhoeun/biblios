import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from zero up to `target` once on mount. Returns `target` immediately
 *  when the viewer has asked for reduced motion. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // Ease-out so the tally settles rather than stopping dead.
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
