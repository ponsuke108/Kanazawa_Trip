import styles from './TeaScene.module.css';

export type TeaState = 'brewing' | 'done';

const LABEL: Record<TeaState, string> = {
  brewing: 'お茶を点てています',
  done: 'お待たせしました',
};

// ログイン・登録のあいだに出す、お抹茶を一服点てる絵（7.7、I-23）。画像は使わず CSS だけで描く
export function TeaScene({ state }: { state: TeaState }) {
  return (
    <div className={`${styles.overlay} ${styles[state]}`}>
      <div className={styles.stage} aria-hidden="true">
        <span className={`${styles.steam} ${styles.steam1}`} />
        <span className={`${styles.steam} ${styles.steam2}`} />
        <span className={`${styles.steam} ${styles.steam3}`} />
        <span className={styles.chasen}>
          <span className={styles.handle} />
          <span className={styles.tines} />
        </span>
        <span className={styles.foot} />
        <span className={styles.bowl} />
        <span className={styles.rim}>
          <span className={styles.tea} />
          <span className={styles.foam} />
        </span>
      </div>
      <p className={styles.label} role="status">
        {LABEL[state]}
      </p>
    </div>
  );
}
