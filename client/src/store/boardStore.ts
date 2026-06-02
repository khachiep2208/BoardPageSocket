import { create } from 'zustand';
import type { Board, Card, Column, PresenceUser } from '../types/events';

interface EditingInfo {
  userId: string;
  userName: string;
}

interface BoardState {
  boardId: string | null;
  title: string;
  columns: Column[];
  presence: PresenceUser[];
  // cardId -> ai đang sửa (stretch: editing indicator)
  editing: Record<string, EditingInfo>;

  setBoard: (board: Board) => void;
  reset: () => void;

  /** Thêm/ghi đè card theo id, đặt vào đúng cột (card.columnId) và sort theo position.
   *  Dùng cho cả created / updated / moved — server là nguồn chân lý. */
  upsertCard: (card: Card) => void;
  /** Optimistic: thêm card tạm vào cột. */
  addCardLocal: (card: Card) => void;
  /** Khớp tempId → card thật sau khi server ack. */
  replaceTempCard: (tempId: string, card: Card) => void;
  removeCard: (cardId: string) => void;
  renameColumn: (columnId: string, title: string) => void;

  setPresence: (users: PresenceUser[]) => void;
  setEditing: (cardId: string, info: EditingInfo, isEditing: boolean) => void;

  findCard: (cardId: string) => Card | undefined;
}

function sortByPosition<T extends { position: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.position - b.position);
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boardId: null,
  title: '',
  columns: [],
  presence: [],
  editing: {},

  setBoard: (board) =>
    set({
      boardId: board.id,
      title: board.title,
      columns: sortByPosition(
        board.columns.map((c) => ({ ...c, cards: sortByPosition(c.cards) }))
      ),
    }),

  reset: () => set({ boardId: null, title: '', columns: [], presence: [], editing: {} }),

  upsertCard: (card) =>
    set((state) => {
      // 1) Bỏ card khỏi mọi cột (xử lý cả trường hợp đổi cột).
      const columns = state.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== card.id),
      }));
      // 2) Chèn vào cột đích và sort.
      return {
        columns: columns.map((col) =>
          col.id === card.columnId ? { ...col, cards: sortByPosition([...col.cards, card]) } : col
        ),
      };
    }),

  addCardLocal: (card) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.id === card.columnId ? { ...col, cards: sortByPosition([...col.cards, card]) } : col
      ),
    })),

  replaceTempCard: (tempId, card) =>
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        cards: sortByPosition(
          col.cards.map((c) => (c.id === tempId ? card : c))
        ).filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i),
      })),
    })),

  removeCard: (cardId) =>
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== cardId),
      })),
    })),

  renameColumn: (columnId, title) =>
    set((state) => ({
      columns: state.columns.map((col) => (col.id === columnId ? { ...col, title } : col)),
    })),

  setPresence: (users) => set({ presence: users }),

  setEditing: (cardId, info, isEditing) =>
    set((state) => {
      const editing = { ...state.editing };
      if (isEditing) editing[cardId] = info;
      else delete editing[cardId];
      return { editing };
    }),

  findCard: (cardId) => {
    for (const col of get().columns) {
      const found = col.cards.find((c) => c.id === cardId);
      if (found) return found;
    }
    return undefined;
  },
}));
