import { BlockControls, type BlockControlProps } from '@/components/blocks/BlockControls';
import { BlockIcons } from '@/lib/icons';
import type { SpotBlock } from '@/types/models';
import styles from './SpotBlockCard.module.css';

type Props = {
  block: SpotBlock;
  mode: 'view' | 'edit';
  controls?: BlockControlProps; // 編集モードのとき
};

// スポットブロック（7.5）：通常のカード、MapPin のバッジとスポット名、写真はカード下部
export function SpotBlockCard({ block, mode, controls }: Props) {
  const Pin = BlockIcons.spot;
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.kind}>
          <span className={styles.badge}>
            <Pin size={16} aria-hidden="true" />
          </span>
          スポット
        </span>
        {mode === 'edit' && controls && <BlockControls {...controls} />}
      </div>
      <p className={styles.name}>{block.spot.name}</p>
      {block.imageUrl && (
        <img
          src={block.imageUrl}
          alt={`${block.spot.name}の写真`}
          loading="lazy"
          className={styles.photo}
        />
      )}
    </div>
  );
}
