import type { ReactNode } from 'react';
import { IconButton } from '@/components/common/IconButton';
import { ActionIcons } from '@/lib/icons';
import styles from './BlockControls.module.css';

export type BlockControlProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  dragHandle?: ReactNode; // 並べ替えのつまみ（BlockList が作る）
};

// 編集モードの右上の操作：並べ替えのつまみ、上へ・下へ、削除（7.5）
export function BlockControls({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  dragHandle,
}: BlockControlProps) {
  return (
    <div className={styles.controls}>
      {dragHandle}
      <IconButton icon={ActionIcons.moveUp} label="上へ" onClick={onMoveUp} disabled={!canMoveUp} />
      <IconButton
        icon={ActionIcons.moveDown}
        label="下へ"
        onClick={onMoveDown}
        disabled={!canMoveDown}
      />
      <IconButton icon={ActionIcons.delete} label="削除" onClick={onRemove} />
    </div>
  );
}
