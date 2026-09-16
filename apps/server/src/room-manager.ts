import type { GameState, Player, PlayerColor } from '@ludo/shared';
import { FairDice } from './fair-dice';

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_NAMES: Record<PlayerColor, string> = { red: 'Rot', blue: 'Blau', green: 'Grün', yellow: 'Gelb' };

interface Room {
  state: GameState;
  turnTimer?: ReturnType<typeof setTimeout>;
}

type StateListener = (roomCode: string, state: GameState) => void;

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly playerCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly fairDice = new FairDice();

  constructor(
    private readonly onStateChange: StateListener = () => undefined,
    private readonly turnDurationMs = 30_000,
    private readonly rollDice?: () => number,
    private readonly rollAnimationMs = 900,
    private readonly noMoveDelayMs = 1_800,
  ) {}

  createRoom(playerName: string): { playerId: string; state: GameState } {
    let roomCode = this.generateRoomCode();
    while (this.rooms.has(roomCode)) roomCode = this.generateRoomCode();

    const state: GameState = {
      roomCode,
      phase: 'lobby',
      turnStage: 'rolling',
      turnDeadline: null,
      players: [],
      pieces: [],
      currentPlayerId: null,
      diceResult: null,
      movablePieceIds: [],
      winnerId: null,
      revision: 0,
    };
    this.rooms.set(roomCode, { state });
    return this.addPlayer(state, playerName);
  }

  joinRoom(roomCode: string, playerName: string, reconnectPlayerId?: string): { playerId: string; state: GameState } {
    const normalizedCode = roomCode.toUpperCase();
    const room = this.rooms.get(normalizedCode);
    if (!room) throw new Error('Raum nicht gefunden.');
    const reconnectingPlayer = room.state.players.find((player) => player.id === reconnectPlayerId);
    if (reconnectingPlayer) {
      reconnectingPlayer.connected = true;
      reconnectingPlayer.name = this.getUniqueName(room.state, playerName, reconnectingPlayer.color, reconnectingPlayer.id);
      const playerCleanupKey = `${normalizedCode}:${reconnectingPlayer.id}`;
      const playerCleanupTimer = this.playerCleanupTimers.get(playerCleanupKey);
      if (playerCleanupTimer) clearTimeout(playerCleanupTimer);
      this.playerCleanupTimers.delete(playerCleanupKey);
      room.state.revision += 1;
      return { playerId: reconnectingPlayer.id, state: room.state };
    }
    if (room.state.phase !== 'lobby') throw new Error('Das Spiel läuft bereits.');
    if (room.state.players.length >= COLORS.length) throw new Error('Der Raum ist voll.');
    const cleanupTimer = this.cleanupTimers.get(normalizedCode);
    if (cleanupTimer) clearTimeout(cleanupTimer);
    this.cleanupTimers.delete(normalizedCode);
    return this.addPlayer(room.state, playerName);
  }

  setReady(roomCode: string, playerId: string, ready: boolean): GameState {
    const state = this.getState(roomCode);
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error('Spieler nicht gefunden.');
    player.ready = ready;

    if (state.players.length >= 2 && state.players.every((candidate) => candidate.ready)) {
      state.phase = 'playing';
      state.currentPlayerId = state.players[0]?.id ?? null;
      this.beginTurn(state);
    }
    state.revision += 1;
    return state;
  }

  roll(roomCode: string, playerId: string): GameState {
    const state = this.getState(roomCode);
    if (state.phase !== 'playing') throw new Error('Das Spiel hat noch nicht begonnen.');
    if (state.currentPlayerId !== playerId) throw new Error('Du bist nicht am Zug.');
    if (state.turnStage !== 'rolling') throw new Error('Der Würfel wurde bereits geworfen.');

    this.clearTurnTimer(roomCode);
    state.diceResult = this.rollDice?.() ?? this.fairDice.roll(playerId);
    state.movablePieceIds = this.getMovablePieces(state, playerId, state.diceResult).map((piece) => piece.id);
    if (state.movablePieceIds.length > 0) {
      state.turnStage = 'move';
      this.scheduleMoveDeadline(state);
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
    if (state.phase !== 'playing' || state.currentPlayerId !== playerId) throw new Error('Du bist nicht am Zug.');
    if (state.turnStage !== 'move' || state.diceResult === null) throw new Error('Würfle zuerst.');
    if (!state.movablePieceIds.includes(pieceId)) throw new Error('Diese Figur kann nicht gezogen werden.');

    const piece = state.pieces.find((candidate) => candidate.id === pieceId && candidate.playerId === playerId);
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!piece || !player) throw new Error('Figur nicht gefunden.');

    piece.position = piece.position === -1 ? 0 : piece.position + state.diceResult;
    if (piece.position < 40) {
      const target = this.toBoardPosition(player.color, piece.position);
      for (const opponentPiece of state.pieces) {
        if (opponentPiece.playerId === playerId || opponentPiece.position < 0 || opponentPiece.position >= 40) continue;
        const opponent = state.players.find((candidate) => candidate.id === opponentPiece.playerId);
        if (opponent && this.toBoardPosition(opponent.color, opponentPiece.position) === target) opponentPiece.position = -1;
      }
    }

    if (state.pieces.filter((candidate) => candidate.playerId === playerId).every((candidate) => candidate.position >= 40)) {
      state.phase = 'finished';
      state.winnerId = playerId;
      state.turnDeadline = null;
      this.clearTurnTimer(roomCode);
    } else {
      this.advanceTurn(state, state.diceResult === 6);
    }
    state.revision += 1;
    return state;
  }

  disconnectPlayer(roomCode: string, playerId: string): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (!player) return room.state;

    player.connected = false;
    room.state.revision += 1;
    const playerCleanupKey = `${roomCode}:${playerId}`;
    const existingTimer = this.playerCleanupTimers.get(playerCleanupKey);
    if (existingTimer) clearTimeout(existingTimer);
    this.playerCleanupTimers.set(
      playerCleanupKey,
      setTimeout(
        () => {
          this.playerCleanupTimers.delete(playerCleanupKey);
          const state = this.removePlayer(roomCode, playerId);
          if (state) this.onStateChange(roomCode, state);
        },
        5 * 60 * 1000,
      ),
    );
    return room.state;
  }

  private removePlayer(roomCode: string, playerId: string): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.state.players = room.state.players.filter((player) => player.id !== playerId);
    room.state.pieces = room.state.pieces.filter((piece) => piece.playerId !== playerId);
    this.fairDice.removePlayer(playerId);
    if (room.state.players.length === 0) {
      this.clearTurnTimer(roomCode);
      const cleanupTimer = setTimeout(
        () => {
          this.rooms.delete(roomCode);
          this.cleanupTimers.delete(roomCode);
        },
        5 * 60 * 1000,
      );
      this.cleanupTimers.set(roomCode, cleanupTimer);
      return null;
    }
    if (room.state.currentPlayerId === playerId) {
      room.state.currentPlayerId = room.state.players[0]?.id ?? null;
      this.beginTurn(room.state);
    }
    room.state.revision += 1;
    return room.state;
  }

  private addPlayer(state: GameState, rawName: string): { playerId: string; state: GameState } {
    const playerId = crypto.randomUUID();
    const color = COLORS[state.players.length] ?? 'red';
    const player: Player = {
      id: playerId,
      name: this.getUniqueName(state, rawName, color),
      color,
      connected: true,
      ready: false,
    };
    state.players.push(player);
    state.pieces.push(...Array.from({ length: 4 }, (_, index) => ({ id: `${playerId}-${index}`, playerId, position: -1 })));
    state.revision += 1;
    return { playerId, state };
  }

  private getUniqueName(state: GameState, rawName: string, color: PlayerColor, currentPlayerId?: string): string {
    const requestedName = rawName.trim().slice(0, 24);
    const baseName = requestedName && requestedName.toLocaleLowerCase('de-DE') !== 'gast' ? requestedName : `Gast ${COLOR_NAMES[color]}`;
    const usedNames = new Set(state.players.filter((player) => player.id !== currentPlayerId).map((player) => player.name.toLocaleLowerCase('de-DE')));
    if (!usedNames.has(baseName.toLocaleLowerCase('de-DE'))) return baseName;

    let suffix = 2;
    while (usedNames.has(`${baseName} ${suffix}`.toLocaleLowerCase('de-DE'))) suffix += 1;
    return `${baseName} ${suffix}`;
  }

  private getState(roomCode: string): GameState {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Raum nicht gefunden.');
    return room.state;
  }

  private getMovablePieces(state: GameState, playerId: string, diceResult: number) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) return [];
    const ownPieces = state.pieces.filter((piece) => piece.playerId === playerId);

    return ownPieces.filter((piece) => {
      const targetPosition = piece.position === -1 ? (diceResult === 6 ? 0 : -1) : piece.position + diceResult;
      if (targetPosition < 0 || targetPosition > 43) return false;
      return !ownPieces.some((other) => other.id !== piece.id && other.position === targetPosition);
    });
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
    state.turnDeadline = Date.now() + this.turnDurationMs;
    const room = this.rooms.get(state.roomCode);
    if (!room) return;
    room.turnTimer = setTimeout(() => {
      if (state.phase !== 'playing') return;
      this.advanceTurn(state, false);
      state.revision += 1;
      this.onStateChange(state.roomCode, state);
    }, this.turnDurationMs);
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

  private clearTurnTimer(roomCode: string) {
    const timer = this.rooms.get(roomCode)?.turnTimer;
    if (timer) clearTimeout(timer);
  }

  private toBoardPosition(color: PlayerColor, relativePosition: number): number {
    const offsets: Record<PlayerColor, number> = { red: 0, blue: 10, green: 20, yellow: 30 };
    return (offsets[color] + relativePosition) % 40;
  }

  private generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }
}
