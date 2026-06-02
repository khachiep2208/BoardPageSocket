import { Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';

// Middleware io.use — verify JWT trong handshake.
// Fail → client bắt connect_error → refresh access token → reconnect.
export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('unauthorized'));
  try {
    socket.data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}
