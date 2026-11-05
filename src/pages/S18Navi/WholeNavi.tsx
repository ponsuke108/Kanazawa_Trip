import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { NaviMessages, TransportLabels } from '@/constants/messages';
import { BlockIcons, MapIcons, TransportIcons } from '@/lib/icons';
import {
  buildDirectionsUrl,
  buildWholeRouteUrls,
  splitWholeRoute,
  WHOLE_ROUTE_MODES,
  type WholeRouteMode,
} from '@/lib/mapsUrl';
import { toDisplayBlocks } from '@/lib/blocks';
import type { Block, DisplayBlock, MoveBlock, Spot } from '@/types/models';
import styles from './WholeNavi.module.css';

type Props = {
  blocks: Block[];
};

type Origin = 'first' | 'current';

type NaviRow =
  | { kind: 'segment'; key: string; block: MoveBlock; fromNumber: number }
  | { kind: 'comment'; key: string; body: string };

// 区間ごとの行：スポットに番号を振りながら、区間とコメントを順に並べる
function toNaviRows(blocks: DisplayBlock[]): NaviRow[] {
  const rows: NaviRow[] = [];
  let spotNumber = 0;
  for (const b of blocks) {
    if (b.type === 'spot') spotNumber += 1;
    else if (b.type === 'comment') rows.push({ kind: 'comment', key: b.id, body: b.body });
    else rows.push({ kind: 'segment', key: b.key, block: b, fromNumber: spotNumber });
  }
  return rows;
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

// 全体のナビ（6.4 S-18、BR-23）：全体を1本で開く と 区間ごと。S-24 でも使う
export function WholeNavi({ blocks }: Props) {
  const [mode, setMode] = useState<WholeRouteMode>('walk');
  const [origin, setOrigin] = useState<Origin>('first');
  const spots: Spot[] = blocks.flatMap((b) => (b.type === 'spot' ? [b.spot] : []));
  const fromCurrent = origin === 'current';
  // 経由地が9か所を超えるときは、分けた URL を順に並べる（BR-23、10.8）
  const urls = buildWholeRouteUrls(spots, mode, fromCurrent);
  const ranges = splitWholeRoute(spots.length, fromCurrent);

  if (spots.length < 2) {
    return <p className={styles.notice}>{NaviMessages.needTwoSpots}</p>;
  }

  const rows = toNaviRows(toDisplayBlocks(blocks)).map((row) => {
    if (row.kind === 'comment') {
      return (
        <li key={row.key} className={styles.comment}>
          {row.body}
        </li>
      );
    }
    const { block: b, fromNumber } = row;
    const Icon = TransportIcons[b.mode];
    const Nav = BlockIcons.directions;
    return (
      <li key={row.key} className={styles.segment}>
        <div className={styles.segmentBody}>
          <p className={styles.segmentName}>
            {fromNumber} {b.from.name} → {fromNumber + 1} {b.to.name}
          </p>
          <span className={styles.mode}>
            <Icon size={16} aria-hidden="true" />
            {TransportLabels[b.mode]}
          </span>
        </div>
        {/* 区間の URL は移動手段ブロックの「経路を見る」と同じ（10.8） */}
        <a
          href={buildDirectionsUrl(b.from, b.to, b.mode)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.open}
          aria-label={`${b.from.name}から${b.to.name}までの経路を開く（Googleマップ）`}
        >
          <Nav size={16} aria-hidden="true" />
          開く
        </a>
      </li>
    );
  });

  return (
    <div className={styles.navi}>
      <section className={styles.section} aria-labelledby="whole-navi-title">
        <h2 id="whole-navi-title" className={styles.heading}>
          全体を1本で開く
        </h2>
        <div className={styles.field}>
          <span className={styles.label}>移動手段</span>
          <SegmentedControl
            label="移動手段"
            options={WHOLE_ROUTE_MODES.map((m) => ({ value: m, label: TransportLabels[m] }))}
            value={mode}
            onChange={setMode}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>出発地</span>
          <SegmentedControl
            label="出発地"
            options={[
              { value: 'first', label: '最初のスポットから' },
              { value: 'current', label: '現在地から' },
            ]}
            value={origin}
            onChange={setOrigin}
          />
        </div>
        <div className={styles.buttons}>
          {urls.map((url, i) => {
            const range = ranges[i];
            return (
              <Button key={url} icon={MapIcons.map} fullWidth onClick={() => openUrl(url)}>
                {urls.length === 1 || !range
                  ? NaviMessages.openWhole
                  : NaviMessages.openRange(range.from, range.to)}
              </Button>
            );
          })}
        </div>
        <ul className={styles.notes}>
          <li>{NaviMessages.appNotice}</li>
          <li>{NaviMessages.busNotice}</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="segment-navi-title">
        <h2 id="segment-navi-title" className={styles.heading}>
          区間ごと
        </h2>
        <ol className={styles.segments}>{rows}</ol>
      </section>
    </div>
  );
}
