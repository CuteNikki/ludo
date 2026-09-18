import type { GameState, PlayerColor } from '@ludo/shared';
import { useEffect, useRef, useState } from 'react';
import { type Coordinate, YARDS, getCellPosition, getPieceCoordinate } from './board-geometry';

/**
 * What a piece is visually doing right now, and where it should be drawn while that's happening.
 * A piece with no entry here is idle: render it at its ground-truth board coordinate directly.
 */
export type PieceAnimation =
  | { kind: 'moving'; coordinate: Coordinate }
  | { kind: 'spawning'; coordinate: Coordinate; from: Coordinate; to: Coordinate }
  | { kind: 'holding'; coordinate: Coordinate }
  | { kind: 'capturing'; coordinate: Coordinate; from: Coordinate; to: Coordinate }
  | { kind: 'recoloring'; coordinate: Coordinate; from: Coordinate; to: Coordinate; color: PlayerColor };

const WALK_STEP_MS = 135;
const WALK_EASING = 'cubic-bezier(0.22, 0.8, 0.25, 1)';

/**
 * Diffs consecutive GameStates to drive the board's piece animations, as a single source of truth
 * per piece instead of several parallel, hand-timed state variables. Flight animations (spawn/capture)
 * clear themselves via the CSS `animationend` event, and multi-cell walks play as a single native
 * Web Animations API sequence, so none of this relies on JS timers to stay in sync with what's
 * actually on screen - a throttled or backgrounded tab can delay these, but never desync them.
 */
export function usePieceAnimations(state: GameState) {
  const [animations, setAnimations] = useState<Record<string, PieceAnimation>>({});
  const previousPositions = useRef(new Map(state.pieces.map((piece) => [piece.id, piece.position])));
  const previousColors = useRef(new Map(state.players.map((player) => [player.id, player.color])));
  const nodes = useRef(new Map<string, HTMLElement>());
  const walkAnimations = useRef(new Map<string, Animation>());

  useEffect(() => {
    let cancelled = false;
    const previous = previousPositions.current;
    const previousPlayerColors = previousColors.current;
    previousPositions.current = new Map(state.pieces.map((piece) => [piece.id, piece.position]));
    previousColors.current = new Map(state.players.map((player) => [player.id, player.color]));

    // A 'moving' or 'holding' entry only resolves itself once this effect's own async work finishes.
    // If a prior run got superseded before that happened (e.g. two moves arriving in quick succession),
    // its entry is orphaned: the position it was animating toward is already settled, so it's safe to drop.
    setAnimations((current) => {
      let changed = false;
      const next = { ...current };
      for (const piece of state.pieces) {
        const animation = next[piece.id];
        if ((animation?.kind === 'moving' || animation?.kind === 'holding') && previous.get(piece.id) === piece.position) {
          delete next[piece.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });

    async function animate() {
      const spawns: Record<string, PieceAnimation> = {};
      const captureHolds: Record<string, PieceAnimation> = {};
      const captureFlights: Record<string, PieceAnimation> = {};
      const recolors: Record<string, PieceAnimation> = {};
      const walks: Array<{ pieceId: string; waypoints: Coordinate[] }> = [];

      for (const player of state.players) {
        const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
        const previousColor = previousPlayerColors.get(player.id);
        pieces.forEach((piece, yardIndex) => {
          const previousPosition = previous.get(piece.id);
          if (previousPosition === undefined) return;

          // The player picked a different color in the lobby: fly the piece to its new yard slot
          // still wearing the old color, so the swap reads as an arrival rather than a jump-cut.
          if (previousPosition === piece.position && previousColor !== undefined && previousColor !== player.color) {
            const from = getPieceCoordinate(piece, previousColor, yardIndex);
            const to = getPieceCoordinate(piece, player.color, yardIndex);
            if (from && to) recolors[piece.id] = { kind: 'recoloring', coordinate: to, from, to, color: previousColor };
            return;
          }

          if (previousPosition >= 0 && piece.position === -1) {
            const from = getPieceCoordinate({ ...piece, position: previousPosition }, player.color, yardIndex);
            const to = getPieceCoordinate(piece, player.color, yardIndex);
            if (from && to) {
              // Pin the captured piece at its old spot first, so it doesn't jump home the instant the
              // state updates - it only takes flight once the attacker's walk below has visually arrived.
              captureHolds[piece.id] = { kind: 'holding', coordinate: from };
              captureFlights[piece.id] = { kind: 'capturing', coordinate: to, from, to };
            }
            return;
          }

          if (previousPosition >= 0 && piece.position > previousPosition) {
            const waypoints: Coordinate[] = [];
            for (let position = previousPosition; position <= piece.position; position += 1) {
              const coordinate = getPieceCoordinate({ ...piece, position }, player.color, 0);
              if (coordinate) waypoints.push(coordinate);
            }
            if (waypoints.length > 1) walks.push({ pieceId: piece.id, waypoints });
            return;
          }

          if (previousPosition < 0 && piece.position >= 0) {
            const from = YARDS[player.color][yardIndex];
            const to = getPieceCoordinate(piece, player.color, 0);
            if (from && to) spawns[piece.id] = { kind: 'spawning', coordinate: to, from, to };
          }
        });
      }

      const walkTargets: Record<string, PieceAnimation> = {};
      for (const walk of walks) {
        const destination = walk.waypoints[walk.waypoints.length - 1];
        if (destination) walkTargets[walk.pieceId] = { kind: 'moving', coordinate: destination };
      }

      if (
        Object.keys(spawns).length > 0 ||
        Object.keys(captureHolds).length > 0 ||
        Object.keys(walkTargets).length > 0 ||
        Object.keys(recolors).length > 0
      ) {
        setAnimations((current) => ({ ...current, ...spawns, ...captureHolds, ...walkTargets, ...recolors }));
      }

      await Promise.all(walks.map(({ pieceId, waypoints }) => playWalk(pieceId, waypoints, nodes.current.get(pieceId), walkAnimations.current)));
      for (const { pieceId } of walks) {
        if (!cancelled) clearAnimation(pieceId, 'moving');
      }

      if (!cancelled && Object.keys(captureFlights).length > 0) {
        setAnimations((current) => ({ ...current, ...captureFlights }));
      }
    }

    void animate();
    return () => {
      cancelled = true;
    };
  }, [state.pieces, state.players, state.revision]);

  function clearAnimation(pieceId: string, kind: PieceAnimation['kind']) {
    setAnimations((current) => {
      if (current[pieceId]?.kind !== kind) return current;
      const { [pieceId]: _removed, ...rest } = current;
      return rest;
    });
  }

  function registerNode(pieceId: string, node: HTMLElement | null) {
    if (node) nodes.current.set(pieceId, node);
    else nodes.current.delete(pieceId);
  }

  return { animations, clearAnimation, registerNode };
}

/**
 * Plays a piece's hop across several board cells as one native Web Animations API sequence instead
 * of a JS-driven timer/rAF loop. The browser owns the whole keyframe list, so a throttled or
 * backgrounded tab can only delay playback - it can never skip a waypoint (which would cut a corner)
 * or burst through several steps at once when the tab regains focus.
 */
async function playWalk(pieceId: string, waypoints: Coordinate[], element: HTMLElement | undefined, running: Map<string, Animation>): Promise<void> {
  if (!element || waypoints.length < 2) return;

  running.get(pieceId)?.cancel();
  const animation = element.animate(
    waypoints.map((coordinate) => ({ left: getCellPosition(coordinate[1]), top: getCellPosition(coordinate[0]), easing: WALK_EASING })),
    { duration: (waypoints.length - 1) * WALK_STEP_MS, fill: 'forwards' },
  );
  running.set(pieceId, animation);

  try {
    await animation.finished;
  } catch {
    // Cancelled because a newer move for the same piece started a fresh animation - nothing to do.
  } finally {
    if (running.get(pieceId) === animation) running.delete(pieceId);
    animation.cancel();
  }
}
