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
  revision: number;
}

export type ClientEvent =
  | { type: 'room:create'; payload: { playerName: string } }
  | { type: 'room:join'; payload: { roomCode: string; playerName: string; playerId?: string } }
  | { type: 'room:settings'; payload: RoomSettings }
  | { type: 'player:update'; payload: { name: string; color: PlayerColor } }
  | { type: 'player:ready'; payload: { ready: boolean } }
  | { type: 'game:move'; payload: { pieceId: string } };

export type ServerEvent =
  | { type: 'room:joined'; payload: { playerId: string; state: GameState } }
  | { type: 'game:state'; payload: GameState }
  | { type: 'player:left'; payload: { playerId: string } }
  | { type: 'room:error'; payload: { code: string; message: string } };
