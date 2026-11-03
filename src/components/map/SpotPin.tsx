import { useState } from 'react';
import type { MapSpot } from '@/components/map/types';
import { ShopIcons } from '@/lib/icons';
import styles from './SpotPin.module.css';

type PinProps = {
  spot: MapSpot;
  selected: boolean;
  onClick?: () => void;
};

// 写真のピン（BR-24、K38）：写真を丸く切り抜き、縁の色で種類を分ける（定番以外は藍、定番は灰、起点は墨）。
// 写真がない、または読み込めないときは縁の色だけの丸。キャンペーン中なら右上に札（Ticket）
export function SpotPin({ spot, selected, onClick }: PinProps) {
  const Ticket = ShopIcons.campaign;
  return (
    <button
      type="button"
      className={`${styles.pin} ${selected ? styles.selected : ''}`}
      data-type={spot.spotType}
      onClick={onClick}
      aria-label={spot.hasActiveCampaign ? `${spot.name}（キャンペーン中）` : spot.name}
      aria-pressed={selected}
    >
      <PinFace url={spot.latestImageUrl ?? null} />
      {spot.hasActiveCampaign && (
        <span className={styles.ticket} aria-hidden="true">
          <Ticket size={12} />
        </span>
      )}
    </button>
  );
}

type ClusterProps = {
  spot: MapSpot | undefined; // 代表のスポット
  count: number;
  onClick: () => void;
};

// 写真の束（BR-24）：代表の写真と「+N」。押すとその範囲を拡大する
export function ClusterPin({ spot, count, onClick }: ClusterProps) {
  return (
    <button
      type="button"
      className={`${styles.pin} ${styles.cluster}`}
      data-type={spot?.spotType ?? 'minor'}
      onClick={onClick}
      aria-label={`${count}か所のスポット。押すと拡大します`}
    >
      <PinFace url={spot?.latestImageUrl ?? null} />
      <span className={styles.count} aria-hidden="true">
        +{count - 1}
      </span>
    </button>
  );
}

// 丸の中身。写真の読み込みに失敗したら、縁の色だけの丸にする（BR-24）
function PinFace({ url }: { url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return <span className={styles.dot} />;
  return (
    <img
      className={styles.photo}
      src={url}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailedUrl(url)}
    />
  );
}
