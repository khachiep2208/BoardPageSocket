import type { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import type {
  Card as CardDTO,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/events';
import { addPresence, broadcastPresence, removePresence, removeSocketEverywhere } from './presence';

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Prisma Card (updatedAt: Date) → DTO (updatedAt: string) cho client.
function toDTO(card: {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  version: number;
  updatedAt: Date;
}): CardDTO {
  return { ...card, updatedAt: card.updatedAt.toISOString() };
}

// Helper: kiểm tra user có quyền với board (MVP: owner).
async function assertBoardAccess(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { ownerId: true } });
  return !!board && board.ownerId === userId;
}

export function registerBoardHandlers(io: IO, socket: S) {
  const user = socket.data.user;

  // ── board:join ────────────────────────────────────────────────────────────
  socket.on('board:join', async ({ boardId }) => {
    if (!(await assertBoardAccess(boardId, user.id))) return;
    socket.join(boardId);
    addPresence(boardId, socket.id, { id: user.id, name: user.name });
    broadcastPresence(io, boardId);
  });

  // ── board:leave ─────────────────────────────────────────────────────────────
  socket.on('board:leave', ({ boardId }) => {
    socket.leave(boardId);
    removePresence(boardId, socket.id);
    broadcastPresence(io, boardId);
  });

  // ── card:create ─────────────────────────────────────────────────────────────
  socket.on('card:create', async ({ boardId, columnId, title, tempId }, ack) => {
    try {
      if (!(await assertBoardAccess(boardId, user.id))) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      // position = max trong cột + 1000 (đẩy xuống cuối).
      const last = await prisma.card.findFirst({
        where: { columnId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (last?.position ?? 0) + 1000;
      const card = await prisma.card.create({ data: { columnId, title, position } });
      const dto = toDTO(card);
      // Broadcast cho người khác; ack trả về người gửi để khớp tempId.
      socket.to(boardId).emit('card:created', { card: dto, tempId });
      ack?.({ ok: true, data: { card: dto, tempId } });
    } catch (e) {
      ack?.({ ok: false, error: 'create_failed' });
    }
  });

  // ── card:update (title/description) — conflict bằng version ──────────────────
  socket.on('card:update', async ({ boardId, cardId, patch, version }, ack) => {
    try {
      if (!(await assertBoardAccess(boardId, user.id))) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      const current = await prisma.card.findUnique({ where: { id: cardId } });
      if (!current) return ack?.({ ok: false, error: 'not_found' });

      if (current.version !== version) {
        const serverCard = toDTO(current);
        socket.emit('error:conflict', { cardId, serverCard });
        return ack?.({ ok: false, error: 'conflict', conflict: { serverCard } });
      }

      const updated = await prisma.card.update({
        where: { id: cardId },
        data: {
          title: patch.title ?? current.title,
          description: patch.description !== undefined ? patch.description : current.description,
          version: { increment: 1 },
        },
      });
      const dto = toDTO(updated);
      socket.to(boardId).emit('card:updated', { card: dto });
      ack?.({ ok: true, data: { card: dto } });
    } catch {
      ack?.({ ok: false, error: 'update_failed' });
    }
  });

  // ── card:move (kéo-thả trong/giữa cột) ───────────────────────────────────────
  socket.on('card:move', async ({ boardId, cardId, toColumnId, newPosition, version }, ack) => {
    try {
      if (!(await assertBoardAccess(boardId, user.id))) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      const current = await prisma.card.findUnique({ where: { id: cardId } });
      if (!current) return ack?.({ ok: false, error: 'not_found' });

      if (current.version !== version) {
        const serverCard = toDTO(current);
        socket.emit('error:conflict', { cardId, serverCard });
        return ack?.({ ok: false, error: 'conflict', conflict: { serverCard } });
      }

      const moved = await prisma.card.update({
        where: { id: cardId },
        data: { columnId: toColumnId, position: newPosition, version: { increment: 1 } },
      });
      const dto = toDTO(moved);
      socket.to(boardId).emit('card:moved', { card: dto });
      ack?.({ ok: true, data: { card: dto } });
    } catch {
      ack?.({ ok: false, error: 'move_failed' });
    }
  });

  // ── card:delete ───────────────────────────────────────────────────────────────
  socket.on('card:delete', async ({ boardId, cardId }, ack) => {
    try {
      if (!(await assertBoardAccess(boardId, user.id))) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      await prisma.card.delete({ where: { id: cardId } }).catch(() => undefined);
      socket.to(boardId).emit('card:deleted', { cardId });
      ack?.({ ok: true, data: { cardId } });
    } catch {
      ack?.({ ok: false, error: 'delete_failed' });
    }
  });

  // ── column:rename ─────────────────────────────────────────────────────────────
  socket.on('column:rename', async ({ boardId, columnId, title }, ack) => {
    try {
      if (!(await assertBoardAccess(boardId, user.id))) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      await prisma.column.update({ where: { id: columnId }, data: { title } });
      socket.to(boardId).emit('column:renamed', { columnId, title });
      ack?.({ ok: true, data: { columnId, title } });
    } catch {
      ack?.({ ok: false, error: 'rename_failed' });
    }
  });

  // ── card:editing (stretch — indicator) ───────────────────────────────────────
  socket.on('card:editing', ({ boardId, cardId, isEditing }) => {
    socket.to(boardId).emit('card:editing', {
      cardId,
      userId: user.id,
      userName: user.name,
      isEditing,
    });
  });

  // ── disconnect → dọn presence mọi room ───────────────────────────────────────
  socket.on('disconnect', () => {
    const affected = removeSocketEverywhere(socket.id);
    for (const boardId of affected) broadcastPresence(io, boardId);
  });
}
