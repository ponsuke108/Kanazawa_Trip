import { useEffect, useMemo, useRef, useState } from 'react';
import { IconButton } from '@/components/common/IconButton';
import { LazyRouteMap } from '@/components/map/LazyMapView';
import { Messages } from '@/constants/messages';
import { RouteIcons } from '@/lib/icons';
import { formatKm, formatKmDiff, routeDistanceKm, toRouteStops } from '@/lib/route';
import type { Block, RouteStop } from '@/types/models';
import styles from './RoutePanel.module.css';

type Props = {
  blocks: Block[];
  onSelectStop: (stop: RouteStop) => void;
};

const OPEN_KEY = 'travel-note:route-map-open'; // 開け閉めはこの端末に覚える（6.4 S-06）
const DIFF_MS = 3000; // 差は3秒で消す（BR-22）

function readOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeOpen(open: boolean): void {
  try {
    globalThis.localStorage?.setItem(OPEN_KEY, String(open));
  } catch {
    // 覚えられない環境では、開いた状態から始める
  }
}

// スポットの並びが同じ顔ぶれの入れ替えか（足した・消したときは差を出さない）
function sameMembers(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

// S-06 の地図の部分（6.4、BR-22、K54）。初めは開き、画面の上に固定する。
// 左上に「直線 約N.Nkm」と、並べ替えた直後だけ差。右下に「i」と「地図を閉じる」
export function RoutePanel({ blocks, onSelectStop }: Props) {
  const [open, setOpen] = useState(readOpen);
  const [infoOpen, setInfoOpen] = useState(false);
  const [diff, setDiff] = useState<number | null>(null);

  const order = blocks.flatMap((b) => (b.type === 'spot' ? [b.spot.id] : []));
  const orderKey = order.join(',');
  const stops = useMemo(() => toRouteStops(blocks), [blocks]);
  const total = useMemo(() => routeDistanceKm(stops), [stops]);

  // 並べ替えたら、前の並びとの差を出す（差は直前の1回分だけ。3秒で消す）
  const prev = useRef<{ order: number[]; total: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    const now = orderKey === '' ? [] : orderKey.split(',').map(Number);
    if (
      before &&
      before.order.join(',') !== orderKey &&
      now.length >= 2 &&
      sameMembers(before.order, now)
    ) {
      const d = total - before.total;
      if (Math.abs(d) >= 0.05) {
        setDiff(d);
        const t = window.setTimeout(() => setDiff(null), DIFF_MS);
        prev.current = { order: now, total };
        return () => window.clearTimeout(t);
      }
    }
    prev.current = { order: now, total };
    return undefined;
  }, [orderKey, total]);

  const toggle = (v: boolean) => {
    setOpen(v);
    writeOpen(v);
  };

  const multiple = order.length >= 2; // スポットが1つなら合計は出さない（6.4 S-06）
  const label = multiple ? `直線 約${formatKm(total)}` : null;
  const Info = RouteIcons.info;
  const RouteIcon = RouteIcons.route;

  return (
    <div className={styles.route} data-open={open}>
      <section className={styles.panel} aria-label="経路順の地図">
        <LazyRouteMap stops={stops} onSelectStop={onSelectStop} />
        {label && (
          <p className={styles.distance} aria-live="polite">
            {label}
            {diff !== null && (
              <span className={diff < 0 ? styles.shorter : styles.longer}>
                {formatKmDiff(diff)}
              </span>
            )}
          </p>
        )}
        <div className={styles.tools}>
          <IconButton
            icon={Info}
            label="直線距離の説明"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          />
          <button type="button" className={styles.close} onClick={() => toggle(false)}>
            地図を閉じる
          </button>
        </div>
        {infoOpen && (
          <p className={styles.info} role="note">
            {Messages.straightDistanceDetail}
          </p>
        )}
      </section>
      <div className={styles.strip}>
        <span className={styles.stripLabel}>{label}</span>
        <button type="button" className={styles.openButton} onClick={() => toggle(true)}>
          <RouteIcon size={18} aria-hidden="true" />
          地図を開く
        </button>
      </div>
    </div>
  );
}
