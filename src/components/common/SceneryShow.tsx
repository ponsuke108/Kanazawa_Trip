import { useEffect, useState } from 'react';
import { SpotPhotos, spotPhotoUrl } from '@/constants/spotPhotos';
import { SceneryIcons } from '@/lib/icons';
import styles from './SceneryShow.module.css';

// （v18）旅のしおりの見た目の背面に出す、金沢の名所の写真のスライドショー（7.9）。
// 写真は K65 の、再利用が許された写真（public/spot-photos）。右下に名前と出典を出す
const SCENES: { spotId: number; name: string }[] = [
  { spotId: 7, name: 'ひがし茶屋街' },
  { spotId: 5, name: '兼六園' },
  { spotId: 1, name: '金沢駅 鼓門' },
  { spotId: 3, name: '長町武家屋敷跡' },
];

const INTERVAL_MS = 3000;
// 列（420px）の両側に写真が見える幅から出す。それより狭いときは写真を読み込まない
const MEDIA = '(min-width: 768px)';

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
  const wide = useMedia(MEDIA);
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  const [index, setIndex] = useState(0);
  // 動きを減らす設定のときは、初めから止めておく（ボタンで切り替えはできる）
  const [paused, setPaused] = useState(reduce);

  useEffect(() => {
    if (!wide || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [wide, paused]);

  if (!wide) return null;

  const scene = SCENES[index];
  const credit = SpotPhotos[scene.spotId];
  const Prev = SceneryIcons.prev;
  const Next = SceneryIcons.next;
  const Toggle = paused ? SceneryIcons.play : SceneryIcons.pause;
  const go = (step: number) => setIndex((i) => (i + step + SCENES.length) % SCENES.length);

  return (
    <section className={styles.show} aria-label="金沢の名所の写真">
      {SCENES.map((s, i) => (
        <img
          key={s.spotId}
          src={spotPhotoUrl(s.spotId) ?? ''}
          alt=""
          className={`${styles.photo} ${i === index ? styles.on : ''}`}
        />
      ))}
      <div className={styles.caption}>
        <p className={styles.name} aria-live={paused ? 'polite' : 'off'}>
          {scene.name}
        </p>
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
      </div>
    </section>
  );
}
