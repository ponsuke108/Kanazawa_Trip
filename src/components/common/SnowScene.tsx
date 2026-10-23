import { StateIcons } from '@/lib/icons';
import styles from './SnowScene.module.css';

// 背景：夕暮れの雪の茶屋街。空、両側の町家の格子、提灯の灯り、降り続ける雪（画面で唯一ずっと動くもの）。S-11 と S-12 で使う（7.7）
export function SnowScene() {
  const Flake = StateIcons.snow;
  return (
    <div className={styles.scene} aria-hidden="true">
      <span className={styles.machiyaLeft} />
      <span className={styles.machiyaRight} />
      <span className={styles.snow} />
      <Flake className={`${styles.flake} ${styles.flakeTop}`} size={56} strokeWidth={1.25} />
      <Flake className={`${styles.flake} ${styles.flakeBottom}`} size={44} strokeWidth={1.25} />
    </div>
  );
}
