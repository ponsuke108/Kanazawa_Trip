import styles from './Logo.module.css';

type Props = { size: 'lg' | 'sm' };

// 仮ロゴ（K23）。ロゴ画像ができたら、この部品の中身だけを差し替える（P-05）
export function Logo({ size }: Props) {
  return <span className={`${styles.logo} ${styles[size]}`}>旅ノート金沢</span>;
}
