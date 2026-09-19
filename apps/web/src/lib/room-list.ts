import type { PublicRoomSummary } from '@ludo/shared';

type ListedRoom = Pick<PublicRoomSummary, 'phase' | 'playerCount' | 'maxPlayers'>;

/** Whether a listed room can still be joined: it is in the lobby and has a free seat. */
export function isJoinable(room: ListedRoom): boolean {
  return room.phase === 'lobby' && room.playerCount < room.maxPlayers;
}

function rank(room: ListedRoom): number {
  if (isJoinable(room)) return 0;
  if (room.phase === 'lobby') return 1;
  return room.phase === 'playing' ? 2 : 3;
}

/**
 * Rooms you can join come first, fullest first, since a nearly full room gets going soonest. Full lobbies
 * follow, then games in progress, then finished ones. Rooms that tie keep the order the server sent them in.
 */
export function sortRooms<T extends ListedRoom>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => rank(a) - rank(b) || (isJoinable(a) ? b.playerCount - a.playerCount : 0));
}
