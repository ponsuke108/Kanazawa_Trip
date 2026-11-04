import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getSpotPosts } from '@/api/spotPosts';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { isDemoSpot, SpotTypeLabels } from '@/constants/spots';
import { ActionIcons, PostIcons } from '@/lib/icons';
import type { Spot } from '@/types/models';
import styles from './SpotSheet.module.css';

type Props = {
  spot: Spot;
  onClose: () => void;
};

const MAX_PHOTOS = 5; // 6.4 S-13：投稿の写真は最大5枚を横に並べる

// S-13 のピンのシート（6.4、7.6）：スポット名、種類のラベル、紹介文か住所、投稿の写真、
// 「詳細」→ S-05、「ここに投稿」→ S-17。「リストに追加」は I-31 で足す
export function SpotSheet({ spot, onClose }: Props) {
  const navigate = useNavigate();
  const posts = useQuery({
    queryKey: [...queryKeys.spot.posts(spot.id), 'sheet'],
    queryFn: () => getSpotPosts({ spotId: spot.id, page: 0 }),
  });
  const photos = (posts.data?.items ?? []).flatMap((p) => p.imageUrls).slice(0, MAX_PHOTOS);
  const sub = spot.description ?? spot.address;

  return (
    <section className={styles.sheet} aria-label={`${spot.name}の情報`}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.name}>{spot.name}</h2>
          <span className={styles.label}>{SpotTypeLabels[spot.spotType]}</span>
          {isDemoSpot(spot.id) && <span className={styles.label}>デモ</span>}
        </div>
        <IconButton icon={ActionIcons.close} label="閉じる" onClick={onClose} />
      </header>
      {sub && <p className={styles.sub}>{sub}</p>}
      {photos.length > 0 ? (
        <ul className={styles.photos}>
          {photos.map((url, i) => (
            <li key={url}>
              <img
                src={url}
                alt={`${spot.name}の写真（${i + 1}枚目）`}
                className={styles.photo}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      ) : spot.latestImageUrl ? (
        // 投稿がまだなく、チームの写真だけがあるスポット（K50）
        <img src={spot.latestImageUrl} alt={`${spot.name}の写真`} className={styles.photo} />
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => navigate(`/spots/${spot.id}`)}>
          詳細
        </Button>
        <Button
          icon={PostIcons.post}
          disabled={!spot.isActive}
          onClick={() => navigate(`/posts/new?spot=${spot.id}`)}
        >
          ここに投稿
        </Button>
      </div>
    </section>
  );
}
