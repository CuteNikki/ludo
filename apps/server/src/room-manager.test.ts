import { describe, expect, test } from 'bun:test';
import { RoomManager, type PlayerLeftEvent, type RematchTransition } from './room-manager';

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

    const settings = { moveTimeSeconds: 45 as const, automaticSingleMove: false, fairDice: false, isPublic: true, mustSpawnOnSix: false };
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
    const settings = { moveTimeSeconds: 45 as const, automaticSingleMove: false, fairDice: true, isPublic: false, mustSpawnOnSix: false };
    manager.setSettings(host.state.roomCode, host.playerId, settings);
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.setReady(host.state.roomCode, guest.playerId, true);

    const beforeRoll = Date.now();
    const rolled = manager.roll(host.state.roomCode, host.playerId);
    expect(rolled.turnDeadline).toBeGreaterThanOrEqual(beforeRoll + 44_900);
    expect(rolled.turnDeadline).toBeLessThanOrEqual(beforeRoll + 45_100);
    expect(() => manager.setSettings(host.state.roomCode, host.playerId, settings)).toThrow('only be changed in the lobby');
  });

  test('only lists rooms that opted into public visibility', () => {
    const manager = new RoomManager();
    const publicRoom = manager.createRoom('Ada');
    manager.joinRoom(publicRoom.state.roomCode, 'Linus');
    const settings = {
      moveTimeSeconds: 30 as const,
      automaticSingleMove: true,
      fairDice: true,
      isPublic: true,
      mustSpawnOnSix: false,
    };
    manager.setSettings(publicRoom.state.roomCode, publicRoom.playerId, settings);
    manager.createRoom('Mika'); // stays private by default

    const listed = manager.listPublicRooms();
    expect(listed).toEqual([
      { roomCode: publicRoom.state.roomCode, hostName: 'Ada', playerCount: 2, maxPlayers: 4, phase: 'lobby', settings },
    ]);
  });

  test('reports an accurate reason for kicks, voluntary leaves and disconnect timeouts', async () => {
    const leftEvents: PlayerLeftEvent[] = [];
    const manager = new RoomManager(() => undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, (_roomCode, event) =>
      leftEvents.push(event),
    );
    const host = manager.createRoom('Ada');
    const kicked = manager.joinRoom(host.state.roomCode, 'Linus');
    const leaver = manager.joinRoom(host.state.roomCode, 'Mika');
    manager.joinRoom(host.state.roomCode, 'Otto');

    manager.kickPlayer(host.state.roomCode, host.playerId, kicked.playerId);
    manager.leaveRoom(host.state.roomCode, leaver.playerId);

    expect(leftEvents).toEqual([
      { playerId: kicked.playerId, playerName: 'Linus', reason: 'kicked' },
      { playerId: leaver.playerId, playerName: 'Mika', reason: 'left' },
    ]);
  });

  test('only lets the host remove another player in the lobby', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    expect(() => manager.kickPlayer(host.state.roomCode, guest.playerId, host.playerId)).toThrow('Only the host');
    const updated = manager.kickPlayer(host.state.roomCode, host.playerId, guest.playerId);
    expect(updated.players.map((player) => player.id)).toEqual([host.playerId]);
  });

  test('moves rematch voters into a brand-new room and drops inactive players after timeout', async () => {
    let resolveTransition: ((transition: RematchTransition) => void) | undefined;
    const transitionPromise = new Promise<RematchTransition>((resolve) => {
      resolveTransition = resolve;
    });
    const manager = new RoomManager(
      () => undefined,
      undefined,
      undefined,
      900,
      1_800,
      1_300,
      5,
      (transition) => resolveTransition?.(transition),
    );
    const host = manager.createRoom('Ada');
    const oldRoomCode = host.state.roomCode;
    manager.joinRoom(oldRoomCode, 'Linus');
    host.state.phase = 'finished';
    host.state.winnerId = host.playerId;

    const voting = manager.voteRematch(oldRoomCode, host.playerId);
    expect(voting?.rematchDeadline).not.toBeNull();
    const transition = await transitionPromise;

    expect(transition.oldRoomCode).toBe(oldRoomCode);
    expect(transition.newRoomCode).not.toBeNull();
    expect(transition.newRoomCode).not.toBe(oldRoomCode);
    expect(transition.movedPlayerIds).toEqual([host.playerId]);

    // The old room is gone entirely - only the rematch-confirming player carries over.
    expect(manager.getRoomState(oldRoomCode)).toBeNull();
    const newState = manager.getRoomState(transition.newRoomCode!);
    expect(newState?.phase).toBe('lobby');
    expect(newState?.players.map((player) => player.id)).toEqual([host.playerId]);
    expect(newState?.pieces).toHaveLength(4);
    expect(newState?.pieces.every((piece) => piece.position === -1)).toBe(true);
    expect(newState?.rematchPlayerIds).toEqual([]);
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

  test('forces a spawn on six over moving a board piece when "must spawn on six" is enabled', () => {
    const manager = new RoomManager(() => undefined, 60_000, () => 6, 900, 1_800, null);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    manager.setSettings(host.state.roomCode, host.playerId, {
      moveTimeSeconds: 30,
      automaticSingleMove: true,
      fairDice: false,
      isPublic: false,
      mustSpawnOnSix: true,
    });
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.setReady(host.state.roomCode, guest.playerId, true);

    // Give the host a piece already on the board, so a six would otherwise offer a real choice
    // between moving it 6 tiles and spawning a new piece out of the yard.
    const onBoardPiece = host.state.pieces.find((piece) => piece.playerId === host.playerId)!;
    onBoardPiece.position = 5;

    const rolled = manager.roll(host.state.roomCode, host.playerId);
    expect(rolled.movablePieceIds).toHaveLength(1);
    const forcedPiece = host.state.pieces.find((piece) => piece.id === rolled.movablePieceIds[0]);
    expect(forcedPiece?.position).toBe(-1);
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

describe('RoomManager bots', () => {
  test('lets only the host add bots in the lobby, up to the room size', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    expect(() => manager.addBot(host.state.roomCode, guest.playerId)).toThrow('Only the host');
    manager.addBot(host.state.roomCode, host.playerId);
    expect(() => manager.addBot(host.state.roomCode, host.playerId)).not.toThrow();
    expect(host.state.players).toHaveLength(4);
    expect(() => manager.addBot(host.state.roomCode, host.playerId)).toThrow('full');

    const bots = host.state.players.filter((player) => player.isBot);
    expect(bots).toHaveLength(2);
    expect(new Set(host.state.players.map((player) => player.color)).size).toBe(4);
    expect(bots.every((bot) => bot.ready && bot.connected)).toBe(true);
  });

  test('resets humans to not ready when a bot joins, but keeps bots ready', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.addBot(host.state.roomCode, host.playerId);

    expect(host.state.players.find((player) => player.id === host.playerId)?.ready).toBe(false);
    manager.setSettings(host.state.roomCode, host.playerId, { ...host.state.settings, fairDice: false });
    expect(host.state.players.find((player) => player.isBot)?.ready).toBe(true);
  });

  test('starts a single-player game once the lone human is ready', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);
    expect(host.state.phase).toBe('lobby');

    manager.setReady(host.state.roomCode, host.playerId, true);
    expect(host.state.phase).toBe('playing');
  });

  test('refuses to add bots once the game is running', () => {
    const { manager, first } = startGame();
    expect(() => manager.addBot(first.state.roomCode, first.playerId)).toThrow('only be added in the lobby');
  });

  test('plays its own moves without a turn timer', async () => {
    // Human: 6 (spawn), 1 (step). Bot: 6 (spawn), 1 (step) - all moves after the roll are made by
    // the manager for the bot, and by this test's listener for the human.
    const rolls = [6, 1, 6, 1];
    let rollIndex = 0;
    let humanId = '';
    let botId = '';
    let stopped = false;
    let resolveBotStepped: (() => void) | undefined;
    const botStepped = new Promise<void>((resolve) => {
      resolveBotStepped = resolve;
    });
    const manager: RoomManager = new RoomManager(
      (roomCode, state) => {
        if (stopped) return;
        if (state.pieces.some((piece) => piece.playerId === botId && piece.position === 1)) {
          stopped = true;
          resolveBotStepped?.();
          return;
        }
        if (state.currentPlayerId === humanId && state.turnStage === 'move') manager.move(roomCode, humanId, state.movablePieceIds[0]!);
      },
      60_000,
      () => rolls[rollIndex++] ?? 1,
      5,
      5,
      null,
      30_000,
      () => undefined,
      () => undefined,
      5,
    );
    const host = manager.createRoom('Ada');
    humanId = host.playerId;
    manager.addBot(host.state.roomCode, host.playerId);
    botId = host.state.players.find((player) => player.isBot)!.id;
    manager.setReady(host.state.roomCode, host.playerId, true);

    await botStepped;
    const botTurnStage = host.state.currentPlayerId === botId ? host.state.turnDeadline : null;
    expect(botTurnStage).toBeNull();
    expect(host.state.pieces.some((piece) => piece.playerId === botId && piece.position === 1)).toBe(true);
  });

  test('removes a bot silently, without a leave notification', () => {
    const leftEvents: PlayerLeftEvent[] = [];
    const manager = new RoomManager(() => undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, (_roomCode, event) =>
      leftEvents.push(event),
    );
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);
    const bot = host.state.players.find((player) => player.isBot)!;

    const updated = manager.kickPlayer(host.state.roomCode, host.playerId, bot.id);
    expect(updated.players.map((player) => player.id)).toEqual([host.playerId]);
    expect(updated.pieces.every((piece) => piece.playerId === host.playerId)).toBe(true);
    expect(leftEvents).toEqual([]);
  });

  test('deletes the room as soon as the last human leaves', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);

    expect(manager.leaveRoom(host.state.roomCode, host.playerId)).toBeNull();
    expect(manager.getRoomState(host.state.roomCode)).toBeNull();
    expect(() => manager.joinRoom(host.state.roomCode, 'Linus')).toThrow('not found');
  });

  test('hands the host role to a human, never a bot', () => {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    const updated = manager.leaveRoom(host.state.roomCode, host.playerId);
    expect(updated?.hostPlayerId).toBe(guest.playerId);
  });

  test('carries bots into the rematch room once every human has voted', () => {
    const transitions: RematchTransition[] = [];
    const manager = new RoomManager(() => undefined, 60_000, () => 6, 900, 1_800, null, 30_000, (transition) => transitions.push(transition));
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);
    manager.setReady(host.state.roomCode, host.playerId, true);

    const pieces = host.state.pieces.filter((piece) => piece.playerId === host.playerId);
    pieces[0]!.position = 40;
    pieces[1]!.position = 41;
    pieces[2]!.position = 42;
    pieces[3]!.position = 37;
    const rolled = manager.roll(host.state.roomCode, host.playerId);
    manager.move(host.state.roomCode, host.playerId, rolled.movablePieceIds[0]!);
    expect(host.state.phase).toBe('finished');

    expect(manager.voteRematch(host.state.roomCode, host.playerId)).toBeNull();
    const newState = transitions[0]?.newState;
    expect(newState?.phase).toBe('lobby');
    expect(newState?.players.map((player) => player.isBot)).toEqual([false, true]);
    expect(newState?.players.find((player) => player.isBot)?.ready).toBe(true);
    expect(newState?.hostPlayerId).toBe(host.playerId);
  });
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function startThreePlayerGame() {
  const manager = new RoomManager(() => undefined, 60_000, () => 1, 900, 1_800, null);
  const host = manager.createRoom('Ada');
  const second = manager.joinRoom(host.state.roomCode, 'Linus');
  const third = manager.joinRoom(host.state.roomCode, 'Mika');
  for (const player of [host, second, third]) manager.setReady(host.state.roomCode, player.playerId, true);
  return { manager, host, second, third, state: host.state };
}

describe('RoomManager in-game moderation', () => {
  test('lets the host remove a player mid-game and hands their turn to the next in line', () => {
    const { manager, host, second, third, state } = startThreePlayerGame();
    state.currentPlayerId = second.playerId;

    const updated = manager.kickPlayer(state.roomCode, host.playerId, second.playerId);
    expect(updated.phase).toBe('playing');
    expect(updated.players.map((player) => player.id)).toEqual([host.playerId, third.playerId]);
    expect(updated.pieces.some((piece) => piece.playerId === second.playerId)).toBe(false);
    expect(updated.currentPlayerId).toBe(third.playerId);
    expect(updated.turnStage).toBe('rolling');
  });

  test('skips a disconnected player when handing over the turn', () => {
    const { manager, host, second, third, state } = startThreePlayerGame();
    state.currentPlayerId = second.playerId;
    manager.disconnectPlayer(state.roomCode, third.playerId);

    const updated = manager.kickPlayer(state.roomCode, host.playerId, second.playerId);
    expect(updated.currentPlayerId).toBe(host.playerId);
  });

  test('leaves the turn alone when someone else is removed', () => {
    const { manager, host, second, third, state } = startThreePlayerGame();
    state.currentPlayerId = host.playerId;

    const updated = manager.kickPlayer(state.roomCode, host.playerId, third.playerId);
    expect(updated.currentPlayerId).toBe(host.playerId);
    expect(updated.players.map((player) => player.id)).toEqual([host.playerId, second.playerId]);
  });

  test('only lets the host do it, and not once the game is over', () => {
    const { manager, host, second, third, state } = startThreePlayerGame();
    expect(() => manager.kickPlayer(state.roomCode, second.playerId, third.playerId)).toThrow('Only the host');

    state.phase = 'finished';
    expect(() => manager.kickPlayer(state.roomCode, host.playerId, third.playerId)).toThrow('once the game is over');
  });

  test('awards the win to the last player standing, whether removed or leaving', () => {
    const removed = startGame();
    const afterKick = removed.manager.kickPlayer(removed.first.state.roomCode, removed.first.playerId, removed.second.playerId);
    expect(afterKick.phase).toBe('finished');
    expect(afterKick.winnerId).toBe(removed.first.playerId);
    expect(afterKick.movablePieceIds).toEqual([]);

    const left = startGame();
    const afterLeave = left.manager.leaveRoom(left.first.state.roomCode, left.second.playerId);
    expect(afterLeave?.phase).toBe('finished');
    expect(afterLeave?.winnerId).toBe(left.first.playerId);
  });

  test('keeps a running rematch countdown when the last player to move leaves', async () => {
    let resolveTransition: ((transition: RematchTransition) => void) | undefined;
    const transitionPromise = new Promise<RematchTransition>((resolve) => {
      resolveTransition = resolve;
    });
    const manager = new RoomManager(() => undefined, 60_000, () => 1, 900, 1_800, null, 20, (transition) => resolveTransition?.(transition));
    const host = manager.createRoom('Ada');
    const second = manager.joinRoom(host.state.roomCode, 'Linus');
    const third = manager.joinRoom(host.state.roomCode, 'Mika');
    host.state.phase = 'finished';
    host.state.winnerId = host.playerId;
    host.state.currentPlayerId = host.playerId;

    manager.voteRematch(host.state.roomCode, second.playerId);
    manager.leaveRoom(host.state.roomCode, host.playerId);

    const transition = await transitionPromise;
    expect(transition.movedPlayerIds).toEqual([second.playerId]);
    expect(third.playerId).not.toBe(second.playerId);
  });
});

describe('RoomManager host handover', () => {
  function hostRoom(onChange: (roomCode: string) => void = () => undefined) {
    const manager = new RoomManager(onChange, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 15);
    const host = manager.createRoom('Ada');
    const second = manager.joinRoom(host.state.roomCode, 'Linus');
    const third = manager.joinRoom(host.state.roomCode, 'Mika');
    return { manager, host, second, third, state: host.state };
  }

  test('passes the host role to a connected human after the host has been gone a while', async () => {
    const changes: string[] = [];
    const { manager, host, second, third, state } = hostRoom((roomCode) => changes.push(roomCode));
    manager.disconnectPlayer(state.roomCode, second.playerId);
    manager.disconnectPlayer(state.roomCode, host.playerId);
    expect(state.hostPlayerId).toBe(host.playerId);

    await sleep(60);
    expect(state.hostPlayerId).toBe(third.playerId);
    expect(changes).toEqual([state.roomCode]);
  });

  test('keeps the host if they come back in time', async () => {
    const { manager, host, state } = hostRoom();
    manager.disconnectPlayer(state.roomCode, host.playerId);
    manager.joinRoom(state.roomCode, 'Ada', host.playerId);

    await sleep(60);
    expect(state.hostPlayerId).toBe(host.playerId);
  });

  test('never hands the role to a bot or to nobody', async () => {
    const manager = new RoomManager(() => undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 15);
    const host = manager.createRoom('Ada');
    manager.addBot(host.state.roomCode, host.playerId);
    manager.disconnectPlayer(host.state.roomCode, host.playerId);

    await sleep(60);
    expect(host.state.hostPlayerId).toBe(host.playerId);
  });

  test('picks a connected human when the host is removed', () => {
    const { manager, host, second, third, state } = hostRoom();
    manager.disconnectPlayer(state.roomCode, second.playerId);

    const updated = manager.leaveRoom(state.roomCode, host.playerId);
    expect(updated?.hostPlayerId).toBe(third.playerId);
  });
});

describe('RoomManager closed tabs and empty rooms', () => {
  const publicSettings = { moveTimeSeconds: 30 as const, automaticSingleMove: true, fairDice: true, isPublic: true, mustSpawnOnSix: false };

  /** Short lobby grace period, everything else default; `onLeft` sees who was dropped and why. */
  function lobbyManager(lobbyGraceMs: number, onLeft: (event: PlayerLeftEvent) => void = () => undefined) {
    return new RoomManager(() => undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, (_roomCode, event) => onLeft(event), undefined, 60_000, lobbyGraceMs);
  }

  test('drops a player who closed their tab from the lobby once the grace period ends', async () => {
    const left: PlayerLeftEvent[] = [];
    const manager = lobbyManager(20, (event) => left.push(event));
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    manager.disconnectPlayer(host.state.roomCode, guest.playerId);
    expect(host.state.players.map((player) => player.id)).toEqual([host.playerId, guest.playerId]);

    await sleep(80);
    expect(host.state.players.map((player) => player.id)).toEqual([host.playerId]);
    expect(left).toEqual([{ playerId: guest.playerId, playerName: 'Linus', reason: 'disconnected' }]);
  });

  test('lets a reloading player keep their seat in the lobby', async () => {
    const manager = lobbyManager(40);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    manager.disconnectPlayer(host.state.roomCode, guest.playerId);
    manager.joinRoom(host.state.roomCode, 'Linus', guest.playerId);

    await sleep(100);
    expect(host.state.players.map((player) => player.id)).toEqual([host.playerId, guest.playerId]);
    expect(host.state.players.every((player) => player.connected)).toBe(true);
  });

  test('keeps the seat of a player who dropped out of a running game', async () => {
    const manager = lobbyManager(20);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.setReady(host.state.roomCode, guest.playerId, true);
    expect(host.state.phase).toBe('playing');

    manager.disconnectPlayer(host.state.roomCode, guest.playerId);
    await sleep(80);
    expect(host.state.players.map((player) => player.id)).toContain(guest.playerId);
  });

  test('gives a game that started during the grace period the long grace period', async () => {
    const manager = lobbyManager(40);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    const third = manager.joinRoom(host.state.roomCode, 'Mika');
    manager.disconnectPlayer(host.state.roomCode, third.playerId);
    // Everyone else readies up (and the absent player was already ready) before the lobby grace runs out.
    manager.setReady(host.state.roomCode, third.playerId, true);
    manager.setReady(host.state.roomCode, host.playerId, true);
    manager.setReady(host.state.roomCode, guest.playerId, true);
    expect(host.state.phase).toBe('playing');

    await sleep(120);
    expect(host.state.players.map((player) => player.id)).toContain(third.playerId);
  });

  test('deletes an abandoned room and stops listing it', async () => {
    const manager = lobbyManager(20);
    const host = manager.createRoom('Ada');
    manager.setSettings(host.state.roomCode, host.playerId, publicSettings);
    expect(manager.listPublicRooms()).toHaveLength(1);

    manager.disconnectPlayer(host.state.roomCode, host.playerId);
    // Nobody is connected any more, so it is already hidden while the seat is held for a reload.
    expect(manager.listPublicRooms()).toEqual([]);

    await sleep(80);
    expect(manager.getRoomState(host.state.roomCode)).toBeNull();
    expect(() => manager.joinRoom(host.state.roomCode, 'Linus')).toThrow('not found');
  });

  test('lists a room again if its host reconnects in time', async () => {
    const manager = lobbyManager(60);
    const host = manager.createRoom('Ada');
    manager.setSettings(host.state.roomCode, host.playerId, publicSettings);

    manager.disconnectPlayer(host.state.roomCode, host.playerId);
    manager.joinRoom(host.state.roomCode, 'Ada', host.playerId);
    expect(manager.listPublicRooms().map((room) => room.roomCode)).toEqual([host.state.roomCode]);

    await sleep(120);
    expect(manager.getRoomState(host.state.roomCode)).not.toBeNull();
  });

  test('hands the host role on when an absent host is finally dropped', async () => {
    const manager = lobbyManager(20);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');

    manager.disconnectPlayer(host.state.roomCode, host.playerId);
    await sleep(80);
    expect(host.state.hostPlayerId).toBe(guest.playerId);
  });
});

describe('RoomManager taking over the host role', () => {
  function room() {
    const manager = new RoomManager();
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    return { manager, host, guest, code: host.state.roomCode };
  }

  test('lets a connected player take over once the host has gone', () => {
    const { manager, host, guest, code } = room();
    manager.disconnectPlayer(code, host.playerId);

    const updated = manager.claimHost(code, guest.playerId);
    expect(updated.hostPlayerId).toBe(guest.playerId);
    // And the new host can act like one.
    expect(() => manager.setSettings(code, guest.playerId, { ...updated.settings, moveTimeSeconds: 45 })).not.toThrow();
  });

  test('never takes the role from a host who is still there', () => {
    const { manager, host, guest, code } = room();
    expect(() => manager.claimHost(code, guest.playerId)).toThrow('still here');
    expect(host.state.hostPlayerId).toBe(host.playerId);
  });

  test('leaves things as they are when the host asks for their own role', () => {
    const { manager, host, code } = room();
    expect(manager.claimHost(code, host.playerId).hostPlayerId).toBe(host.playerId);
  });

  test('refuses bots and strangers', () => {
    const { manager, host, code } = room();
    manager.addBot(code, host.playerId);
    const bot = host.state.players.find((player) => player.isBot)!;
    manager.disconnectPlayer(code, host.playerId);

    expect(() => manager.claimHost(code, bot.id)).toThrow('not found');
    expect(() => manager.claimHost(code, 'nobody')).toThrow('not found');
  });

  test('cancels the pending automatic handover', async () => {
    const manager = new RoomManager(() => undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 20);
    const host = manager.createRoom('Ada');
    const guest = manager.joinRoom(host.state.roomCode, 'Linus');
    const third = manager.joinRoom(host.state.roomCode, 'Mika');
    manager.disconnectPlayer(host.state.roomCode, host.playerId);

    manager.claimHost(host.state.roomCode, third.playerId);
    await sleep(80);
    // The timer would have picked Linus; the claim already settled it.
    expect(host.state.hostPlayerId).toBe(third.playerId);
    expect(guest.playerId).not.toBe(third.playerId);
  });
});
