import type { ClientEvent, ServerEvent } from '@ludo/shared';

import { RoomError, RoomManager } from './room-manager';

interface SocketData {
  clientId: string;
  roomCode?: string;
  playerId?: string;
}

/**
 * How many open sockets speak for each player. A player counts as gone only when the last one closes,
 * so a duplicated tab (which copies the session) or a reload that reconnects before the old socket's
 * close arrives doesn't knock a player offline while another socket of theirs is still open.
 */
const openSockets = new Map<string, number>();
const socketKey = (roomCode: string, playerId: string) => `${roomCode}:${playerId}`;

const port = Number(Bun.env.PORT ?? 3001);
const rooms = new RoomManager(
  (roomCode, state) => {
    broadcast(roomCode, { type: 'game:state', payload: state });
  },
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  (transition) => {
    broadcast(transition.oldRoomCode, {
      type: 'room:rematch',
      payload: { roomCode: transition.newRoomCode, movedPlayerIds: transition.movedPlayerIds },
    });
  },
  (roomCode, event) => {
    broadcast(roomCode, { type: 'player:left', payload: event });
  },
);

const server = Bun.serve<SocketData>({
  hostname: '0.0.0.0',
  port,
  fetch(request, serverInstance) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }
    if (url.pathname === '/ws' && serverInstance.upgrade(request, { data: { clientId: crypto.randomUUID() } })) {
      return;
    }
    return new Response('Not found', { status: 404 });
  },
  websocket: {
    // Pings go out automatically; a socket that stops answering (a crashed browser, a closed laptop) is
    // dropped after this many idle seconds instead of the default two minutes, so its seat frees up sooner.
    idleTimeout: 30,
    open(socket) {
      socket.send(JSON.stringify({ type: 'connection:ready', payload: { clientId: socket.data.clientId } }));
    },
    message(socket, rawMessage) {
      try {
        const event = JSON.parse(String(rawMessage)) as ClientEvent;
        if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
          throw new Error('Invalid message.');
        }

        if (event.type === 'room:create') {
          const joined = rooms.createRoom(event.payload.playerName);
          joinSocket(socket, joined.state.roomCode, joined.playerId);
          send(socket, { type: 'room:joined', payload: joined });
          return;
        }

        if (event.type === 'room:join') {
          // Someone coming back to a seat they already have isn't news; a new player is.
          const returning = !!event.payload.playerId && !!rooms.getRoomState(event.payload.roomCode.toUpperCase())?.players.some((player) => player.id === event.payload.playerId);
          const joined = rooms.joinRoom(event.payload.roomCode, event.payload.playerName, event.payload.playerId);
          joinSocket(socket, joined.state.roomCode, joined.playerId);
          send(socket, { type: 'room:joined', payload: joined });
          broadcast(joined.state.roomCode, { type: 'game:state', payload: joined.state });
          if (!returning) {
            const playerName = joined.state.players.find((player) => player.id === joined.playerId)?.name ?? 'Guest';
            broadcast(joined.state.roomCode, { type: 'player:joined', payload: { playerId: joined.playerId, playerName } });
          }
          return;
        }

        if (event.type === 'room:discover') {
          send(socket, { type: 'room:list', payload: { rooms: rooms.listPublicRooms() } });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) throw new Error('You have not joined a room.');

        if (event.type === 'player:ready') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.setReady(roomCode, playerId, event.payload.ready) });
        } else if (event.type === 'player:update') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.updatePlayer(roomCode, playerId, event.payload.name, event.payload.color) });
        } else if (event.type === 'room:settings') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.setSettings(roomCode, playerId, event.payload) });
        } else if (event.type === 'room:kick') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.kickPlayer(roomCode, playerId, event.payload.playerId) });
        } else if (event.type === 'room:claimHost') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.claimHost(roomCode, playerId) });
        } else if (event.type === 'room:addBot') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.addBot(roomCode, playerId) });
        } else if (event.type === 'room:leave') {
          const state = rooms.leaveRoom(roomCode, playerId);
          if (state) broadcast(roomCode, { type: 'game:state', payload: state });
          openSockets.delete(socketKey(roomCode, playerId));
          socket.unsubscribe(roomCode);
          delete socket.data.roomCode;
          delete socket.data.playerId;
        } else if (event.type === 'game:rematch') {
          const state = rooms.voteRematch(roomCode, playerId);
          if (state) broadcast(roomCode, { type: 'game:state', payload: state });
        } else if (event.type === 'game:move') {
          broadcast(roomCode, { type: 'game:state', payload: rooms.move(roomCode, playerId, event.payload.pieceId) });
        }
      } catch (error) {
        send(socket, {
          type: 'room:error',
          payload: {
            code: error instanceof RoomError ? error.code : 'UNKNOWN',
            message: error instanceof Error ? error.message : 'Unknown Error.',
          },
        });
      }
    },
    close(socket) {
      const { roomCode, playerId } = socket.data;
      if (!roomCode || !playerId) return;
      const key = socketKey(roomCode, playerId);
      const remaining = (openSockets.get(key) ?? 1) - 1;
      if (remaining > 0) {
        openSockets.set(key, remaining);
        return;
      }
      openSockets.delete(key);
      const state = rooms.disconnectPlayer(roomCode, playerId);
      if (state) broadcast(roomCode, { type: 'game:state', payload: state });
    },
  },
});

function joinSocket(socket: Bun.ServerWebSocket<SocketData>, roomCode: string, playerId: string) {
  if (socket.data.roomCode && socket.data.roomCode !== roomCode) socket.unsubscribe(socket.data.roomCode);
  // A socket that re-joins (or moves to another seat) must not be counted twice.
  if (socket.data.roomCode && socket.data.playerId) {
    const previous = socketKey(socket.data.roomCode, socket.data.playerId);
    if (previous === socketKey(roomCode, playerId)) return void socket.subscribe(roomCode);
    const left = (openSockets.get(previous) ?? 1) - 1;
    if (left > 0) openSockets.set(previous, left);
    else openSockets.delete(previous);
  }
  openSockets.set(socketKey(roomCode, playerId), (openSockets.get(socketKey(roomCode, playerId)) ?? 0) + 1);
  socket.data.roomCode = roomCode;
  socket.data.playerId = playerId;
  socket.subscribe(roomCode);
}

function send(socket: Bun.ServerWebSocket<SocketData>, event: ServerEvent) {
  socket.send(JSON.stringify(event));
}

function broadcast(roomCode: string, event: ServerEvent) {
  server.publish(roomCode, JSON.stringify(event));
}

console.log(`Ludo WebSocket server listening on http://localhost:${server.port}`);
