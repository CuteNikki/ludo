import type { ClientEvent, ServerEvent } from '@ludo/shared';

import { RoomError, RoomManager } from './room-manager';

interface SocketData {
  clientId: string;
  roomCode?: string;
  playerId?: string;
}

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
          const joined = rooms.joinRoom(event.payload.roomCode, event.payload.playerName, event.payload.playerId);
          joinSocket(socket, joined.state.roomCode, joined.playerId);
          send(socket, { type: 'room:joined', payload: joined });
          broadcast(joined.state.roomCode, { type: 'game:state', payload: joined.state });
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
        } else if (event.type === 'room:leave') {
          const state = rooms.leaveRoom(roomCode, playerId);
          if (state) broadcast(roomCode, { type: 'game:state', payload: state });
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
      const state = rooms.disconnectPlayer(roomCode, playerId);
      if (state) broadcast(roomCode, { type: 'game:state', payload: state });
    },
  },
});

function joinSocket(socket: Bun.ServerWebSocket<SocketData>, roomCode: string, playerId: string) {
  if (socket.data.roomCode && socket.data.roomCode !== roomCode) socket.unsubscribe(socket.data.roomCode);
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
