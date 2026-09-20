import { WALK_STEP_MS, type GameState } from '@ludo/shared';
import { useLayoutEffect, useRef, useState } from 'react';

import { YARDS, getCellPosition, getPieceCoordinate, type Coordinate } from './board-geometry';

/**
 * What a piece is visually doing right now, and where it should be drawn while that's happening.
 * A piece with no entry here is idle: render it at its ground-truth board coordinate directly, and
 * a plain CSS transition (see game-board.tsx) carries it smoothly between two idle coordinates -
 * this is what makes a lobby color swap glide to its new yard slot instead of jump-cutting there.
 *
 * Every entry carries the `token` of the animation that created it. Work that finishes later (the end
 * of a walk, the start of a capture flight) only touches an entry that still has its own token, so a
 * newer update can replace an entry without the older animation's leftovers clobbering it - and an
 * update that changes nothing about a piece can't cancel what that piece is in the middle of.
 */
export type PieceAnimation =
  | { kind: 'moving'; coordinate: Coordinate; token: number }
  | { kind: 'spawning'; coordinate: Coordinate; from: Coordinate; to: Coordinate; token: number }
  | { kind: 'holding'; coordinate: Coordinate; token: number }
  | { kind: 'capturing'; coordinate: Coordinate; from: Coordinate; to: Coordinate; token: number };

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
  const nodes = useRef(new Map<string, HTMLElement>());
  const walkAnimations = useRef(new Map<string, Animation>());
  const lastToken = useRef(0);

  // A layout effect, not a plain one: it runs before the browser draws the new state. Otherwise the
  // first frame of a capture would show the captured piece already sitting in its yard (and the
  // attacker already at its destination) and only afterwards pin them back where they were, which
  // reads as a piece sliding home early and then jumping back. Slower devices make that frame likely.
  useLayoutEffect(() => {
    const previous = previousPositions.current;
    previousPositions.current = new Map(state.pieces.map((piece) => [piece.id, piece.position]));

    const spawns: Record<string, PieceAnimation> = {};
    const captureHolds: Record<string, PieceAnimation> = {};
    const captureFlights: Record<string, PieceAnimation> = {};
    const walks: Array<{ pieceId: string; waypoints: Coordinate[]; token: number }> = [];

    for (const player of state.players) {
      const pieces = state.pieces.filter((piece) => piece.playerId === player.id);
      pieces.forEach((piece, yardIndex) => {
        const previousPosition = previous.get(piece.id);
        if (previousPosition === undefined) return;

        if (previousPosition >= 0 && piece.position === -1) {
          const from = getPieceCoordinate({ ...piece, position: previousPosition }, player.color, yardIndex);
          const to = getPieceCoordinate(piece, player.color, yardIndex);
          if (from && to) {
            // Pin the captured piece at its old spot first, so it doesn't jump home the instant the
            // state updates - it only takes flight once the attacker's walk below has visually arrived.
            captureHolds[piece.id] = { kind: 'holding', coordinate: from, token: ++lastToken.current };
            captureFlights[piece.id] = { kind: 'capturing', coordinate: to, from, to, token: ++lastToken.current };
          }
          return;
        }

        if (previousPosition >= 0 && piece.position > previousPosition) {
          const waypoints: Coordinate[] = [];
          for (let position = previousPosition; position <= piece.position; position += 1) {
            const coordinate = getPieceCoordinate({ ...piece, position }, player.color, 0);
            if (coordinate) waypoints.push(coordinate);
          }
          if (waypoints.length > 1) walks.push({ pieceId: piece.id, waypoints, token: ++lastToken.current });
          return;
        }

        if (previousPosition < 0 && piece.position >= 0) {
          const from = YARDS[player.color][yardIndex];
          const to = getPieceCoordinate(piece, player.color, 0);
          if (from && to) spawns[piece.id] = { kind: 'spawning', coordinate: to, from, to, token: ++lastToken.current };
        }
      });
    }

    const walkTargets: Record<string, PieceAnimation> = {};
    for (const walk of walks) {
      const destination = walk.waypoints[walk.waypoints.length - 1];
      if (destination) walkTargets[walk.pieceId] = { kind: 'moving', coordinate: destination, token: walk.token };
    }

    // An update that moved nothing (a roll, a turn change, someone watching) has nothing to say about the
    // pieces, and must leave whatever an earlier update started running.
    if (Object.keys(spawns).length === 0 && Object.keys(captureHolds).length === 0 && walks.length === 0) return;

    setAnimations((current) => ({ ...current, ...spawns, ...captureHolds, ...walkTargets }));

    void (async () => {
      await Promise.all(walks.map(({ pieceId, waypoints }) => playWalk(pieceId, waypoints, nodes.current.get(pieceId), walkAnimations.current)));

      // Even if a newer update has arrived in the meantime, this walk still ends and its captured pieces
      // still fly home - as long as nothing newer has taken those pieces over.
      setAnimations((current) => {
        const next = { ...current };
        let changed = false;
        for (const { pieceId, token } of walks) {
          if (next[pieceId]?.kind === 'moving' && next[pieceId]?.token === token) {
            delete next[pieceId];
            changed = true;
          }
        }
        for (const [pieceId, flight] of Object.entries(captureFlights)) {
          const hold = captureHolds[pieceId];
          if (hold && next[pieceId]?.token === hold.token) {
            next[pieceId] = flight;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    })();
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
