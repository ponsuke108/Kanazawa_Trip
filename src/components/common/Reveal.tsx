import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Reveal.module.css';

type Props = {
  children: ReactNode;
  delay?: number; // 出はじめるまでの時間（ミリ秒）。横に並ぶものを順に出すときに使う
  className?: string;
};

// 画面に入ったときに、下からそっと浮かび上がらせる（7.11、K75）。一度出たらそのまま。
// 動きを減らす設定のとき、または IntersectionObserver がないときは、初めから出しておく
export function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (shown || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.shown : ''} ${className ?? ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
