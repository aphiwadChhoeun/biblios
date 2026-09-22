import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScoreCascade } from './useScoreCascade';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('useScoreCascade', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with nothing revealed', () => {
    const { result } = renderHook(() => useScoreCascade(5));

    expect(result.current.revealedCount).toBe(0);
    expect(result.current.done).toBe(false);
  });

  it('reveals one category per step', () => {
    const { result } = renderHook(() => useScoreCascade(5, 500));

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.revealedCount).toBe(1);

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.revealedCount).toBe(2);
  });

  it('stops at the total and reports done', () => {
    const { result } = renderHook(() => useScoreCascade(3, 500));

    act(() => { vi.advanceTimersByTime(500 * 5); });

    expect(result.current.revealedCount).toBe(3);
    expect(result.current.done).toBe(true);
  });

  it('skip jumps straight to the finished state', () => {
    const { result } = renderHook(() => useScoreCascade(5, 500));

    act(() => { result.current.skip(); });

    expect(result.current.revealedCount).toBe(5);
    expect(result.current.done).toBe(true);
  });

  it('reveals everything immediately when reduced motion is requested', () => {
    mockReducedMotion(true);

    const { result } = renderHook(() => useScoreCascade(5, 500));

    expect(result.current.revealedCount).toBe(5);
    expect(result.current.done).toBe(true);
  });
});
