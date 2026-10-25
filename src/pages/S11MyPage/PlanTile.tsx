import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { StatusLabel } from '@/components/common/StatusLabel';
import { formatTitle } from '@/lib/format';
import type { PlanSummary } from '@/types/models';
import styles from './PlanTile.module.css';

type Props = {
  plan: PlanSummary;
  to: string;
  size: 'large' | 'small';
  status?: boolean; // 「下書き」「公開中」の札（自分のプラン）
  action?: ReactNode; // 右上のメニュー、またはいいねの取り消し
};

// S-11 の写真のカード（7.7）。写真がまだないプランは、最初のスポット名を入れた夕暮れ色の札にする
export function PlanTile({ plan, to, size, status = false, action }: Props) {
  const first = plan.spotNames[0] ?? '';
  return (
    <article className={`${styles.tile} ${size === 'large' ? styles.large : ''}`}>
      <Link to={to} className={styles.link}>
        <span className={styles.photo} data-photo-slot>
          {plan.coverImageUrl ? (
            <img src={plan.coverImageUrl} alt="" loading="lazy" />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              {first}
            </span>
          )}
        </span>
        <span className={styles.caption}>
          <span className={styles.title}>{formatTitle(plan.title)}</span>
          <span className={styles.meta}>
            スポット{plan.spotCount}か所・いいね{plan.likeCount}
          </span>
        </span>
      </Link>
      {/* 「公開中」「下書き」は共通部品のラベル（7.6 StatusLabel） */}
      {status && (
        <span className={styles.status}>
          <StatusLabel status={plan.status} />
        </span>
      )}
      {action && <span className={styles.action}>{action}</span>}
    </article>
  );
}
