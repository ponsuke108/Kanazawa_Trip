import { spotPhotoCredit } from '@/constants/spotPhotos';
import styles from './SpotPhotoCredit.module.css';

type Props = {
  spot: { id: number; latestImageUrl: string | null };
};

// （K65）出典つきの写真を出しているときの作者、ライセンス、元のページ。投稿の写真では何も出さない
export function SpotPhotoCredit({ spot }: Props) {
  const credit = spotPhotoCredit(spot);
  if (!credit) return null;
  return (
    <p className={styles.credit}>
      {credit.note && <>{credit.note}。</>}
      写真：
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
        {credit.author}（Wikimedia Commons）
      </a>
      {' / '}
      {credit.licenseUrl ? (
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      {' / '}縮小して使用
    </p>
  );
}
