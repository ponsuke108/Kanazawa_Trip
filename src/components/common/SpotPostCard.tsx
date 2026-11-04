import type { ReactNode } from 'react';
import { UiMessages } from '@/constants/messages';
import { formatDate } from '@/lib/format';
import { ShopIcons } from '@/lib/icons';
import type { SpotPost } from '@/types/models';
import styles from './SpotPostCard.module.css';

type Props = {
  post: SpotPost;
  menu?: ReactNode; // 右上のメニュー（本人の投稿、管理者の画面）
  showSpotName?: boolean; // スポット名を出す（スポット詳細の外で使うとき）
};

// スポットの投稿（7.6、BR-21）：投稿した人、日付、写真（横に並べる）、ひとこと。
// キャンペーンで投稿したものには「キャンペーン参加」、非表示にされたものにはその表示
export function SpotPostCard({ post, menu, showSpotName = false }: Props) {
  const Ticket = ShopIcons.campaign;
  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.meta}>
          {showSpotName && <span className={styles.spot}>{post.spot.name}</span>}
          <span className={styles.author}>{post.author.displayName}さん</span>
          <time className={styles.date} dateTime={post.createdAt}>
            {formatDate(post.createdAt)}
          </time>
        </div>
        {menu && <div className={styles.menu}>{menu}</div>}
      </header>
      {(post.isCampaign || post.isHidden) && (
        <div className={styles.labels}>
          {post.isCampaign && (
            <span className={styles.campaign}>
              <Ticket size={14} aria-hidden="true" />
              {UiMessages.campaignJoined}
            </span>
          )}
          {post.isHidden && <span className={styles.hidden}>{UiMessages.postHidden}</span>}
        </div>
      )}
      {post.imageUrls.length > 0 && (
        <ul className={styles.photos}>
          {post.imageUrls.map((url, i) => (
            <li key={url}>
              <img
                src={url}
                alt={`${post.spot.name}の写真（${i + 1}枚目）`}
                loading="lazy"
                className={styles.photo}
              />
            </li>
          ))}
        </ul>
      )}
      <p className={styles.body}>{post.body}</p>
    </article>
  );
}
