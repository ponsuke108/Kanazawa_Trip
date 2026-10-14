import { StatusIcons } from '@/lib/icons';
import type { PlanStatus } from '@/types/models';
import styles from './StatusLabel.module.css';

const LABELS: Record<PlanStatus, string> = { published: '公開中', draft: '下書き' };

export function StatusLabel({ status }: { status: PlanStatus }) {
  const Icon = StatusIcons[status];
  return (
    <span className={`${styles.label} ${styles[status]}`}>
      <Icon size={14} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
