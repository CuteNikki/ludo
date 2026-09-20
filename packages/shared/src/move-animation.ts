/**
 * How long the board takes to play a move. The server holds the turn for this long before passing it on,
 * so the next player's turn never starts while a piece is still walking.
 */

/** One step of a piece along the track (the board's walk animation). */
export const WALK_STEP_MS = 135;

/** A piece leaving the yard (the spawn flight in the board's CSS). */
export const SPAWN_FLIGHT_MS = 400;

/**
 * After an attacker lands: the captured piece's impact and the start of its flight home. The rest of that
 * flight (about a second in the board's CSS) plays while the next player's die is already rolling.
 */
export const CAPTURE_IMPACT_MS = 450;

export function moveAnimationMs({ from, to, captured }: { from: number; to: number; captured: boolean }): number {
  const travel = from === -1 ? SPAWN_FLIGHT_MS : Math.max(0, to - from) * WALK_STEP_MS;
  return travel + (captured ? CAPTURE_IMPACT_MS : 0);
}
