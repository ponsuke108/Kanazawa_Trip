import styles from './TeaHero.module.css';

// （v18）S-14 の上の絵：大樋焼の茶碗にお抹茶と金箔、湯気（7.9）。
// 画像は使わず CSS だけで描く。影、グラデーション、ぼかしは使わない（7.1）
export function TeaHero() {
  return (
    <div className={styles.hero}>
      <div className={styles.stage} aria-hidden="true">
        <span className={`${styles.steam} ${styles.steam1}`} />
        <span className={`${styles.steam} ${styles.steam2}`} />
        <span className={`${styles.steam} ${styles.steam3}`} />
        <span className={styles.foot} />
        <span className={styles.bowl}>
          <span className={`${styles.drip} ${styles.drip1}`} />
          <span className={`${styles.drip} ${styles.drip2}`} />
          <span className={`${styles.drip} ${styles.drip3}`} />
        </span>
        <span className={styles.rim}>
          <span className={styles.tea} />
          <span className={styles.foam} />
          <span className={`${styles.leaf} ${styles.leaf1}`} />
          <span className={`${styles.leaf} ${styles.leaf2}`} />
          <span className={`${styles.leaf} ${styles.leaf3}`} />
        </span>
      </div>
      <p className={styles.copy}>
        <span>一服して、</span>
        <span>旅の段取りを。</span>
      </p>
    </div>
  );
}
