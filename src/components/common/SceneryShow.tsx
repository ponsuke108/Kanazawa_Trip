import { useEffect, useState } from 'react';
import { SpotPhotos, spotPhotoSrcSet, spotPhotoUrl } from '@/constants/spotPhotos';
import { SceneryIcons } from '@/lib/icons';
import styles from './SceneryShow.module.css';

// 金沢の名所の写真のスライドショー（v23：S-01 ホームの大きな写真。7.9）。
// 写真は K65 の、再利用が許された写真（public/spot-photos）。右下に名前と出典を出す
const SCENES: { spotId: number; name: string }[] = [
  { spotId: 7, name: 'ひがし茶屋街' },
  { spotId: 5, name: '兼六園' },
  { spotId: 1, name: '金沢駅 鼓門' },
  { spotId: 3, name: '長町武家屋敷跡' },
];

const INTERVAL_MS = 5000;

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function SceneryShow() {
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  // いまの写真（index）と、読み込んだ写真（loaded）。写真は、今の1枚と次の1枚だけを先に読み込む
  // （大きな写真を一度に4枚読み込まない）
  const [{ index, loaded }, setShow] = useState<{ index: number; loaded: ReadonlySet<number> }>(
    () => ({ index: 0, loaded: new Set([0, 1]) }),
  );
  // 動きを減らす設定のときは、初めから止めておく（ボタンで切り替えはできる）
  const [paused, setPaused] = useState(reduce);
  const go = (step: number) =>
    setShow((prev) => {
      const index = (prev.index + step + SCENES.length) % SCENES.length;
      const next = (index + 1) % SCENES.length;
      const loaded =
        prev.loaded.has(index) && prev.loaded.has(next)
          ? prev.loaded
          : new Set([...prev.loaded, index, next]);
      return { index, loaded };
    });

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const scene = SCENES[index];
  const credit = SpotPhotos[scene.spotId];
  const Prev = SceneryIcons.prev;
  const Next = SceneryIcons.next;
  const Toggle = paused ? SceneryIcons.play : SceneryIcons.pause;

  return (
    <section className={styles.wrap} aria-label="金沢の名所の写真">
      <div className={styles.show}>
        {SCENES.map((s, i) =>
          loaded.has(i) ? (
            <img
              key={s.spotId}
              src={spotPhotoUrl(s.spotId) ?? ''}
              srcSet={spotPhotoSrcSet(s.spotId)}
              // 横長の写真を縦長の枠に切り出すので、枠の幅の2倍ほどの大きさが要る
              sizes="(min-width: 768px) 960px, 130vw"
              alt=""
              className={`${styles.photo} ${i === index ? styles.on : ''}`}
            />
          ) : null,
        )}
      </div>
      <div className={styles.caption}>
        <div>
          <p className={styles.name} aria-live={paused ? 'polite' : 'off'}>
            {scene.name}
          </p>
          <div className={styles.dots} aria-hidden="true">
            {SCENES.map((s, i) => (
              <span key={s.spotId} className={`${styles.dot} ${i === index ? styles.dotOn : ''}`} />
            ))}
          </div>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.control} onClick={() => go(-1)}>
            <Prev size={18} aria-hidden="true" />
            <span className={styles.hidden}>前の写真</span>
          </button>
          <button
            type="button"
            className={styles.control}
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            <Toggle size={18} aria-hidden="true" />
            <span className={styles.hidden}>
              {paused ? '写真の切り替えを再開' : '写真の切り替えを止める'}
            </span>
          </button>
          <button type="button" className={styles.control} onClick={() => go(1)}>
            <Next size={18} aria-hidden="true" />
            <span className={styles.hidden}>次の写真</span>
          </button>
        </div>
        {credit && (
          <p className={styles.credit}>
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
          </p>
        )}
      </div>
    </section>
  );
}
