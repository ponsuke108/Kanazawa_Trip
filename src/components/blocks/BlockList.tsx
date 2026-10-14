import { useState, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockControlProps } from '@/components/blocks/BlockControls';
import { CommentBlockCard } from '@/components/blocks/CommentBlockCard';
import { MoveConnector } from '@/components/blocks/MoveConnector';
import { SpotBlockCard } from '@/components/blocks/SpotBlockCard';
import { toDisplayBlocks } from '@/lib/blocks';
import { ActionIcons } from '@/lib/icons';
import type { Block, TransportMode } from '@/types/models';
import styles from './BlockList.module.css';
import handleStyles from './DragHandle.module.css';

export type BlockEditHandlers = {
  onMove: (from: number, to: number) => void; // blocks の中の位置で指定
  onRemove: (blockId: string) => void;
  onTransportChange: (targetBlockId: string, mode: TransportMode) => void;
  onCommentChange: (blockId: string, body: string) => void;
  focusBlockId?: string | null; // 追加した直後のコメントにカーソルを置く
};

type Props =
  { blocks: Block[]; mode: 'view' } | ({ blocks: Block[]; mode: 'edit' } & BlockEditHandlers);

// ブロック一覧（7.5、7.6）。状態は持たず、操作は引数の関数で親に知らせる
export function BlockList(props: Props) {
  if (props.mode === 'view') {
    return (
      <ol className={styles.list}>
        {toDisplayBlocks(props.blocks).map((b) => (
          <li key={b.type === 'move' ? b.key : b.id}>
            {b.type === 'move' && <MoveConnector block={b} mode="view" />}
            {b.type === 'spot' && <SpotBlockCard block={b} mode="view" />}
            {b.type === 'comment' && <CommentBlockCard block={b} mode="view" />}
          </li>
        ))}
      </ol>
    );
  }
  return <EditableBlockList {...props} />;
}

function EditableBlockList({
  blocks,
  onMove,
  onRemove,
  onTransportChange,
  onCommentChange,
  focusBlockId,
}: { blocks: Block[] } & BlockEditHandlers) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // スマホは長押し（250ミリ秒、5px まで動いてもよい）してからドラッグ（15章、T3）
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const indexOf = (id: string) => blocks.findIndex((b) => b.id === id);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over || e.active.id === e.over.id) return;
    onMove(indexOf(String(e.active.id)), indexOf(String(e.over.id)));
  };

  const controlsFor = (id: string): Omit<BlockControlProps, 'dragHandle'> => {
    const i = indexOf(id);
    return {
      canMoveUp: i > 0,
      canMoveDown: i < blocks.length - 1,
      onMoveUp: () => onMove(i, i - 1),
      onMoveDown: () => onMove(i, i + 1),
      onRemove: () => onRemove(id),
    };
  };

  // ドラッグ中は移動手段ブロックを出さない（並べ替えた後に BR-04 で付け直す）
  const display = activeId ? blocks : toDisplayBlocks(blocks);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ol className={`${styles.list} ${activeId ? styles.dragging : ''}`}>
          {display.map((b) => {
            if (b.type === 'move') {
              return (
                <li key={b.key}>
                  <MoveConnector
                    block={b}
                    mode="edit"
                    onChange={(m) => onTransportChange(b.targetBlockId, m)}
                  />
                </li>
              );
            }
            return (
              <SortableItem key={b.id} id={b.id}>
                {(dragHandle) =>
                  b.type === 'spot' ? (
                    <SpotBlockCard
                      block={b}
                      mode="edit"
                      controls={{ ...controlsFor(b.id), dragHandle }}
                    />
                  ) : (
                    <CommentBlockCard
                      block={b}
                      mode="edit"
                      controls={{ ...controlsFor(b.id), dragHandle }}
                      onChange={(body) => onCommentChange(b.id, body)}
                      autoFocus={focusBlockId === b.id}
                    />
                  )
                }
              </SortableItem>
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const Grip = ActionIcons.dragHandle;
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={handleStyles.handle}
      {...attributes}
      {...listeners}
      aria-label="長押しして並べ替え"
    >
      <Grip size={20} aria-hidden="true" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      id={`block-${id}`}
      className={`${styles.item} ${isDragging ? styles.active : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </li>
  );
}
