export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
  ready: boolean;
}

export interface Piece {
  id: string;
  playerId: string;
  position: number;
}

export type MoveTimeSeconds = 15 | 30 | 45 | 60;

export interface RoomSettings {
  moveTimeSeconds: MoveTimeSeconds;
  automaticSingleMove: boolean;
  fairDice: boolean;
  isPublic: boolean;
  mustSpawnOnSix: boolean;
}

export interface PublicRoomSummary {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GameState['phase'];
  settings: RoomSettings;
}

export interface GameState {
  roomCode: string;
  hostPlayerId: string | null;
  settings: RoomSettings;
  phase: 'lobby' | 'playing' | 'finished';
  turnStage: 'rolling' | 'move' | 'auto-move' | 'no-move';
  turnDeadline: number | null;
  players: Player[];
  pieces: Piece[];
  currentPlayerId: string | null;
  diceResult: number | null;
  movablePieceIds: string[];
  winnerId: string | null;
  rematchDeadline: number | null;
  rematchPlayerIds: string[];
  revision: number;
}

export type ClientEvent =
  | { type: 'room:create'; payload: { playerName: string } }
  | { type: 'room:join'; payload: { roomCode: string; playerName: string; playerId?: string } }
  | { type: 'room:settings'; payload: RoomSettings }
  | { type: 'room:leave'; payload: Record<string, never> }
  | { type: 'room:kick'; payload: { playerId: string } }
  | { type: 'player:update'; payload: { name: string; color: PlayerColor } }
  | { type: 'player:ready'; payload: { ready: boolean } }
  | { type: 'game:rematch'; payload: Record<string, never> }
  | { type: 'game:move'; payload: { pieceId: string } }
  | { type: 'room:discover'; payload: Record<string, never> };

export type PlayerLeftReason = 'left' | 'kicked' | 'disconnected';

export type ServerEvent =
  | { type: 'room:joined'; payload: { playerId: string; state: GameState } }
  | { type: 'game:state'; payload: GameState }
  | { type: 'player:left'; payload: { playerId: string; playerName: string; reason: PlayerLeftReason } }
  | { type: 'room:rematch'; payload: { roomCode: string | null; movedPlayerIds: string[] } }
  | { type: 'room:list'; payload: { rooms: PublicRoomSummary[] } }
  | { type: 'room:error'; payload: { code: RoomErrorCode; message: string } };

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'GAME_ALREADY_RUNNING'
  | 'ROOM_FULL'
  | 'GAME_NOT_STARTED'
  | 'PLAYER_NOT_FOUND'
  | 'PIECE_NOT_FOUND'
  | 'NOT_YOUR_TURN'
  | 'ALREADY_ROLLED'
  | 'ROLL_FIRST'
  | 'MISSING_DICE_RESULT'
  | 'PIECE_NOT_MOVABLE'
  | 'SETTINGS_ONLY_LOBBY'
  | 'HOST_ONLY_SETTINGS'
  | 'INVALID_MOVE_TIME'
  | 'INVALID_SETTINGS'
  | 'PROFILE_ONLY_LOBBY'
  | 'INVALID_COLOR'
  | 'COLOR_TAKEN'
  | 'PLAYERS_ONLY_LOBBY'
  | 'HOST_ONLY_KICK'
  | 'HOST_CANNOT_KICK_SELF'
  | 'REMATCH_NOT_AVAILABLE'
  | 'INVALID_EVENT'
  | 'UNKNOWN';
