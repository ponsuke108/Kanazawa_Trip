import type { ReactNode } from 'react';
import { formatPeriod } from '@/lib/format';
import { ShopIcons } from '@/lib/icons';
import type { Campaign } from '@/types/models';
import styles from './CampaignPanel.module.css';

type Props = {
  campaign: Campaign;
  children?: ReactNode; // 画面ごとの添え書き（S-05 の受け方、S-17 の特典の説明など）
};

// キャンペーンの表示（7.6、BR-27）：画像、お店、題名、特典の内容、お知らせ文、説明、期間。S-05、S-17、S-22 で使う
export function CampaignPanel({ campaign, children }: Props) {
  const Ticket = ShopIcons.campaign;
  return (
    <section className={styles.panel} aria-label={`キャンペーン：${campaign.title}`}>
      {campaign.imageUrl && (
        <img src={campaign.imageUrl} alt="" loading="lazy" className={styles.image} />
      )}
      <div className={styles.body}>
        <p className={styles.kind}>
          <span className={styles.badge}>
            <Ticket size={16} aria-hidden="true" />
          </span>
          キャンペーン{campaign.shopName && `・${campaign.shopName}`}
        </p>
        <h3 className={styles.title}>{campaign.title}</h3>
        <p className={styles.benefit}>{campaign.benefit}</p>
        {campaign.notice && <p className={styles.text}>{campaign.notice}</p>}
        {campaign.description && <p className={styles.sub}>{campaign.description}</p>}
        <p className={styles.sub}>期間：{formatPeriod(campaign.startsOn, campaign.endsOn)}</p>
        {children}
      </div>
    </section>
  );
}
