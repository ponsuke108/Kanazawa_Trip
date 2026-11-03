import { Button } from '@/components/common/Button';
import { MapMessages, Messages } from '@/constants/messages';
import { StateIcons } from '@/lib/icons';
import styles from './MapStatus.module.css';

// 地図の読み込み中（地図の部品の読み込み中にも使う）。maplibre-gl を読み込まない
export function MapLoading() {
  const Icon = StateIcons.loading;
  return (
    <div className={styles.overlay} role="status">
      <Icon size={24} className={styles.spin} aria-hidden="true" />
      <p className={styles.message}>{MapMessages.loading}</p>
    </div>
  );
}

// 地図の読み込みの失敗（BR-24）：「地図を読み込めませんでした」と再読み込みボタン
export function MapError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.overlay} role="alert">
      <p className={styles.message}>{MapMessages.loadError}</p>
      <Button variant="secondary" icon={StateIcons.retry} onClick={onRetry}>
        {Messages.retry}
      </Button>
    </div>
  );
}
