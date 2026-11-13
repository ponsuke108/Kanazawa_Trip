import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { MascotSprite } from '@/components/common/MascotSprite';
import { Ochaneko } from '@/constants/ochaneko';
import { ActionIcons } from '@/lib/icons';
import { ochanekoHint, ochanekoLine } from '@/lib/ochaneko';
import styles from './OchanekoGuide.module.css';

type Props = {
  // 下に固定されたものの上に出す（スマホ・タブレット）。PC は画面の左下
  above: 'none' | 'tabbar' | 'actionbar' | 'both';
};

const AUTO_CLOSE_MS = 8000;
const STORAGE_KEY = 'ochaneko-hidden';
// 自分から話しかけるのは、その画面を初めて開いたときだけ（読み込み直すまで覚えておく）
const greeted = new Set<string>();

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 保存できなくても、その画面のあいだはしまったままにする
  }
}

// （v21）ログインしたあと、どの画面でも左下にいる「おちゃねこ」（7.10、K73）。
// 画面を初めて開くとその画面のヒントを吹き出しで話し、押すたびにヒントと金沢の豆知識をかわりばんこに話す
export function OchanekoGuide({ above }: Props) {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(readHidden);
  const [text, setText] = useState<string | null>(null);
  const [byUser, setByUser] = useState(false);
  const count = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const say = (line: string, fromUser: boolean) => {
    setText(line);
    setByUser(fromUser);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(null), AUTO_CLOSE_MS);
  };

  useEffect(() => {
    if (hidden || greeted.has(pathname)) return;
    greeted.add(pathname);
    const id = window.setTimeout(() => say(ochanekoHint(pathname), false), 600);
    return () => window.clearTimeout(id);
  }, [pathname, hidden]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const Close = ActionIcons.close;

  if (hidden) {
    return (
      <button
        type="button"
        className={`${styles.restore} ${styles[above]}`}
        onClick={() => {
          setHidden(false);
          writeHidden(false);
        }}
      >
        <MascotSprite className={styles.mini} />
        {Ochaneko.name}を出す
      </button>
    );
  }

  return (
    <div className={`${styles.guide} ${styles[above]}`}>
      <div className={styles.talk} role="status" aria-live={byUser ? 'polite' : 'off'}>
        {text && (
          <div className={styles.bubble}>
            <p className={styles.who}>
              {Ochaneko.name}
              <span className={styles.role}>{Ochaneko.role}</span>
            </p>
            <p className={styles.line}>{text}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setText(null);
                  setHidden(true);
                  writeHidden(true);
                }}
              >
                しまう
              </button>
              <button
                type="button"
                className={styles.close}
                aria-label="吹き出しを閉じる"
                onClick={() => setText(null)}
              >
                <Close size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
      {!text && <p className={styles.nameplate}>{Ochaneko.name}</p>}
      <button
        type="button"
        className={styles.cat}
        aria-label={`${Ochaneko.name}（${Ochaneko.role}）に話しかける`}
        onClick={() => {
          count.current += 1;
          say(ochanekoLine(pathname, count.current), true);
        }}
      >
        <MascotSprite className={styles.sprite} />
      </button>
    </div>
  );
}
