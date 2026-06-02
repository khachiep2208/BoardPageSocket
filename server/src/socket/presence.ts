import type { Server } from 'socket.io';
import type { PresenceUser } from '../types/events';

// boardId -> (socketId -> user). Một user có thể mở nhiều tab → nhiều socket.
const rooms = new Map<string, Map<string, PresenceUser>>();

function distinctUsers(boardId: string): PresenceUser[] {
  const map = rooms.get(boardId);
  if (!map) return [];
  const byId = new Map<string, PresenceUser>();
  for (const u of map.values()) byId.set(u.id, u);
  return [...byId.values()];
}

export function addPresence(boardId: string, socketId: string, user: PresenceUser) {
  if (!rooms.has(boardId)) rooms.set(boardId, new Map());
  rooms.get(boardId)!.set(socketId, user);
}

export function removePresence(boardId: string, socketId: string) {
  const map = rooms.get(boardId);
  if (!map) return;
  map.delete(socketId);
  if (map.size === 0) rooms.delete(boardId);
}

// Xóa socket khỏi mọi room (khi disconnect) — trả về danh sách board bị ảnh hưởng.
export function removeSocketEverywhere(socketId: string): string[] {
  const affected: string[] = [];
  for (const [boardId, map] of rooms) {
    if (map.delete(socketId)) {
      affected.push(boardId);
      if (map.size === 0) rooms.delete(boardId);
    }
  }
  return affected;
}

export function broadcastPresence(io: Server, boardId: string) {
  io.to(boardId).emit('presence:update', { users: distinctUsers(boardId) });
}
