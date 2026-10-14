import { useState } from 'react';
import { TransportLabels } from '@/constants/messages';
import { buildDirectionsUrl } from '@/lib/mapsUrl';
import { BlockIcons, TransportIcons } from '@/lib/icons';
import type { MoveBlock, TransportMode } from '@/types/models';
import styles from './MoveConnector.module.css';

const MODES: TransportMode[] = ['walk', 'bus', 'bicycle', 'car'];

type Props = {
  block: MoveBlock;
  mode: 'view' | 'edit';
  onChange?: (mode: TransportMode) => void; // 編集モード：移動手段を変える
};

// 移動手段ブロック（7.5、BR-04、BR-16）：カードにしない。縦の点線と丸いラベル、「経路を見る」
export function MoveConnector({ block, mode, onChange }: Props) {
  const [choosing, setChoosing] = useState(false);
  const Icon = TransportIcons[block.mode];
  const Nav = BlockIcons.directions;
  const label = TransportLabels[block.mode];
  const url = buildDirectionsUrl(block.from, block.to, block.mode);

  return (
    <div className={styles.connector}>
      <div className={styles.row}>
        {mode === 'edit' ? (
          <button
            type="button"
            className={`${styles.pill} ${styles.pillButton}`}
            aria-expanded={choosing}
            aria-label={`移動手段：${label}。押すと変更できます`}
            onClick={() => setChoosing((v) => !v)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ) : (
          <span className={styles.pill}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </span>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.route}
          aria-label={`${block.from.name}から${block.to.name}までの経路を見る（Googleマップ）`}
        >
          <Nav size={16} aria-hidden="true" />
          経路を見る
        </a>
      </div>
      {mode === 'edit' && choosing && (
        <div className={styles.choices} role="group" aria-label="移動手段を選ぶ">
          {MODES.map((m) => {
            const ChoiceIcon = TransportIcons[m];
            return (
              <button
                key={m}
                type="button"
                className={`${styles.choice} ${m === block.mode ? styles.selected : ''}`}
                aria-pressed={m === block.mode}
                onClick={() => {
                  onChange?.(m);
                  setChoosing(false);
                }}
              >
                <ChoiceIcon size={20} aria-hidden="true" />
                {TransportLabels[m]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
