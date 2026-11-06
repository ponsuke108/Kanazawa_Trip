import { useEffect, useRef } from 'react';
import { ActionIcons } from '@/lib/icons';
import styles from './TeaScene.module.css';

export type TeaState = 'brewing' | 'done';

const LABEL: Record<TeaState, string> = {
  brewing: '加賀の一服を点てています',
  done: 'お待たせしました',
};

// ログイン・登録のあいだに出す、金沢の大樋焼の茶碗でお抹茶を一服点て、金箔を浮かべる絵（7.7、I-23）。画像は使わず CSS だけで描く
// 画面のどこをタップしても、「スキップ」ボタンを押しても、Esc キーでも、スキップできる
export function TeaScene({ state, onSkip }: { state: TeaState; onSkip: () => void }) {
  const skipButton = useRef<HTMLButtonElement>(null);
  const Next = ActionIcons.next;

  // 出たらすぐ「スキップ」にカーソルを置き、キーボードの Enter でもスキップできるようにする
  useEffect(() => {
    skipButton.current?.focus();
  }, []);

  return (
    <div
      className={`${styles.overlay} ${styles[state]}`}
      onClick={onSkip}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onSkip();
      }}
    >
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
        <span className={`${styles.leaf} ${styles.leaf1}`} />
        <span className={`${styles.leaf} ${styles.leaf2}`} />
        <span className={`${styles.leaf} ${styles.leaf3}`} />
        <span className={`${styles.leaf} ${styles.leaf4}`} />
      </div>
      <p className={styles.label} role="status">
        {LABEL[state]}
      </p>
      <button ref={skipButton} type="button" className={styles.skip} onClick={onSkip}>
        スキップ
        <Next size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
