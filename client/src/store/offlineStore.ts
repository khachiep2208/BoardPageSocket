import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueuedAction } from '../types/offline';

interface OfflineState {
  // Trạng thái kết nối socket (driven bởi useBoardSocket).
  online: boolean;
  // Hàng đợi action theo từng board (chỉ phần này được persist vào localStorage).
  queues: Record<string, QueuedAction[]>;

  setOnline: (online: boolean) => void;
  enqueue: (boardId: string, action: QueuedAction) => void;
  setQueue: (boardId: string, actions: QueuedAction[]) => void;
  clearQueue: (boardId: string) => void;
  pendingCount: (boardId: string) => number;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      online: true,
      queues: {},

      setOnline: (online) => set({ online }),

      enqueue: (boardId, action) =>
        set((state) => ({
          queues: { ...state.queues, [boardId]: [...(state.queues[boardId] ?? []), action] },
        })),

      setQueue: (boardId, actions) =>
        set((state) => ({ queues: { ...state.queues, [boardId]: actions } })),

      clearQueue: (boardId) =>
        set((state) => {
          const queues = { ...state.queues };
          delete queues[boardId];
          return { queues };
        }),

      pendingCount: (boardId) => get().queues[boardId]?.length ?? 0,
    }),
    {
      name: 'kanban-offline-queue',
      // Chỉ persist hàng đợi, không persist trạng thái online.
      partialize: (state) => ({ queues: state.queues }),
    }
  )
);
