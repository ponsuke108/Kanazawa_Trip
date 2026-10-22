import { StatusLabel } from '@/components/common/StatusLabel';
import { TagChip } from '@/components/common/TagChip';
import { formatAuthor, formatDate, formatTitle } from '@/lib/format';
import type { PlanDetail } from '@/types/models';
import styles from './PlanHeading.module.css';

// タイトル、作成者、公開日、タグ（S-04 と S-09 のプレビューで使う）
export function PlanHeading({
  plan,
}: {
  plan: Pick<PlanDetail, 'title' | 'status' | 'author' | 'publishedAt' | 'tags'>;
}) {
  return (
    <div className={styles.heading}>
      {plan.status === 'draft' && (
        <div>
          <StatusLabel status="draft" />
        </div>
      )}
      <h2 className={styles.title}>{formatTitle(plan.title)}</h2>
      <p className={styles.meta}>
        {formatAuthor(plan.author.displayName)}
        {plan.publishedAt && <span>{formatDate(plan.publishedAt)}</span>}
      </p>
      {plan.tags.length > 0 && (
        <div className={styles.tags}>
          {plan.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      )}
    </div>
  );
}
