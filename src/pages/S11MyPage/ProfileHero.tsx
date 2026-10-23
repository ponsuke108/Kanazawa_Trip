import styles from './ProfileHero.module.css';

type Stat = { label: string; value: number | null }; // null は読み込み中

type Props = {
  displayName: string;
  stats: Stat[];
};

const STATIONS = 4; // 路線の駅の数（飾り）

// S-11 の上部：名前と旅の記録。下端の路線を、旅人の点が駅から駅へ進み続ける
export function ProfileHero({ displayName, stats }: Props) {
  return (
    <section className={styles.hero} aria-labelledby="mypage-name">
      <p className={styles.eyebrow}>わたしの旅ノート</p>
      <h1 id="mypage-name" className={styles.name}>
        {displayName}
        <span className={styles.honorific}>さん</span>
      </h1>

      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd>{s.value ?? '–'}</dd>
          </div>
        ))}
      </dl>

      {/* 飾りのアニメーション。読み上げでは無視する */}
      <div className={styles.route} aria-hidden="true">
        <span className={styles.track} />
        {Array.from({ length: STATIONS }, (_, i) => (
          <span key={i} className={styles.station} data-i={i} />
        ))}
        <span className={styles.traveler} />
      </div>
    </section>
  );
}
