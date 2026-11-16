import styles from './Logo.module.css';

type Props = {
  size: 'lg' | 'sm';
  seal?: boolean; // 左に落款（臙脂の四角に「金沢」）を付ける。S-12 の縦書きの題字では付けない
  tone?: 'default' | 'onBrand'; // 臙脂の地の上（フッター）では白い文字にする
};

// サイトのロゴ（K23、v23）。落款と明朝のサイト名。ロゴ画像ができたら、この部品の中身だけを差し替える（P-05）
export function Logo({ size, seal = false, tone = 'default' }: Props) {
  if (!seal) return <span className={`${styles.logo} ${styles[size]}`}>旅ノート金沢</span>;
  return (
    <span className={`${styles.mark} ${styles[size]} ${tone === 'onBrand' ? styles.onBrand : ''}`}>
      <span className={styles.seal} aria-hidden="true">
        金沢
      </span>
      <span className={styles.words}>
        <span className={styles.logo}>旅ノート金沢</span>
        <span className={styles.latin} aria-hidden="true">
          KANAZAWA TABI NOTE
        </span>
      </span>
    </span>
  );
}
