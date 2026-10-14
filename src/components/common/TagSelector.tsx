import { TagChip } from '@/components/common/TagChip';
import type { Tag } from '@/types/models';
import styles from './TagSelector.module.css';

type Props = {
  tags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

const GROUPS: Array<{ group: Tag['group']; label: string }> = [
  { group: 'theme', label: 'テーマ' },
  { group: 'weather', label: '天気' },
];

export function TagSelector({ tags, selectedIds, onChange }: Props) {
  const toggle = (tag: Tag) => {
    const next = selectedIds.includes(tag.id)
      ? selectedIds.filter((id) => id !== tag.id)
      : [...selectedIds, tag.id];
    onChange(next.sort((a, b) => a - b));
  };
  return (
    <div className={styles.selector}>
      {GROUPS.map(({ group, label }) => {
        const items = tags.filter((t) => t.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className={styles.group} aria-label={label}>
            <h2 className={styles.heading}>{label}</h2>
            <div className={styles.chips}>
              {items.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  selected={selectedIds.includes(tag.id)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
