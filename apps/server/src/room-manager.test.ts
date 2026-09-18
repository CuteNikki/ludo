import { describe, expect, test } from 'bun:test';
import { RoomManager } from './room-manager';

function startGame(rolls: number[] = [6, 3]) {
  let rollIndex = 0;
  const manager = new RoomManager(
    () => undefined,
    60_000,
    () => rolls[rollIndex++] ?? 1,
    900,
    1_800,
    null,
  );
  const first = manager.createRoom('Ada');
  const second = manager.joinRoom(first.state.roomCode, 'Linus');
  manager.setReady(first.state.roomCode, first.playerId, true);
  manager.setReady(first.state.roomCode, second.playerId, true);
  return { manager, first, second };
}

describe('RoomManager game turns', () => {
  test('starts only after every player is ready', () => {
    const manager = new RoomManager();
    const first = manager.createRoom('Ada');
    const second = manager.joinRoom(first.state.roomCode, 'Linus');
    const third = manager.joinRoom(first.state.roomCode, 'Mika');

    manager.setReady(first.state.roomCode, first.playerId, true);
    manager.setReady(first.state.roomCode, second.playerId, true);
    expect(first.state.phase).toBe('lobby');

    manager.setReady(first.state.roomCode, third.playerId, true);
    expect(first.state.phase).toBe('playing');
  });

  test('keeps chosen lobby names and enforces available colors', () => {
    const manager = new RoomManager();
    const first = manager.createRoom('Ada');
    const second = manager.joinRoom(first.state.roomCode, 'Linus');
    manager.setReady(first.state.roomCode, first.playerId, true);

    const updated = manager.updatePlayer(first.state.roomCode, first.playerId, 'Linus', 'green');
    expect(updated.players.find((player) => player.id === first.playerId)).toMatchObject({ name: 'Linus', color: 'green', ready: false });
    expect(() => manager.updatePlayer(first.state.roomCode, second.playerId, 'Linus', 'green')).toThrow('already taken');
  });

  test('only lets the host change settings in the lobby', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    manager.setReady(host.state.roomCode, guest.playerId, true);

    const settings = { moveTimeSeconds: 45 as const, automaticSingleMove: false, fairDice: false };
    expect(() => manager.setSettings(host.state.roomCode, guest.playerId, settings)).toThrow('Only the host');
    const updated = manager.setSettings(host.state.roomCode, host.playerId, settings);
    expect(updated.settings).toEqual(settings);
    expect(updated.players.every((player) => !player.ready)).toBe(true);
    expect(updated.hostPlayerId).toBe(host.playerId);
  });

  test('applies the configured move time and locks settings after start', () => {
    const manager = new RoomManager(
      () => undefined,
      undefined,
      () => 6,
      60_000,
      1_800,
      null,
    );
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    const settings = { moveTimeSeconds: 45 as const, automaticSingleMove: false, fairDice: true };
    manager.setSettings(host.state.roomCode, host.playerId, settings);
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.setReady(host.state.roomCode, guest.playerId, true);

    const beforeRoll = Date.now();
    const rolled = manager.roll(host.state.roomCode, host.playerId);
    expect(rolled.turnDeadline).toBeGreaterThanOrEqual(beforeRoll + 44_900);
    expect(rolled.turnDeadline).toBeLessThanOrEqual(beforeRoll + 45_100);
    expect(() => manager.setSettings(host.state.roomCode, host.playerId, settings)).toThrow('only be changed in the lobby');
  });

  test('only lets the host remove another player in the lobby', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    expect(() => manager.kickPlayer(host.state.roomCode, guest.playerId, host.playerId)).toThrow('Only the host');
    const updated = manager.kickPlayer(host.state.roomCode, host.playerId, guest.playerId);
    expect(updated.players.map((player) => player.id)).toEqual([host.playerId]);
  });

  test('keeps only rematch voters and resets them to the lobby after timeout', async () => {
    let resolveReset: (() => void) | undefined;
    const reset = new Promise<void>((resolve) => {
      resolveReset = resolve;
    });
    const manager = new RoomManager(
      (_roomCode, state) => {
        if (state.phase === 'lobby') resolveReset?.();
      },
      undefined,
      undefined,
      900,
      1_800,
      1_300,
      5,
    );
    const host = manager.createRoom('Ada');
    manager.joinRoom(host.state.roomCode, 'Linus');
    host.state.phase = 'finished';
    host.state.winnerId = host.playerId;

    const voting = manager.voteRematch(host.state.roomCode, host.playerId);
    expect(voting.rematchDeadline).not.toBeNull();
    await reset;
    expect(String(host.state.phase)).toBe('lobby');
    expect(host.state.players.map((player) => player.id)).toEqual([host.playerId]);
    expect(host.state.pieces).toHaveLength(4);
    expect(host.state.pieces.every((piece) => piece.position === -1)).toBe(true);
    expect(host.state.rematchPlayerIds).toEqual([]);
  });

  test('uses a simple fallback and allows duplicate names', () => {
    const manager = new RoomManager();
    const first = manager.createRoom('');
    const second = manager.joinRoom(first.state.roomCode, 'Guest');
    const third = manager.joinRoom(first.state.roomCode, 'Ada');
    const fourth = manager.joinRoom(first.state.roomCode, 'Ada');

    expect(first.state.players.map((player) => player.name)).toEqual(['Guest', 'Guest', 'Ada', 'Ada']);
    expect(second.state.roomCode).toBe(third.state.roomCode);
    expect(fourth.state.players).toHaveLength(4);
  });

  test('requires a six to leave the yard and grants another turn', () => {
    const { manager, first } = startGame();
    const rolled = manager.roll(first.state.roomCode, first.playerId);
    expect(rolled.turnStage).toBe('move');
    // Rolling a six with every piece still at home forces a single random piece out, rather than
    // letting the player choose among all four.
    expect(rolled.movablePieceIds).toHaveLength(1);

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

  test('automatically performs the only legal move', async () => {
    let rollIndex = 0;
    const rolls = [6, 3];
    let movedPieceId = '';
    let resolveLeftYard: (() => void) | undefined;
    let resolveMove: (() => void) | undefined;
    const leftYard = new Promise<void>((resolve) => {
      resolveLeftYard = resolve;
    });
    const moveCompleted = new Promise<void>((resolve) => {
      resolveMove = resolve;
    });
    const manager = new RoomManager(
      (_roomCode, state) => {
        const piece = state.pieces.find((candidate) => candidate.id === movedPieceId);
        if (piece?.position === 0) resolveLeftYard?.();
        if (piece?.position === 3) resolveMove?.();
      },
      60_000,
      () => rolls[rollIndex++] ?? 1,
      60_000,
      10,
      5,
    );
    const first = manager.createRoom('Ada');
    const second = manager.joinRoom(first.state.roomCode, 'Linus');
    manager.setReady(first.state.roomCode, first.playerId, true);
    manager.setReady(first.state.roomCode, second.playerId, true);

    // Rolling a six with every piece still at home now forces a single random piece out
    // automatically, so the first roll already lands in 'auto-move' rather than waiting on
    // an explicit move() call.
    const firstRoll = manager.roll(first.state.roomCode, first.playerId);
    expect(firstRoll.turnStage).toBe('auto-move');
    movedPieceId = firstRoll.movablePieceIds[0]!;
    await leftYard;

    const automaticRoll = manager.roll(first.state.roomCode, first.playerId);
    expect(automaticRoll.turnStage).toBe('auto-move');
    expect(automaticRoll.movablePieceIds).toEqual([movedPieceId]);
    await moveCompleted;
    expect(first.state.pieces.find((piece) => piece.id === movedPieceId)?.position).toBe(3);
  });

  test('clears movable pieces after the winning move', () => {
    const { manager, first } = startGame([6]);
    const pieces = first.state.pieces.filter((piece) => piece.playerId === first.playerId);
    pieces[0]!.position = 40;
    pieces[1]!.position = 41;
    pieces[2]!.position = 42;
    pieces[3]!.position = 37;
    const rolled = manager.roll(first.state.roomCode, first.playerId);

    const finished = manager.move(first.state.roomCode, first.playerId, rolled.movablePieceIds[0]!);
    expect(finished.phase).toBe('finished');
    expect(finished.winnerId).toBe(first.playerId);
    expect(finished.movablePieceIds).toEqual([]);
    expect(finished.turnDeadline).toBeNull();
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
    // With a home piece forced out at random on prior sixes, `moveFirst` is the only piece
    // guaranteed to be the one sitting on the shared track, so move it explicitly rather than
    // trusting movablePieceIds[0], which may now point at a still-home piece instead.
    expect(captureRoll.movablePieceIds).toContain(moveFirst);
    manager.move(first.state.roomCode, first.playerId, moveFirst);
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
