import type { CSSProperties } from 'react';

/**
 * Where a piece sits in a reveal sequence (`--i`, see `reveal-load` and `reveal-item` in globals.css),
 * plus an optional tilt it straightens out of. Lists can slow or tighten the beat by setting `--step`
 * on a parent.
 */
export function order(index: number, rotate?: string): CSSProperties {
  return { '--i': index, ...(rotate ? { '--reveal-rotate': rotate } : {}) } as CSSProperties;
}
