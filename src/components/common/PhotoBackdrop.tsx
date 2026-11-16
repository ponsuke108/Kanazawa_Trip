import { SpotPhotos, spotPhotoSrcSet, spotPhotoUrl } from '@/constants/spotPhotos';
import styles from './PhotoBackdrop.module.css';

// 画面の背面いっぱいに出す名所の写真（S-12 ログイン。7.7、v23）。暗い下敷きを重ねて、上の文字を読みやすくする。
// 写真は K65 の、再利用が許された写真（public/spot-photos）。出典は PhotoBackdropCredit で画面の中に出す
const SCENE = { spotId: 7, name: 'ひがし茶屋街' };

export function PhotoBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      {/* 写真は画面いっぱいに切り出すので、縦長の画面では高さに合わせた大きさが要る */}
      <img
        src={spotPhotoUrl(SCENE.spotId) ?? ''}
        srcSet={spotPhotoSrcSet(SCENE.spotId)}
        sizes="(orientation: portrait) 150vh, 100vw"
        alt=""
        className={styles.photo}
      />
    </div>
  );
}

// 背面の写真の出典（作者、ライセンス、元のページへのリンク）
export function PhotoBackdropCredit() {
  const credit = SpotPhotos[SCENE.spotId];
  if (!credit) return null;
  return (
    <p className={styles.credit}>
      写真：{SCENE.name}（
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
        {credit.author}、Wikimedia Commons
      </a>
      {' / '}
      {credit.licenseUrl ? (
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      ）
    </p>
  );
}
