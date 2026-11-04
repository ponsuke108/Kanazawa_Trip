import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { UiMessages } from '@/constants/messages';
import type { SpotPost } from '@/types/models';
import styles from './PlanTile.module.css';

type Props = {
  post: SpotPost;
  size: 'large' | 'small';
  action?: ReactNode; // 右上のメニュー
};

// S-11 の「自分の投稿」の写真のカード（6.4、7.7）。PlanTile と同じ形。
// 写真は投稿の1枚目、下敷きにスポット名とひとことの1行目
export function PostTile({ post, size, action }: Props) {
  const firstLine = post.body.split('\n')[0] ?? '';
  const cover = post.imageUrls[0];
  return (
    <article className={`${styles.tile} ${size === 'large' ? styles.large : ''}`}>
      <Link to={`/spots/${post.spot.id}`} className={styles.link}>
        <span className={styles.photo}>
          {cover ? (
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              {post.spot.name}
            </span>
          )}
        </span>
        <span className={styles.caption}>
          <span className={styles.title}>{post.spot.name}</span>
          <span className={styles.meta}>{firstLine}</span>
        </span>
      </Link>
      {/* 非表示にされた投稿（BR-21、BR-29） */}
      {post.isHidden && (
        <span className={styles.status}>
          <span className={styles.hiddenLabel}>{UiMessages.postHidden}</span>
        </span>
      )}
      {action && <span className={styles.action}>{action}</span>}
    </article>
  );
}
