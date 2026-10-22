import { renderTagIcon } from '@/lib/icons';
import type { Tag } from '@/types/models';
import styles from './TagChip.module.css';

type Props = {
  tag: Tag;
  selected?: boolean;
  onToggle?: (tag: Tag) => void; // ないときは押せないチップ
};

export function TagChip({ tag, selected = false, onToggle }: Props) {
  const content = (
    <>
      {renderTagIcon(tag.slug, { size: 16, 'aria-hidden': true })}
      {tag.name}
    </>
  );
  if (!onToggle) {
    return <span className={`${styles.chip} ${styles.static}`}>{content}</span>;
  }
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.toggle} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
      onClick={() => onToggle(tag)}
    >
      {content}
    </button>
  );
}
