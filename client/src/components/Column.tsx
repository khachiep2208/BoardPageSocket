import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column as ColumnType } from '../types/events';
import { useBoardStore } from '../store/boardStore';
import { Card } from './Card';
import { AddCard } from './AddCard';

interface Props {
  column: ColumnType;
  onAddCard: (columnId: string, title: string) => void;
  onUpdateCard: (cardId: string, patch: { title?: string; description?: string }) => void;
  onDeleteCard: (cardId: string) => void;
  onEditingChange: (cardId: string, isEditing: boolean) => void;
  onRenameColumn: (columnId: string, title: string) => void;
}

export function Column({
  column,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onEditingChange,
  onRenameColumn,
}: Props) {
  const editing = useBoardStore((s) => s.editing);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(column.title);

  // Column là vùng droppable (cho phép thả vào cột rỗng).
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const commitRename = () => {
    setRenaming(false);
    const t = draft.trim();
    if (t && t !== column.title) onRenameColumn(column.id, t);
    else setDraft(column.title);
  };

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(column.title);
                setRenaming(false);
              }
            }}
            className="w-full rounded border border-slate-300 px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        ) : (
          <h2
            onDoubleClick={() => {
              setDraft(column.title);
              setRenaming(true);
            }}
            className="cursor-pointer text-sm font-semibold text-slate-700"
            title="Double-click để đổi tên"
          >
            {column.title}{' '}
            <span className="font-normal text-slate-400">{column.cards.length}</span>
          </h2>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[8px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? 'bg-indigo-100' : ''
        }`}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => {
            const editor = editing[card.id];
            return (
              <Card
                key={card.id}
                card={card}
                editingBy={editor ? editor.userName : null}
                onUpdate={onUpdateCard}
                onDelete={onDeleteCard}
                onEditingChange={onEditingChange}
              />
            );
          })}
        </SortableContext>
      </div>

      <AddCard onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  );
}
