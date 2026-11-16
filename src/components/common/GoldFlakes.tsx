import styles from './GoldFlakes.module.css';

// 舞う金箔（7.11、K75）。金沢は金箔の産地。置いた場所の中を、小さな箔がゆっくり舞い落ちる。
// 飾りなので読み上げない。動きを減らす設定のときは、止めたまま散らしておく
const FLAKES = [0, 1, 2, 3, 4, 5, 6, 7];

export function GoldFlakes() {
  return (
    <div className={styles.flakes} aria-hidden="true">
      {FLAKES.map((i) => (
        <span key={i} className={styles.flake} />
      ))}
    </div>
  );
}
