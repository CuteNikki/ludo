import { describe, expect, test } from 'bun:test';
import { RoomManager } from './room-manager';

function startGame(rolls: number[] = [6, 3]) {
  let rollIndex = 0;
  const manager = new RoomManager(
    () => undefined,
    60_000,
    () => rolls[rollIndex++] ?? 1,
  );
  const first = manager.createRoom('Ada');
  const second = manager.joinRoom(first.state.roomCode, 'Linus');
  manager.setReady(first.state.roomCode, first.playerId, true);
  manager.setReady(first.state.roomCode, second.playerId, true);
  return { manager, first, second };
}

describe('RoomManager game turns', () => {
  test('assigns distinct fallback and duplicate names', () => {
    const manager = new RoomManager();
    const first = manager.createRoom('');
    const second = manager.joinRoom(first.state.roomCode, 'Gast');
    const third = manager.joinRoom(first.state.roomCode, 'Ada');
    const fourth = manager.joinRoom(first.state.roomCode, 'Ada');

    expect(first.state.players.map((player) => player.name)).toEqual(['Gast Rot', 'Gast Blau', 'Ada', 'Ada 2']);
    expect(second.state.roomCode).toBe(third.state.roomCode);
    expect(fourth.state.players).toHaveLength(4);
  });

  test('requires a six to leave the yard and grants another turn', () => {
    const { manager, first } = startGame();
    const rolled = manager.roll(first.state.roomCode, first.playerId);
    expect(rolled.turnStage).toBe('move');
    expect(rolled.movablePieceIds).toHaveLength(4);

    const pieceId = rolled.movablePieceIds[0]!;
    const moved = manager.move(first.state.roomCode, first.playerId, pieceId);
    expect(moved.pieces.find((piece) => piece.id === pieceId)?.position).toBe(0);
    expect(moved.currentPlayerId).toBe(first.playerId);
    expect(moved.turnStage).toBe('rolling');
  });

  test('moves an active piece and hands over the turn', () => {
    const { manager, first, second } = startGame();
    const firstRoll = manager.roll(first.state.roomCode, first.playerId);
    manager.move(first.state.roomCode, first.playerId, firstRoll.movablePieceIds[0]!);
    const secondRoll = manager.roll(first.state.roomCode, first.playerId);
    const pieceId = secondRoll.movablePieceIds[0]!;
    const moved = manager.move(first.state.roomCode, first.playerId, pieceId);

    expect(moved.pieces.find((piece) => piece.id === pieceId)?.position).toBe(3);
    expect(moved.currentPlayerId).toBe(second.playerId);
  });

  test('captures an opponent on the shared track', () => {
    const { manager, first, second } = startGame([6, 5, 6, 1, 6]);
    const moveFirst = manager.roll(first.state.roomCode, first.playerId).movablePieceIds[0]!;
    manager.move(first.state.roomCode, first.playerId, moveFirst);
    manager.move(first.state.roomCode, first.playerId, manager.roll(first.state.roomCode, first.playerId).movablePieceIds[0]!);

    const moveSecond = manager.roll(first.state.roomCode, second.playerId).movablePieceIds[0]!;
    manager.move(first.state.roomCode, second.playerId, moveSecond);
    manager.move(first.state.roomCode, second.playerId, manager.roll(first.state.roomCode, second.playerId).movablePieceIds[0]!);

    const captureRoll = manager.roll(first.state.roomCode, first.playerId);
    manager.move(first.state.roomCode, first.playerId, captureRoll.movablePieceIds[0]!);
    expect(first.state.pieces.find((piece) => piece.id === moveSecond)?.position).toBe(-1);
  });

  test('automatically rolls, shows no move, and advances', async () => {
    let secondPlayerId = '';
    const observedStages: string[] = [];
    let resolveTurn: (() => void) | undefined;
    const turnAdvanced = new Promise<void>((resolve) => {
      resolveTurn = resolve;
    });
    const manager = new RoomManager(
      (_roomCode, state) => {
        observedStages.push(`${state.currentPlayerId}:${state.turnStage}:${state.diceResult}`);
        if (state.currentPlayerId === secondPlayerId && state.turnStage === 'rolling') resolveTurn?.();
      },
      10,
      () => 1,
      5,
      5,
    );
    const first = manager.createRoom('Ada');
    const second = manager.joinRoom(first.state.roomCode, 'Linus');
    secondPlayerId = second.playerId;
    manager.setReady(first.state.roomCode, first.playerId, true);
    manager.setReady(first.state.roomCode, second.playerId, true);

    await turnAdvanced;
    expect(observedStages).toContain(`${first.playerId}:no-move:1`);
    expect(first.state.currentPlayerId).toBe(second.playerId);
    expect(first.state.turnStage).toBe('rolling');
  });
});
