import { chooseBotMove, toBoardPosition, type GameState, type PlayerColor } from '@ludo/shared';

export type PreviewPlayer = { id: string; name: string; color: PlayerColor };

const PREVIEW_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

export function createPreviewPlayers(t: (key: string) => string): PreviewPlayer[] {
  return PREVIEW_COLORS.map((color) => ({ id: `preview-${color}`, name: t(`room.colors.${color}`), color }));
}

// A mid-game snapshot rather than an empty board, so the demo is interesting from the first frame.
const previewStartPositions = [
  [3, -1, 25, 40],
  [-1, 12, 25, -1],
  [3, -1, -1, 40],
  [-1, 12, 25, 40],
];

export function createPreviewState(previewPlayers: PreviewPlayer[]): GameState {
  return {
    roomCode: 'DEMO',
    hostPlayerId: previewPlayers[0]?.id ?? null,
    settings: { moveTimeSeconds: 30, automaticSingleMove: true, fairDice: true, isPublic: false, mustSpawnOnSix: false },
    phase: 'playing',
    turnStage: 'rolling',
    turnDeadline: null,
    players: previewPlayers.map((player) => ({ ...player, connected: true, ready: true, isBot: true })),
    pieces: previewPlayers.flatMap((player, playerIndex) =>
      Array.from({ length: 4 }, (_, pieceIndex) => ({
        id: `${player.id}-piece-${pieceIndex}`,
        playerId: player.id,
        position: previewStartPositions[playerIndex]?.[pieceIndex] ?? -1,
      })),
    ),
    currentPlayerId: previewPlayers[0]?.id ?? null,
    diceResult: null,
    movablePieceIds: [],
    winnerId: null,
    rematchDeadline: null,
    rematchPlayerIds: [],
    revision: 0,
  };
}

/**
 * Plays one turn of the landing-page demo for `playerId` with the given roll, choosing the piece
 * exactly like the server's bots do (`chooseBotMove`). Mirrors the real rules: a six needed to leave
 * the yard, captures on the shared track, and an extra roll after a six that was actually played.
 */
export function playPreviewTurn(
  state: GameState,
  playerId: string,
  roll: number,
  random: () => number = Math.random,
): { state: GameState; extraTurn: boolean } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return { state, extraTurn: false };

  const ownPieces = state.pieces.filter((piece) => piece.playerId === playerId);
  const movablePieceIds = ownPieces
    .filter((piece) => {
      const target = piece.position === -1 ? (roll === 6 ? 0 : -1) : piece.position + roll;
      return target >= 0 && target <= 43 && !ownPieces.some((other) => other.id !== piece.id && other.position === target);
    })
    .map((piece) => piece.id);

  const rolled = { ...state, currentPlayerId: playerId, diceResult: roll, movablePieceIds };
  const chosenId = chooseBotMove(rolled, playerId, random);
  if (!chosenId) return { state: { ...rolled, revision: state.revision + 1 }, extraTurn: false };

  const pieces = state.pieces.map((piece) => ({ ...piece }));
  const moved = pieces.find((piece) => piece.id === chosenId)!;
  moved.position = moved.position === -1 ? 0 : moved.position + roll;

  if (moved.position < 40) {
    const target = toBoardPosition(player.color, moved.position);
    for (const opponentPiece of pieces) {
      if (opponentPiece.playerId === playerId || opponentPiece.position < 0 || opponentPiece.position >= 40) continue;
      const opponent = state.players.find((candidate) => candidate.id === opponentPiece.playerId);
      if (opponent && toBoardPosition(opponent.color, opponentPiece.position) === target) opponentPiece.position = -1;
    }
  }

  const won = pieces.filter((piece) => piece.playerId === playerId).every((piece) => piece.position >= 40);
  return {
    state: {
      ...rolled,
      pieces,
      movablePieceIds: [],
      phase: won ? 'finished' : 'playing',
      winnerId: won ? playerId : null,
      revision: state.revision + 1,
    },
    extraTurn: roll === 6 && !won,
  };
}
