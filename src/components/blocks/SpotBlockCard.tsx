import { BlockControls, type BlockControlProps } from '@/components/blocks/BlockControls';
import { UiMessages } from '@/constants/messages';
import { BlockIcons, ShopIcons } from '@/lib/icons';
import type { SpotBlock } from '@/types/models';
import styles from './SpotBlockCard.module.css';

type Props = {
  block: SpotBlock;
  mode: 'view' | 'edit';
  number?: number; // （v18）スポットだけを数えた順番。経路順の地図のピンの番号と同じ（BR-22）
  controls?: BlockControlProps; // 編集モードのとき
};

// スポットブロック（7.5）：通常のカード、番号の札（番号がなければ MapPin のバッジ）とスポット名、写真はカード下部
export function SpotBlockCard({ block, mode, number, controls }: Props) {
  const Pin = BlockIcons.spot;
  const Ticket = ShopIcons.campaign;
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.kind}>
          {number === undefined ? (
            <span className={styles.badge}>
              <Pin size={16} aria-hidden="true" />
            </span>
          ) : (
            <span className={styles.number} aria-hidden="true">
              {number}
            </span>
          )}
          {number === undefined ? 'スポット' : `スポット ${number}`}
        </span>
        {mode === 'edit' && controls && <BlockControls {...controls} />}
      </div>
      <p className={styles.name}>{block.spot.name}</p>
      {/* （v11）キャンペーン中のお店（K47、BR-27） */}
      {block.spot.hasActiveCampaign && (
        <span className={styles.campaign}>
          <Ticket size={14} aria-hidden="true" />
          {UiMessages.campaignActive}
        </span>
      )}
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
