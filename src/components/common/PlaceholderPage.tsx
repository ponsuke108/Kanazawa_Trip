import styles from './PlaceholderPage.module.css';

type Props = {
  screenId: string;
  title: string;
  owner: string;
  note?: string;
};

// まだ作っていない画面の仮表示。担当者が自分の画面を作るときに置き換える。
export default function PlaceholderPage({ screenId, title, owner, note }: Props) {
  return (
    <section className={styles.card}>
      <p className={styles.id}>{screenId}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>準備中（担当：{owner}）</p>
      {note && <p className={styles.text}>{note}</p>}
    </section>
  );
}
