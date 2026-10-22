import type { ReactNode } from 'react';
import type { LucideIcon } from '@/lib/icons';
import styles from './EmptyState.module.css';

type Props = { icon: LucideIcon; title: string; action?: ReactNode };

export function EmptyState({ icon: Icon, title, action }: Props) {
  return (
    <div className={styles.empty}>
      <span className={styles.badge}>
        <Icon size={28} aria-hidden="true" />
      </span>
      <p className={styles.title}>{title}</p>
      {action}
    </div>
  );
}
