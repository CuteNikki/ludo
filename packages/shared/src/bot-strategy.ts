import type { GameState, PlayerColor } from './index';

export const TRACK_LENGTH = 40;
const START_OFFSETS: Record<PlayerColor, number> = { red: 0, blue: 10, green: 20, yellow: 30 };

/** Converts a piece's position relative to its own start into a square on the shared 40-square track. */
export function toBoardPosition(color: PlayerColor, relativePosition: number): number {
  return (START_OFFSETS[color] + relativePosition) % TRACK_LENGTH;
}

/**
 * Picks which of the currently movable pieces a bot should move. Every option is scored on a few
 * simple heuristics - capture > enter the home stretch > leave the yard > escape danger - with a
 * little randomness so two bots in the same spot don't always play identically.
 */
export function chooseBotMove(state: GameState, playerId: string, random: () => number = Math.random): string | null {
  const dice = state.diceResult;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (dice === null || !player) return null;

  const opponents = state.pieces
    .filter((piece) => piece.playerId !== playerId)
    .flatMap((piece) => {
      const owner = state.players.find((candidate) => candidate.id === piece.playerId);
      return owner ? [{ piece, color: owner.color }] : [];
    });

  /** Whether an opponent could land on `boardPosition` next turn: a piece 1-6 squares behind it, or a six that spawns onto it. */
  function isThreatened(boardPosition: number): boolean {
    return opponents.some(({ piece, color }) => {
      if (piece.position === -1) return toBoardPosition(color, 0) === boardPosition;
      if (piece.position >= TRACK_LENGTH) return false;
      const distance = (boardPosition - toBoardPosition(color, piece.position) + TRACK_LENGTH) % TRACK_LENGTH;
      return distance >= 1 && distance <= 6 && piece.position + distance < TRACK_LENGTH;
    });
  }

  let best: { pieceId: string; score: number } | null = null;
  for (const pieceId of state.movablePieceIds) {
    const piece = state.pieces.find((candidate) => candidate.id === pieceId && candidate.playerId === playerId);
    if (!piece) continue;

    const target = piece.position === -1 ? 0 : piece.position + dice;
    let score = random() * 2 + target * 0.3;

    if (target >= TRACK_LENGTH) {
      // Pieces in the home stretch can't be captured; getting there is worth more than moving inside it.
      score += piece.position < TRACK_LENGTH ? 45 : 2;
    } else {
      const targetBoard = toBoardPosition(player.color, target);
      const victim = opponents.find(({ piece: other, color }) => other.position >= 0 && other.position < TRACK_LENGTH && toBoardPosition(color, other.position) === targetBoard);
      if (victim) score += 80 + victim.piece.position * 0.5;
      if (isThreatened(targetBoard)) score -= 30;
    }

    if (piece.position === -1) score += 35;
    else if (piece.position < TRACK_LENGTH && isThreatened(toBoardPosition(player.color, piece.position))) score += 25;

    if (!best || score > best.score) best = { pieceId, score };
  }
  return best?.pieceId ?? null;
}
