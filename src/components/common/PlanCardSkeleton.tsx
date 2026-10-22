import styles from './PlanCardSkeleton.module.css';

// 一覧の読み込み中に出す、カードの形の灰色の枠（6.1）
export function PlanCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.thumb} />
      <div className={styles.lines}>
        <div className={`${styles.line} ${styles.wide}`} />
        <div className={styles.line} />
        <div className={`${styles.line} ${styles.short}`} />
      </div>
    </div>
  );
}

export function PlanCardSkeletonList({ count }: { count: number }) {
  return (
    <div className={styles.list} role="status" aria-label="読み込み中">
      {Array.from({ length: count }, (_, i) => (
        <PlanCardSkeleton key={i} />
      ))}
    </div>
  );
}
