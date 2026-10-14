import { useEffect, useRef } from 'react';
import { BlockControls, type BlockControlProps } from '@/components/blocks/BlockControls';
import { BlockIcons } from '@/lib/icons';
import { charLength, MAX_COMMENT } from '@/lib/blocks';
import type { CommentBlock } from '@/types/models';
import styles from './CommentBlockCard.module.css';

type Props = {
  block: CommentBlock;
  mode: 'view' | 'edit';
  controls?: BlockControlProps;
  onChange?: (body: string) => void;
  autoFocus?: boolean; // 追加した直後は入力欄にカーソルを置く（6.4 S-06）
};

// コメントブロック（7.5）：枠線なしで背景が薄い色のカード
export function CommentBlockCard({ block, mode, controls, onChange, autoFocus = false }: Props) {
  const Icon = BlockIcons.comment;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [autoFocus]);

  if (mode === 'view') {
    return (
      <div className={styles.card}>
        <Icon size={20} aria-hidden="true" className={styles.icon} />
        <p className={styles.body}>{block.body}</p>
      </div>
    );
  }

  const length = charLength(block.body);
  return (
    <div className={`${styles.card} ${styles.edit}`}>
      <div className={styles.top}>
        <span className={styles.kind}>
          <Icon size={20} aria-hidden="true" className={styles.icon} />
          コメント
        </span>
        {controls && <BlockControls {...controls} />}
      </div>
      <textarea
        ref={ref}
        className={styles.input}
        value={block.body}
        onChange={(e) => onChange?.(e.target.value)}
        rows={3}
        placeholder="感想、おすすめ、注意点、食事や休憩の予定など"
        aria-label="コメント"
      />
      <span className={`${styles.counter} ${length > MAX_COMMENT ? styles.over : ''}`}>
        {length}/{MAX_COMMENT}
      </span>
    </div>
  );
}
