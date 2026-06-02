import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/events';
import { socketAuth } from './auth.middleware';
import { registerBoardHandlers } from './boardHandlers';

export function attachSocket(httpServer: HttpServer, clientOrigin: string | string[]) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: { origin: clientOrigin, credentials: true },
    }
  );

  io.use(socketAuth);

  io.on('connection', (socket) => {
    registerBoardHandlers(io, socket);
  });

  return io;
}
