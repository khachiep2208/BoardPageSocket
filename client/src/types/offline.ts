// Action được xếp hàng khi offline, gửi lại khi online.
// Mỗi action tương ứng 1 event client→server.
export type QueuedAction =
  | { kind: 'create'; columnId: string; title: string; tempId: string }
  | { kind: 'update'; cardId: string; patch: { title?: string; description?: string | null }; version: number }
  | { kind: 'move'; cardId: string; toColumnId: string; newPosition: number; version: number }
  | { kind: 'delete'; cardId: string }
  | { kind: 'rename'; columnId: string; title: string };
