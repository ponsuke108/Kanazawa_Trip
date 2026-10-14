import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getTags } from '@/api/tags';
import { StatusLabel } from '@/components/common/StatusLabel';
import { TagChip } from '@/components/common/TagChip';
import { formatAuthor, formatRoute, formatTitle } from '@/lib/format';
import { ActionIcons, PlanIcons, StateIcons } from '@/lib/icons';
import type { PlanSummary } from '@/types/models';
import styles from './PlanCard.module.css';

type Props = {
  plan: PlanSummary;
  rank?: number; // 順位（BR-11）
  showStatus?: boolean; // 「公開中」「下書き」のラベル（S-11）
  menu?: ReactNode; // 右上のメニュー（S-11 の自分のプラン）
  trailing?: ReactNode; // 右上のボタン（S-11 のいいね取り消し）
  to?: string; // 押したときの移動先。省略時はプラン詳細
};

const MAX_TAGS = 3;

// 7.6：写真、タイトル、ルートの要約、作成者、いいね数、タグ（最大3つ）、定番以外を含むラベル
export function PlanCard({ plan, rank, showStatus = false, menu, trailing, to }: Props) {
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
  });
  const planTags = plan.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t) => t !== undefined)
    .slice(0, MAX_TAGS);
  const NoImage = StateIcons.noImage;
  const Like = ActionIcons.like;
  const Minor = PlanIcons.hasMinorSpot;
  const hasActions = Boolean(menu || trailing);

  return (
    <article className={styles.card}>
      <Link to={to ?? `/plans/${plan.id}`} className={styles.link}>
        <div className={styles.thumb}>
          {plan.coverImageUrl ? (
            <img src={plan.coverImageUrl} alt="" loading="lazy" className={styles.image} />
          ) : (
            <NoImage size={24} aria-hidden="true" />
          )}
          {rank !== undefined && (
            <span className={styles.rank} aria-label={`${rank}位`}>
              {rank}
            </span>
          )}
        </div>
        <div className={`${styles.body} ${hasActions ? styles.bodyWithActions : ''}`}>
          {showStatus && (
            <div>
              <StatusLabel status={plan.status} />
            </div>
          )}
          <h3 className={styles.title}>{formatTitle(plan.title)}</h3>
          {plan.spotNames.length > 0 && (
            <p className={styles.route}>{formatRoute(plan.spotNames)}</p>
          )}
          <p className={styles.meta}>
            <span className={styles.author}>{formatAuthor(plan.authorName)}</span>
            <span className={styles.likes}>
              <Like size={14} aria-hidden="true" />
              <span aria-label={`いいね ${plan.likeCount}`}>{plan.likeCount}</span>
            </span>
          </p>
          {(planTags.length > 0 || plan.hasMinorSpot) && (
            <div className={styles.tags}>
              {plan.hasMinorSpot && (
                <span className={styles.minor}>
                  <Minor size={14} aria-hidden="true" />
                  定番以外を含む
                </span>
              )}
              {planTags.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
          )}
        </div>
      </Link>
      {hasActions && (
        <div className={styles.actions}>
          {trailing}
          {menu}
        </div>
      )}
    </article>
  );
}
