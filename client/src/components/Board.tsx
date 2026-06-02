import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useBoardStore } from '../store/boardStore';
import { useBoardActions } from '../hooks/useBoardActions';
import type { Card as CardType } from '../types/events';
import { Column } from './Column';

interface Props {
  boardId: string;
}

/** Tính position mới khi chèn card vào vị trí index trong danh sách (đã loại card đang kéo). */
function positionAt(cards: CardType[], index: number): number {
  const prev = cards[index - 1];
  const next = cards[index];
  if (!prev && !next) return 1000;
  if (!prev) return next.position / 2;
  if (!next) return prev.position + 1000;
  return (prev.position + next.position) / 2;
}

export function Board({ boardId }: Props) {
  const columns = useBoardStore((s) => s.columns);
  const { createCard, updateCard, moveCard, deleteCard, renameColumn, setEditing } =
    useBoardActions(boardId);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragStart = (e: DragStartEvent) => {
    const card = useBoardStore.getState().findCard(e.active.id as string);
    setActiveCard(card ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const cols = useBoardStore.getState().columns;
    const sourceCol = cols.find((c) => c.cards.some((card) => card.id === activeId));
    if (!sourceCol) return;

    // Cột đích: thả lên 1 card → cột chứa card đó; thả lên vùng cột → cột đó.
    let targetCol = cols.find((c) => c.cards.some((card) => card.id === overId));
    let overCardId: string | null = overId;
    if (!targetCol) {
      targetCol = cols.find((c) => c.id === overId);
      overCardId = null; // thả vào vùng trống → cuối cột
    }
    if (!targetCol) return;

    // Danh sách card đích sau khi bỏ card đang kéo.
    const targetCards = targetCol.cards.filter((c) => c.id !== activeId);
    let insertIndex = targetCards.length;
    if (overCardId) {
      const idx = targetCards.findIndex((c) => c.id === overCardId);
      if (idx !== -1) insertIndex = idx;
    }

    // No-op: thả về đúng chỗ cũ.
    const current = sourceCol.cards.findIndex((c) => c.id === activeId);
    if (sourceCol.id === targetCol.id) {
      const origNoActive = sourceCol.cards.filter((c) => c.id !== activeId);
      const same = origNoActive[insertIndex]?.id === sourceCol.cards[current + 1]?.id;
      if (same && insertIndex === current) return;
    }

    const newPosition = positionAt(targetCards, insertIndex);
    moveCard(activeId, targetCol.id, newPosition);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full items-start gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            onAddCard={createCard}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onEditingChange={setEditing}
            onRenameColumn={renameColumn}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rounded-lg bg-white p-3 text-sm text-slate-800 shadow-lg ring-1 ring-slate-300">
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
