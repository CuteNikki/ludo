import { describe, expect, test } from 'bun:test';

import { isJoinable, sortRooms } from './room-list';

type Phase = 'lobby' | 'playing' | 'finished';

function room(id: string, phase: Phase, playerCount: number) {
  return { id, phase, playerCount, maxPlayers: 4 };
}

describe('room list', () => {
  test('only lobbies with a free seat are joinable', () => {
    expect(isJoinable(room('a', 'lobby', 1))).toBe(true);
    expect(isJoinable(room('b', 'lobby', 4))).toBe(false);
    expect(isJoinable(room('c', 'playing', 2))).toBe(false);
    expect(isJoinable(room('d', 'finished', 2))).toBe(false);
  });

  test('puts joinable rooms first, fullest first', () => {
    const sorted = sortRooms([room('one', 'lobby', 1), room('three', 'lobby', 3), room('two', 'lobby', 2)]);
    expect(sorted.map((entry) => entry.id)).toEqual(['three', 'two', 'one']);
  });

  test('orders joinable, full, in progress and finished rooms', () => {
    const sorted = sortRooms([room('finished', 'finished', 3), room('playing', 'playing', 2), room('full', 'lobby', 4), room('open', 'lobby', 1)]);
    expect(sorted.map((entry) => entry.id)).toEqual(['open', 'full', 'playing', 'finished']);
  });

  test('keeps the server order for rooms that tie and does not change the input', () => {
    const rooms = [room('first', 'lobby', 2), room('second', 'lobby', 2), room('p1', 'playing', 4), room('p2', 'playing', 1)];
    expect(sortRooms(rooms).map((entry) => entry.id)).toEqual(['first', 'second', 'p1', 'p2']);
    expect(rooms.map((entry) => entry.id)).toEqual(['first', 'second', 'p1', 'p2']);
  });
});
