import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconButton } from '@/components/common/IconButton';
import { ActionIcons } from '@/lib/icons';
import styles from './PageHeader.module.css';

type Props = {
  title: string;
  showSiteName?: boolean; // 左にサイト名を出し、押すとホームへ（6.1）
  backTo?: string | null; // 省略時はブラウザの戻る。null なら戻るボタンを出さない
  onBack?: () => void; // 戻るの動きを差し替える（作成画面の未保存確認など）
  right?: ReactNode;
};

export function PageHeader({ title, showSiteName = false, backTo, onBack, right }: Props) {
  const navigate = useNavigate();

  const goBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    // 履歴がなければホームへ
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  let left: ReactNode = null;
  if (showSiteName) {
    left = (
      <Link to="/" className={styles.siteName}>
        旅ノート金沢
      </Link>
    );
  } else if (backTo !== null) {
    left = <IconButton icon={ActionIcons.back} label="戻る" onClick={goBack} />;
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>{left}</div>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.right}>{right}</div>
    </header>
  );
}
