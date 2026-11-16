import type { ReactNode } from 'react';
import styles from './SectionHeading.module.css';

type Props = {
  id?: string;
  title: string;
  latin?: string; // 見出しの上に小さく添える英字（飾り。読み上げない）
  action?: ReactNode; // 右に置くリンクなど（「もっと見る」）
};

// 区切りの見出し（7.6、v23）：小さな英字、明朝の見出し、短い金の線
export function SectionHeading({ id, title, latin, action }: Props) {
  return (
    <div className={styles.head}>
      <div className={styles.words}>
        {latin && (
          <span className={styles.latin} aria-hidden="true">
            {latin}
          </span>
        )}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
