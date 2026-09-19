import type { GameState, MoveTimeSeconds, Piece, Player, PlayerColor, PlayerLeftReason, PublicRoomSummary, RoomErrorCode, RoomSettings } from '@ludo/shared';
import { TRACK_LENGTH, chooseBotMove, isStartSquare, toBoardPosition } from '@ludo/shared';

import { FairDice } from './fair-dice';

export class RoomError extends Error {
  constructor(
    public readonly code: RoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoomError';
  }
}

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
const MOVE_TIMES: MoveTimeSeconds[] = [15, 30, 45, 60];
const BOT_NAMES = ['Robo', 'Beep', 'Chip', 'Pixel'];
/** How long a player who dropped out of a running game keeps their seat. */
const GAME_GRACE_MS = 5 * 60 * 1000;
const DEFAULT_SETTINGS: RoomSettings = {
  moveTimeSeconds: 30,
  automaticSingleMove: true,
  fairDice: true,
  isPublic: false,
  mustSpawnOnSix: false,
  extraTurnOnCapture: false,
  safeStartSquares: false,
};

interface Room {
  state: GameState;
  turnTimer?: ReturnType<typeof setTimeout>;
}

type StateListener = (roomCode: string, state: GameState) => void;

export interface RematchTransition {
  oldRoomCode: string;
  newRoomCode: string | null;
  movedPlayerIds: string[];
  newState: GameState | null;
}

type RematchListener = (transition: RematchTransition) => void;

export interface PlayerLeftEvent {
  playerId: string;
  playerName: string;
  reason: PlayerLeftReason;
}

type PlayerLeftListener = (roomCode: string, event: PlayerLeftEvent) => void;

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly playerCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly hostTransferTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly fairDice = new FairDice();

  constructor(
    private readonly onStateChange: StateListener = () => undefined,
    private readonly turnDurationMs?: number,
    private readonly rollDice?: () => number,
    private readonly rollAnimationMs = 900,
    private readonly noMoveDelayMs = 1_800,
    private readonly autoMoveDelayMs: number | null = 1_300,
    private readonly rematchDurationMs = 30_000,
    private readonly onRematchResolved: RematchListener = () => undefined,
    private readonly onPlayerLeft: PlayerLeftListener = () => undefined,
    private readonly botMoveDelayMs = 1_100,
    private readonly hostAbsenceMs = 30_000,
    private readonly lobbyGraceMs = 15_000,
  ) {}

  getRoomState(roomCode: string): GameState | null {
    return this.rooms.get(roomCode)?.state ?? null;
  }

  listPublicRooms(): PublicRoomSummary[] {
    const summaries: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.state.settings.isPublic) continue;
      // Someone has to be there: a room whose players have all dropped off is about to disappear.
      if (!room.state.players.some((player) => !player.isBot && player.connected)) continue;
      const host = room.state.players.find((player) => player.id === room.state.hostPlayerId);
      summaries.push({
        roomCode: room.state.roomCode,
        hostName: host?.name ?? 'Guest',
        playerCount: room.state.players.length,
        maxPlayers: COLORS.length,
        phase: room.state.phase,
        settings: room.state.settings,
      });
    }
    return summaries;
  }

  createRoom(playerName: string): { playerId: string; state: GameState } {
    let roomCode = this.generateRoomCode();
    while (this.rooms.has(roomCode)) roomCode = this.generateRoomCode();

    const state: GameState = {
      roomCode,
      hostPlayerId: null,
      settings: { ...DEFAULT_SETTINGS },
      phase: 'lobby',
      turnStage: 'rolling',
      turnDeadline: null,
      players: [],
      pieces: [],
      currentPlayerId: null,
      diceResult: null,
      movablePieceIds: [],
      winnerId: null,
      rematchDeadline: null,
      rematchPlayerIds: [],
      revision: 0,
    };
    this.rooms.set(roomCode, { state });
    const joined = this.addPlayer(state, playerName);
    state.hostPlayerId = joined.playerId;
    return joined;
  }

  joinRoom(roomCode: string, playerName: string, reconnectPlayerId?: string): { playerId: string; state: GameState } {
    const normalizedCode = roomCode.toUpperCase();
    const room = this.rooms.get(normalizedCode);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room was not found');
    const reconnectingPlayer = room.state.players.find((player) => player.id === reconnectPlayerId);
    if (reconnectingPlayer) {
      reconnectingPlayer.connected = true;
      const playerCleanupKey = `${normalizedCode}:${reconnectingPlayer.id}`;
      const playerCleanupTimer = this.playerCleanupTimers.get(playerCleanupKey);
      if (playerCleanupTimer) clearTimeout(playerCleanupTimer);
      this.playerCleanupTimers.delete(playerCleanupKey);
      if (room.state.hostPlayerId === reconnectingPlayer.id) this.clearHostTransfer(normalizedCode);
      room.state.revision += 1;
      return { playerId: reconnectingPlayer.id, state: room.state };
    }
    if (room.state.phase !== 'lobby') throw new RoomError('GAME_ALREADY_RUNNING', 'The game is already running.');
    if (room.state.players.length >= COLORS.length) throw new RoomError('ROOM_FULL', 'The room is full.');
    return this.addPlayer(room.state, playerName);
  }

  setReady(roomCode: string, playerId: string, ready: boolean): GameState {
    const state = this.getState(roomCode);
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new RoomError('PLAYER_NOT_FOUND', 'Player was not found.');
    player.ready = ready;

    if (state.players.length >= 2 && state.players.every((candidate) => candidate.ready)) {
      state.phase = 'playing';
      state.currentPlayerId = state.players[0]?.id ?? null;
      this.beginTurn(state);
    }
    state.revision += 1;
    return state;
  }

  setSettings(roomCode: string, playerId: string, settings: RoomSettings): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'lobby') throw new RoomError('SETTINGS_ONLY_LOBBY', 'Settings can only be changed in the lobby.');
    if (state.hostPlayerId !== playerId) throw new RoomError('HOST_ONLY_SETTINGS', 'Only the host can change the room settings.');
    if (!MOVE_TIMES.includes(settings.moveTimeSeconds)) throw new RoomError('INVALID_MOVE_TIME', 'Invalid move time.');
    if (
      typeof settings.automaticSingleMove !== 'boolean' ||
      typeof settings.fairDice !== 'boolean' ||
      typeof settings.isPublic !== 'boolean' ||
      typeof settings.mustSpawnOnSix !== 'boolean' ||
      typeof settings.extraTurnOnCapture !== 'boolean' ||
      typeof settings.safeStartSquares !== 'boolean'
    )
      throw new RoomError('INVALID_SETTINGS', 'Invalid room settings.');

    state.settings = { ...settings };
    for (const player of state.players) player.ready = player.isBot;
    state.revision += 1;
    return state;
  }

  updatePlayer(roomCode: string, playerId: string, name: string, color: PlayerColor): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'lobby') throw new RoomError('PROFILE_ONLY_LOBBY', 'Profile can only be updated in the lobby.');
    if (!COLORS.includes(color)) throw new RoomError('INVALID_COLOR', 'Invalid player color.');
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new RoomError('PLAYER_NOT_FOUND', 'Player was not found.');
    if (state.players.some((candidate) => candidate.id !== playerId && candidate.color === color))
      throw new RoomError('COLOR_TAKEN', 'This color is already taken.');

    player.color = color;
    player.name = this.getPlayerName(name);
    player.ready = false;
    state.revision += 1;
    return state;
  }

  /**
   * Adds a computer opponent to the lobby. Like any other lobby change it resets the humans' ready
   * status (bots are always ready), so nobody is dropped into a game they didn't expect.
   */
  addBot(roomCode: string, hostPlayerId: string): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'lobby') throw new RoomError('BOTS_ONLY_LOBBY', 'Bots can only be added in the lobby.');
    if (state.hostPlayerId !== hostPlayerId) throw new RoomError('HOST_ONLY_BOTS', 'Only the host can add bots.');
    if (state.players.length >= COLORS.length) throw new RoomError('ROOM_FULL', 'The room is full.');

    const name = BOT_NAMES.find((candidate) => !state.players.some((player) => player.name === candidate)) ?? 'Bot';
    this.addPlayer(state, name, true);
    for (const player of state.players) player.ready = player.isBot;
    return state;
  }

  kickPlayer(roomCode: string, hostPlayerId: string, targetPlayerId: string): GameState {
    const state = this.getState(roomCode);
    if (state.phase === 'finished') throw new RoomError('KICK_NOT_AVAILABLE', 'Players cannot be removed once the game is over.');
    if (state.hostPlayerId !== hostPlayerId) throw new RoomError('HOST_ONLY_KICK', 'Only the host can kick players.');
    if (targetPlayerId === hostPlayerId) throw new RoomError('HOST_CANNOT_KICK_SELF', 'The host cannot kick themselves.');
    if (!state.players.some((player) => player.id === targetPlayerId)) throw new RoomError('PLAYER_NOT_FOUND', 'Player was not found.');
    return this.removePlayer(roomCode, targetPlayerId, 'kicked') ?? state;
  }

  leaveRoom(roomCode: string, playerId: string): GameState | null {
    return this.removePlayer(roomCode, playerId, 'left');
  }

  /**
   * Returns the updated (still-live) state, or `null` once every player has voted and the room
   * has already been torn down and replaced by a fresh one (see `resolveRematch`).
   */
  voteRematch(roomCode: string, playerId: string): GameState | null {
    const state = this.getState(roomCode);
    if (state.phase !== 'finished') throw new RoomError('REMATCH_NOT_AVAILABLE', 'The rematch vote is not available yet.');
    if (!state.players.some((player) => player.id === playerId)) throw new RoomError('PLAYER_NOT_FOUND', 'Player was not found.');
    if (!state.rematchPlayerIds.includes(playerId)) state.rematchPlayerIds.push(playerId);

    if (state.rematchDeadline === null) {
      state.rematchDeadline = Date.now() + this.rematchDurationMs;
      this.scheduleRematchResolution(state);
    }
    // Bots never vote - they simply follow whichever humans agree to play again.
    if (state.rematchPlayerIds.length === state.players.filter((player) => !player.isBot).length) {
      this.resolveRematch(state);
      return null;
    }
    state.revision += 1;
    return state;
  }

  roll(roomCode: string, playerId: string): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'playing') throw new RoomError('GAME_NOT_STARTED', 'The game has not started yet.');
    if (state.currentPlayerId !== playerId) throw new RoomError('NOT_YOUR_TURN', 'It is not your turn.');
    if (state.turnStage !== 'rolling') throw new RoomError('ALREADY_ROLLED', 'The dice has already been rolled.');

    this.clearTurnTimer(roomCode);
    state.diceResult = this.rollDice?.() ?? (state.settings.fairDice ? this.fairDice.roll(playerId) : randomDice());
    state.movablePieceIds = this.getMovablePieces(state, playerId, state.diceResult).map((piece) => piece.id);
    if (state.movablePieceIds.length === 1 && state.settings.automaticSingleMove && this.autoMoveDelayMs !== null) {
      state.turnStage = 'auto-move';
      state.turnDeadline = null;
      this.scheduleAutoMove(state, playerId, state.movablePieceIds[0]!);
    } else if (state.movablePieceIds.length > 0) {
      state.turnStage = 'move';
      if (state.players.find((player) => player.id === playerId)?.isBot) {
        // A bot decides on its own, so there's no move timer to run down.
        state.turnDeadline = null;
        this.scheduleBotMove(state, playerId);
      } else {
        this.scheduleMoveDeadline(state);
      }
    } else {
      state.turnStage = 'no-move';
      state.turnDeadline = null;
      this.scheduleNoMoveTransition(state);
    }
    state.revision += 1;
    return state;
  }

  move(roomCode: string, playerId: string, pieceId: string): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'playing' || state.currentPlayerId !== playerId) throw new RoomError('NOT_YOUR_TURN', 'It is not your turn.');
    if (state.turnStage !== 'move' || state.diceResult === null) throw new RoomError('ROLL_FIRST', 'You must roll the dice first.');
    return this.performMove(state, playerId, pieceId);
  }

  private performMove(state: GameState, playerId: string, pieceId: string): GameState {
    if (state.diceResult === null) throw new RoomError('MISSING_DICE_RESULT', 'The dice result is missing.');
    if (!state.movablePieceIds.includes(pieceId)) throw new RoomError('PIECE_NOT_MOVABLE', 'This piece cannot be moved.');

    const piece = state.pieces.find((candidate) => candidate.id === pieceId && candidate.playerId === playerId);
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!piece || !player) throw new RoomError('PIECE_NOT_FOUND', 'The piece was not found.');

    piece.position = piece.position === -1 ? 0 : piece.position + state.diceResult;
    const capturedPieces = this.getOpponentPiecesAt(state, player, piece.position);
    for (const capturedPiece of capturedPieces) capturedPiece.position = -1;
    const captured = capturedPieces.length > 0;

    if (state.pieces.filter((candidate) => candidate.playerId === playerId).every((candidate) => candidate.position >= 40)) {
      this.finishGame(state, playerId);
    } else {
      // A six and a capture each earn one extra roll; they don't stack when a six also captures.
      this.advanceTurn(state, state.diceResult === 6 || (captured && state.settings.extraTurnOnCapture));
    }
    state.revision += 1;
    return state;
  }

  private finishGame(state: GameState, winnerId: string) {
    state.phase = 'finished';
    state.winnerId = winnerId;
    state.turnDeadline = null;
    state.movablePieceIds = [];
    state.rematchDeadline = null;
    state.rematchPlayerIds = [];
    this.clearTurnTimer(state.roomCode);
  }

  disconnectPlayer(roomCode: string, playerId: string): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (!player) return room.state;

    player.connected = false;
    room.state.revision += 1;
    if (room.state.hostPlayerId === playerId) this.scheduleHostTransfer(roomCode);
    // In the lobby there is nothing to lose, so a closed tab goes quickly (a page reload still has time
    // to reconnect). A running game keeps the seat much longer, so a dropped connection doesn't cost it.
    this.scheduleDisconnectRemoval(roomCode, playerId, room.state.phase === 'lobby' ? this.lobbyGraceMs : GAME_GRACE_MS, Date.now());
    return room.state;
  }

  private scheduleDisconnectRemoval(roomCode: string, playerId: string, delayMs: number, disconnectedAt: number) {
    const key = `${roomCode}:${playerId}`;
    const existing = this.playerCleanupTimers.get(key);
    if (existing) clearTimeout(existing);
    this.playerCleanupTimers.set(
      key,
      setTimeout(() => {
        this.playerCleanupTimers.delete(key);
        const state = this.rooms.get(roomCode)?.state;
        if (!state) return;
        // A game may have started while they were away, and games get the longer grace period.
        const remaining = disconnectedAt + GAME_GRACE_MS - Date.now();
        if (state.phase !== 'lobby' && remaining > 0) {
          this.scheduleDisconnectRemoval(roomCode, playerId, remaining, disconnectedAt);
          return;
        }
        const next = this.removePlayer(roomCode, playerId, 'disconnected');
        if (next) this.onStateChange(roomCode, next);
      }, delayMs),
    );
  }

  /** Stops every timer of a room and forgets it. */
  private disposeRoom(roomCode: string) {
    this.clearTurnTimer(roomCode);
    this.clearHostTransfer(roomCode);
    for (const [key, timer] of this.playerCleanupTimers) {
      if (key.startsWith(`${roomCode}:`)) {
        clearTimeout(timer);
        this.playerCleanupTimers.delete(key);
      }
    }
    this.rooms.delete(roomCode);
  }

  /**
   * Lets a connected human take over a room whose host is no longer there, instead of waiting for the
   * automatic handover. It never takes the role from a host who is still connected.
   */
  claimHost(roomCode: string, playerId: string): GameState {
    const state = this.getState(roomCode);
    const claimant = state.players.find((candidate) => candidate.id === playerId);
    if (!claimant || claimant.isBot) throw new RoomError('PLAYER_NOT_FOUND', 'Player was not found.');
    if (state.hostPlayerId === playerId) return state;
    const host = state.players.find((candidate) => candidate.id === state.hostPlayerId);
    if (host?.connected) throw new RoomError('HOST_STILL_HERE', 'The host is still here.');
    this.clearHostTransfer(roomCode);
    state.hostPlayerId = playerId;
    state.revision += 1;
    return state;
  }

  private removePlayer(roomCode: string, playerId: string, reason: PlayerLeftReason): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (!player) return room.state;

    const removedIndex = room.state.players.findIndex((candidate) => candidate.id === playerId);
    room.state.players = room.state.players.filter((candidate) => candidate.id !== playerId);
    room.state.pieces = room.state.pieces.filter((piece) => piece.playerId !== playerId);
    room.state.rematchPlayerIds = room.state.rematchPlayerIds.filter((candidate) => candidate !== playerId);
    this.fairDice.removePlayer(playerId);
    if (!player.isBot) this.onPlayerLeft(roomCode, { playerId, playerName: player.name, reason });
    // A room with only bots left has nobody to play for. Nobody can rejoin it either (a player who left
    // is gone, and the last human was the one holding the room up), so it is deleted straight away
    // instead of lingering, and with it the public listing.
    if (room.state.players.every((candidate) => candidate.isBot)) {
      for (const bot of room.state.players) this.fairDice.removePlayer(bot.id);
      room.state.players = [];
      room.state.pieces = [];
      room.state.hostPlayerId = null;
      this.disposeRoom(roomCode);
      return null;
    }
    if (room.state.hostPlayerId === playerId) {
      this.clearHostTransfer(roomCode);
      const humans = room.state.players.filter((candidate) => !candidate.isBot);
      room.state.hostPlayerId = (humans.find((candidate) => candidate.connected) ?? humans[0])?.id ?? null;
    }
    // Only a running game needs its turn order repaired; in the lobby there is no turn, and in the
    // finished phase `beginTurn` would cancel the pending rematch countdown.
    if (room.state.phase === 'playing') {
      if (room.state.players.length < 2) {
        // Nobody left to play against: the last player standing wins by forfeit.
        this.finishGame(room.state, room.state.players[0]!.id);
      } else if (room.state.currentPlayerId === playerId) {
        // Hand the turn to whoever was next in line, preferring someone who is actually connected.
        const following = [...room.state.players.slice(removedIndex), ...room.state.players.slice(0, removedIndex)];
        room.state.currentPlayerId = (following.find((candidate) => candidate.connected) ?? following[0])?.id ?? null;
        this.beginTurn(room.state);
      }
    }
    room.state.revision += 1;
    return room.state;
  }

  /**
   * If the host stays away for `hostAbsenceMs`, the host role moves to another connected human so
   * the room isn't stuck without anyone who can moderate it. It never scraps the game, and if no
   * one else is connected the role simply stays where it is.
   */
  private scheduleHostTransfer(roomCode: string) {
    this.clearHostTransfer(roomCode);
    this.hostTransferTimers.set(
      roomCode,
      setTimeout(() => {
        this.hostTransferTimers.delete(roomCode);
        const state = this.rooms.get(roomCode)?.state;
        const host = state?.players.find((candidate) => candidate.id === state.hostPlayerId);
        if (!state || !host || host.connected) return;
        const successor = state.players.find((candidate) => !candidate.isBot && candidate.connected && candidate.id !== host.id);
        if (!successor) return;
        state.hostPlayerId = successor.id;
        state.revision += 1;
        this.onStateChange(roomCode, state);
      }, this.hostAbsenceMs),
    );
  }

  private clearHostTransfer(roomCode: string) {
    const timer = this.hostTransferTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.hostTransferTimers.delete(roomCode);
  }

  private addPlayer(state: GameState, rawName: string, isBot = false): { playerId: string; state: GameState } {
    const playerId = crypto.randomUUID();
    const color = COLORS.find((candidate) => !state.players.some((player) => player.color === candidate)) ?? 'red';
    const player: Player = {
      id: playerId,
      name: this.getPlayerName(rawName),
      color,
      connected: true,
      ready: isBot,
      isBot,
    };
    state.players.push(player);
    if (state.hostPlayerId === null) state.hostPlayerId = playerId;
    state.pieces.push(...Array.from({ length: 4 }, (_, index) => ({ id: `${playerId}-${index}`, playerId, position: -1 })));
    state.revision += 1;
    return { playerId, state };
  }

  private getPlayerName(rawName: string): string {
    const requestedName = rawName.trim().slice(0, 24);
    return requestedName || 'Guest';
  }

  private getState(roomCode: string): GameState {
    const room = this.rooms.get(roomCode);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 'The room was not found.');
    return room.state;
  }

  /** The opponent pieces on the shared track that a piece of `player` landing on `relativePosition` (relative to its own start) would share a square with. */
  private getOpponentPiecesAt(state: GameState, player: Player, relativePosition: number): Piece[] {
    if (relativePosition < 0 || relativePosition >= TRACK_LENGTH) return [];
    const target = toBoardPosition(player.color, relativePosition);
    return state.pieces.filter((candidate) => {
      if (candidate.playerId === player.id || candidate.position < 0 || candidate.position >= TRACK_LENGTH) return false;
      const owner = state.players.find((other) => other.id === candidate.playerId);
      return owner !== undefined && toBoardPosition(owner.color, candidate.position) === target;
    });
  }

  /**
   * With safe start squares, an opponent standing on a start square can't be captured, and the square
   * can't be shared either, so nobody else can land or spawn there until it leaves.
   */
  private isBlockedBySafeSquare(state: GameState, player: Player, relativePosition: number): boolean {
    if (!state.settings.safeStartSquares || relativePosition < 0 || relativePosition >= TRACK_LENGTH) return false;
    if (!isStartSquare(toBoardPosition(player.color, relativePosition))) return false;
    return this.getOpponentPiecesAt(state, player, relativePosition).length > 0;
  }

  private getMovablePieces(state: GameState, playerId: string, diceResult: number) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) return [];
    const ownPieces = state.pieces.filter((piece) => piece.playerId === playerId);

    const movable = ownPieces.filter((piece) => {
      const targetPosition = piece.position === -1 ? (diceResult === 6 ? 0 : -1) : piece.position + diceResult;
      if (targetPosition < 0 || targetPosition > 43) return false;
      if (this.isBlockedBySafeSquare(state, player, targetPosition)) return false;
      return !ownPieces.some((other) => other.id !== piece.id && other.position === targetPosition);
    });

    if (diceResult === 6) {
      const homeMovable = movable.filter((piece) => piece.position === -1);
      // With "must spawn on six" enabled, a free spawn slot takes priority over moving a piece
      // already on the board - the player isn't offered a choice between the two.
      const forceSpawn = state.settings.mustSpawnOnSix && homeMovable.length > 0;
      const candidates = forceSpawn ? homeMovable : movable;
      if (candidates.length > 1 && candidates.every((piece) => piece.position === -1)) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return [candidates[randomIndex]!];
      }
      return candidates;
    }

    return movable;
  }

  private beginTurn(state: GameState) {
    this.clearTurnTimer(state.roomCode);
    state.turnStage = 'rolling';
    state.diceResult = null;
    state.movablePieceIds = [];
    state.turnDeadline = null;
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing' || state.turnStage !== 'rolling' || !state.currentPlayerId) return;
      this.roll(state.roomCode, state.currentPlayerId);
      this.onStateChange(state.roomCode, state);
    }, this.rollAnimationMs);
  }

  private advanceTurn(state: GameState, extraTurn: boolean) {
    if (!extraTurn) {
      const connectedPlayers = state.players.filter((player) => player.connected);
      const currentIndex = connectedPlayers.findIndex((player) => player.id === state.currentPlayerId);
      state.currentPlayerId = connectedPlayers[(currentIndex + 1) % connectedPlayers.length]?.id ?? null;
    }
    this.beginTurn(state);
  }

  private scheduleMoveDeadline(state: GameState) {
    this.clearTurnTimer(state.roomCode);
    const turnDurationMs = this.turnDurationMs ?? state.settings.moveTimeSeconds * 1_000;
    state.turnDeadline = Date.now() + turnDurationMs;
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing') return;
      this.advanceTurn(state, false);
      state.revision += 1;
      this.onStateChange(state.roomCode, state);
    }, turnDurationMs);
  }

  private scheduleAutoMove(state: GameState, playerId: string, pieceId: string) {
    const room = this.rooms.get(state.roomCode);
    if (!room || this.autoMoveDelayMs === null) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing' || state.turnStage !== 'auto-move' || state.currentPlayerId !== playerId) return;
      this.performMove(state, playerId, pieceId);
      this.onStateChange(state.roomCode, state);
    }, this.autoMoveDelayMs);
  }

  private scheduleBotMove(state: GameState, playerId: string) {
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing' || state.turnStage !== 'move' || state.currentPlayerId !== playerId) return;
      const pieceId = chooseBotMove(state, playerId);
      if (!pieceId) return;
      this.performMove(state, playerId, pieceId);
      this.onStateChange(state.roomCode, state);
    }, this.botMoveDelayMs);
  }

  private scheduleNoMoveTransition(state: GameState) {
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing' || state.turnStage !== 'no-move') return;
      this.advanceTurn(state, false);
      state.revision += 1;
      this.onStateChange(state.roomCode, state);
    }, this.noMoveDelayMs);
  }

  private scheduleRematchResolution(state: GameState) {
    this.clearTurnTimer(state.roomCode);
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'finished' || state.rematchDeadline === null) return;
      this.resolveRematch(state);
    }, this.rematchDurationMs);
  }

  /**
   * Ends the post-game vote: players who confirmed the rematch are moved into a brand-new room
   * (reset to the lobby), while everyone else is dropped for inactivity. The old room is torn
   * down entirely rather than reused, so a stale reference to it never resurfaces.
   */
  private resolveRematch(state: GameState) {
    const oldRoomCode = state.roomCode;
    this.clearTurnTimer(oldRoomCode);

    // Bots follow the humans: they move to the new room only if at least one human agreed to play again.
    const anyHumanAccepted = state.players.some((player) => !player.isBot && state.rematchPlayerIds.includes(player.id));
    const accepted = state.players.filter((player) => (player.isBot ? anyHumanAccepted : state.rematchPlayerIds.includes(player.id)));
    const declined = state.players.filter((player) => !accepted.includes(player));
    for (const player of declined) this.fairDice.removePlayer(player.id);

    this.disposeRoom(oldRoomCode);

    if (accepted.length === 0) {
      this.onRematchResolved({ oldRoomCode, newRoomCode: null, movedPlayerIds: [], newState: null });
      return;
    }

    let newRoomCode = this.generateRoomCode();
    while (this.rooms.has(newRoomCode)) newRoomCode = this.generateRoomCode();

    for (const player of accepted) player.ready = player.isBot;
    const newState: GameState = {
      roomCode: newRoomCode,
      hostPlayerId: accepted.some((player) => player.id === state.hostPlayerId) ? state.hostPlayerId : (accepted.find((player) => !player.isBot)?.id ?? null),
      settings: { ...state.settings },
      phase: 'lobby',
      turnStage: 'rolling',
      turnDeadline: null,
      players: accepted,
      pieces: accepted.flatMap((player) => Array.from({ length: 4 }, (_, index) => ({ id: `${player.id}-${index}`, playerId: player.id, position: -1 }))),
      currentPlayerId: null,
      diceResult: null,
      movablePieceIds: [],
      winnerId: null,
      rematchDeadline: null,
      rematchPlayerIds: [],
      revision: 0,
    };
    this.rooms.set(newRoomCode, { state: newState });

    this.onRematchResolved({ oldRoomCode, newRoomCode, movedPlayerIds: accepted.map((player) => player.id), newState });
  }

  private clearTurnTimer(roomCode: string) {
    const timer = this.rooms.get(roomCode)?.turnTimer;
    if (timer) clearTimeout(timer);
  }

  private generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }
}

function randomDice(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0]! % 6) + 1;
}
