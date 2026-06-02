import { useCallback } from 'react';
import { getSocket } from '../socket/socket';
import { useBoardStore } from '../store/boardStore';
import { useOfflineStore } from '../store/offlineStore';
import type { Card } from '../types/events';
import type { QueuedAction } from '../types/offline';

// Sinh tempId cho optimistic create.
function makeTempId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `temp-${crypto.randomUUID()}`;
  return `temp-${Math.random().toString(36).slice(2)}`;
}

/**
 * Action xuất phát từ client:
 *  1. Optimistic update store NGAY (UI mượt).
 *  2. Nếu socket đang connected → emit + ack (ok: xác nhận, fail: rollback, conflict: server thắng).
 *     Nếu offline → xếp vào hàng đợi (offlineStore), gửi lại khi reconnect.
 */
export function useBoardActions(boardId: string) {
  const store = useBoardStore();
  const enqueue = useOfflineStore((s) => s.enqueue);

  const isOnline = () => getSocket().connected;
  const queue = useCallback((action: QueuedAction) => enqueue(boardId, action), [boardId, enqueue]);

  const createCard = useCallback(
    (columnId: string, title: string) => {
      const tempId = makeTempId();
      const col = store.columns.find((c) => c.id === columnId);
      const maxPos = col ? Math.max(0, ...col.cards.map((c) => c.position)) : 0;
      const temp: Card = {
        id: tempId,
        columnId,
        title,
        description: null,
        position: maxPos + 1000,
        version: 0,
        updatedAt: new Date().toISOString(),
      };
      store.addCardLocal(temp); // optimistic

      if (isOnline()) {
        getSocket().emit('card:create', { boardId, columnId, title, tempId }, (res) => {
          if (res.ok) store.replaceTempCard(tempId, res.data.card);
          else store.removeCard(tempId); // rollback
        });
      } else {
        queue({ kind: 'create', columnId, title, tempId });
      }
    },
    [boardId, store, queue]
  );

  const updateCard = useCallback(
    (cardId: string, patch: Partial<Pick<Card, 'title' | 'description'>>) => {
      const prev = store.findCard(cardId);
      if (!prev) return;
      store.upsertCard({ ...prev, ...patch }); // optimistic

      if (isOnline()) {
        getSocket().emit('card:update', { boardId, cardId, patch, version: prev.version }, (res) => {
          if (res.ok) store.upsertCard(res.data.card);
          else if (res.conflict) store.upsertCard(res.conflict.serverCard);
          else store.upsertCard(prev); // rollback
        });
      } else {
        queue({ kind: 'update', cardId, patch, version: prev.version });
      }
    },
    [boardId, store, queue]
  );

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, newPosition: number) => {
      const prev = store.findCard(cardId);
      if (!prev) return;
      store.upsertCard({ ...prev, columnId: toColumnId, position: newPosition }); // optimistic

      if (isOnline()) {
        getSocket().emit(
          'card:move',
          { boardId, cardId, toColumnId, newPosition, version: prev.version },
          (res) => {
            if (res.ok) store.upsertCard(res.data.card);
            else if (res.conflict) store.upsertCard(res.conflict.serverCard);
            else store.upsertCard(prev); // rollback
          }
        );
      } else {
        queue({ kind: 'move', cardId, toColumnId, newPosition, version: prev.version });
      }
    },
    [boardId, store, queue]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      const prev = store.findCard(cardId);
      store.removeCard(cardId); // optimistic
      if (isOnline()) {
        getSocket().emit('card:delete', { boardId, cardId }, (res) => {
          if (!res.ok && prev) store.upsertCard(prev); // rollback
        });
      } else {
        queue({ kind: 'delete', cardId });
      }
    },
    [boardId, store, queue]
  );

  const renameColumn = useCallback(
    (columnId: string, title: string) => {
      const prev = store.columns.find((c) => c.id === columnId)?.title;
      store.renameColumn(columnId, title); // optimistic
      if (isOnline()) {
        getSocket().emit('column:rename', { boardId, columnId, title }, (res) => {
          if (!res.ok && prev !== undefined) store.renameColumn(columnId, prev); // rollback
        });
      } else {
        queue({ kind: 'rename', columnId, title });
      }
    },
    [boardId, store, queue]
  );

  const setEditing = useCallback(
    (cardId: string, isEditing: boolean) => {
      // Editing indicator là tín hiệu ephemeral — không cần xếp hàng khi offline.
      if (isOnline()) getSocket().emit('card:editing', { boardId, cardId, isEditing });
    },
    [boardId]
  );

  return { createCard, updateCard, moveCard, deleteCard, renameColumn, setEditing };
}
