import { Button } from '@/components/common/Button';
import { Messages } from '@/constants/messages';
import { StateIcons } from '@/lib/icons';
import styles from './ErrorState.module.css';

type Props = { message?: string; onRetry: () => void };

// 画面全体の読み込み失敗（6.1）
export function ErrorState({ message = Messages.unknown, onRetry }: Props) {
  const Icon = StateIcons.alert;
  return (
    <div className={styles.error} role="alert">
      <Icon size={32} aria-hidden="true" className={styles.icon} />
      <p className={styles.message}>{message}</p>
      <Button variant="secondary" icon={StateIcons.retry} onClick={onRetry}>
        {Messages.retry}
      </Button>
    </div>
  );
}
