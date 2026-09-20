import { CAPTURE_IMPACT_MS, SPAWN_FLIGHT_MS, WALK_STEP_MS, moveAnimationMs } from '@ludo/shared';
import { describe, expect, test } from 'bun:test';

describe('moveAnimationMs', () => {
  test('a walk takes one step time per square', () => {
    expect(moveAnimationMs({ from: 5, to: 8, captured: false })).toBe(3 * WALK_STEP_MS);
    expect(moveAnimationMs({ from: 10, to: 16, captured: false })).toBe(6 * WALK_STEP_MS);
  });

  test('leaving the yard takes the spawn flight, whatever the roll', () => {
    expect(moveAnimationMs({ from: -1, to: 0, captured: false })).toBe(SPAWN_FLIGHT_MS);
  });

  test('a capture adds the impact of the captured piece', () => {
    expect(moveAnimationMs({ from: 5, to: 8, captured: true })).toBe(3 * WALK_STEP_MS + CAPTURE_IMPACT_MS);
    expect(moveAnimationMs({ from: -1, to: 0, captured: true })).toBe(SPAWN_FLIGHT_MS + CAPTURE_IMPACT_MS);
  });

  test('a piece that did not move takes no time', () => {
    expect(moveAnimationMs({ from: 7, to: 7, captured: false })).toBe(0);
  });
});
