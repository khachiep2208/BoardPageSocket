import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType } from '../types/events';

interface Props {
  card: CardType;
  editingBy: string | null; // tên người khác đang sửa (stretch indicator)
  onUpdate: (cardId: string, patch: { title?: string; description?: string }) => void;
  onDelete: (cardId: string) => void;
  onEditingChange: (cardId: string, isEditing: boolean) => void;
}

function CardInner({ card, editingBy, onUpdate, onDelete, onEditingChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
    disabled: editing, // không kéo khi đang sửa text
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const startEdit = () => {
    setDraft(card.title);
    setEditing(true);
    onEditingChange(card.id, true);
  };

  const commit = () => {
    setEditing(false);
    onEditingChange(card.id, false);
    const title = draft.trim();
    if (title && title !== card.title) onUpdate(card.id, { title });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:ring-slate-300"
    >
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              setEditing(false);
              onEditingChange(card.id, false);
            }
          }}
          className="w-full resize-none rounded border border-slate-300 p-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          rows={2}
        />
      ) : (
        <div
          {...attributes}
          {...listeners}
          onDoubleClick={startEdit}
          className="cursor-grab whitespace-pre-wrap break-words text-sm text-slate-800 active:cursor-grabbing"
        >
          {card.title}
        </div>
      )}

      {editingBy && (
        <div className="mt-1 text-[11px] italic text-amber-600">✏️ {editingBy} đang sửa…</div>
      )}

      {!editing && (
        <button
          onClick={() => onDelete(card.id)}
          title="Xóa thẻ"
          className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

// React.memo: chỉ re-render khi card object / editingBy thay đổi (callbacks ổn định).
export const Card = React.memo(CardInner);
