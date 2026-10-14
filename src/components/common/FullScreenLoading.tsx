import { StateIcons } from '@/lib/icons';
import styles from './FullScreenLoading.module.css';

// ログイン状態の確認中など、画面全体の読み込み中
export function FullScreenLoading() {
  const Spinner = StateIcons.loading;
  return (
    <div className={styles.wrap} role="status" aria-label="読み込み中">
      <Spinner size={32} aria-hidden="true" className={styles.spinner} />
    </div>
  );
}
