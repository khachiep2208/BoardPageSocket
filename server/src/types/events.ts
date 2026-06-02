// ───────────────────────────────────────────────────────────────────────────
// Socket.IO event contract — DÙNG CHUNG cho client & server.
// Giữ file này đồng bộ ở client/src/types/events.ts.
// ───────────────────────────────────────────────────────────────────────────

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  version: number;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  columns: Column[];
}

export interface PresenceUser {
  id: string;
  name: string;
}

// ── Payload: Client → Server ────────────────────────────────────────────────
export interface ClientToServerEvents {
  'board:join': (p: { boardId: string }) => void;
  'board:leave': (p: { boardId: string }) => void;
  'card:create': (
    p: { boardId: string; columnId: string; title: string; tempId: string },
    ack?: (res: AckResult<{ card: Card; tempId: string }>) => void
  ) => void;
  'card:update': (
    p: { boardId: string; cardId: string; patch: Partial<Pick<Card, 'title' | 'description'>>; version: number },
    ack?: (res: AckResult<{ card: Card }>) => void
  ) => void;
  'card:move': (
    p: { boardId: string; cardId: string; toColumnId: string; newPosition: number; version: number },
    ack?: (res: AckResult<{ card: Card }>) => void
  ) => void;
  'card:delete': (p: { boardId: string; cardId: string }, ack?: (res: AckResult<{ cardId: string }>) => void) => void;
  'column:rename': (
    p: { boardId: string; columnId: string; title: string },
    ack?: (res: AckResult<{ columnId: string; title: string }>) => void
  ) => void;
  'card:editing': (p: { boardId: string; cardId: string; isEditing: boolean }) => void;
}

// ── Payload: Server → Client ────────────────────────────────────────────────
export interface ServerToClientEvents {
  'card:created': (p: { card: Card; tempId: string }) => void;
  'card:updated': (p: { card: Card }) => void;
  'card:moved': (p: { card: Card }) => void;
  'card:deleted': (p: { cardId: string }) => void;
  'column:renamed': (p: { columnId: string; title: string }) => void;
  'presence:update': (p: { users: PresenceUser[] }) => void;
  'card:editing': (p: { cardId: string; userId: string; userName: string; isEditing: boolean }) => void;
  'error:conflict': (p: { cardId: string; serverCard: Card }) => void;
}

// Kết quả ack cho optimistic update (rollback khi ok === false)
export type AckResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflict?: { serverCard: Card } };

export interface SocketData {
  user: { id: string; name: string; email: string };
}
