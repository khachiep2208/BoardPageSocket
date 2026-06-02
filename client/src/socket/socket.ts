import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/events';
import { API_URL } from '../api/axios';
import { getAccessToken, useAuthStore } from '../store/authStore';
import { bootstrapSession } from '../api/auth';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (socket) return socket;

  socket = io(API_URL, {
    autoConnect: false,
    withCredentials: true,
    // auth dạng callback → mỗi lần (re)connect lấy token mới nhất.
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
  });

  // Handshake fail (token hết hạn) → refresh rồi reconnect.
  socket.on('connect_error', async (err) => {
    if (err.message === 'unauthorized') {
      const res = await bootstrapSession();
      if (res) {
        useAuthStore.getState().setToken(res.accessToken);
        socket?.connect(); // auth callback sẽ gửi token mới
      }
    }
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
