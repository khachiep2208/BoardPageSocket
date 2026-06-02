import type { AppSocket } from './socket';
import { useBoardStore } from '../store/boardStore';

// Đăng ký toàn bộ listener server → client, cập nhật Zustand store.
// Trả về hàm cleanup để gỡ listener (tránh đăng ký trùng khi re-mount).
export function registerSocketHandlers(socket: AppSocket): () => void {
  const store = useBoardStore.getState();

  const onCreated = ({ card }: { card: import('../types/events').Card }) => {
    store.upsertCard(card);
  };
  const onUpdated = ({ card }: { card: import('../types/events').Card }) => {
    store.upsertCard(card);
  };
  const onMoved = ({ card }: { card: import('../types/events').Card }) => {
    store.upsertCard(card);
  };
  const onDeleted = ({ cardId }: { cardId: string }) => {
    store.removeCard(cardId);
  };
  const onRenamed = ({ columnId, title }: { columnId: string; title: string }) => {
    store.renameColumn(columnId, title);
  };
  const onPresence = ({ users }: { users: import('../types/events').PresenceUser[] }) => {
    store.setPresence(users);
  };
  const onEditing = (p: { cardId: string; userId: string; userName: string; isEditing: boolean }) => {
    store.setEditing(p.cardId, { userId: p.userId, userName: p.userName }, p.isEditing);
  };
  const onConflict = ({ serverCard }: { cardId: string; serverCard: import('../types/events').Card }) => {
    // Server thắng: ghi đè bản local bằng bản đúng.
    store.upsertCard(serverCard);
  };

  socket.on('card:created', onCreated);
  socket.on('card:updated', onUpdated);
  socket.on('card:moved', onMoved);
  socket.on('card:deleted', onDeleted);
  socket.on('column:renamed', onRenamed);
  socket.on('presence:update', onPresence);
  socket.on('card:editing', onEditing);
  socket.on('error:conflict', onConflict);

  return () => {
    socket.off('card:created', onCreated);
    socket.off('card:updated', onUpdated);
    socket.off('card:moved', onMoved);
    socket.off('card:deleted', onDeleted);
    socket.off('column:renamed', onRenamed);
    socket.off('presence:update', onPresence);
    socket.off('card:editing', onEditing);
    socket.off('error:conflict', onConflict);
  };
}
