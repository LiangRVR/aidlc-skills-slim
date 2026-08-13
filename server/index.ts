import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { serialize } from '../shared/protocol';
import { ConnectionManager } from './connection-manager';
import { MessageRouter } from './message-router';
import { RoomManager } from './room-manager';

const PORT = Number(process.env.PORT ?? 8081);

const connections = new ConnectionManager();
const roomManager = new RoomManager((playerId, msg) => {
  connections.sendTo(playerId, msg);
});
const router = new MessageRouter(roomManager, connections);

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on('connection', (socket) => {
  const playerId = randomUUID();
  connections.register(playerId, (msg) => {
    if (socket.readyState === socket.OPEN) socket.send(serialize(msg));
  });
  socket.on('message', (data) => {
    router.handleRaw(playerId, data.toString());
  });
  socket.on('close', () => {
    router.handleDisconnect(playerId);
    connections.unregister(playerId);
  });
});

console.log(`sudoku server listening on 0.0.0.0:${PORT}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    wss.close();
    process.exit(0);
  });
}
