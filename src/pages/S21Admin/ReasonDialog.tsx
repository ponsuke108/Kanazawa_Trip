import { useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextAreaField } from '@/components/common/TextAreaField';
import { AdminMessages } from '@/constants/messages';
import styles from './AdminPage.module.css';

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  required?: boolean; // 却下のときは理由が必須（BR-26）
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

const MAX = 200; // BR-29：理由は200文字まで

// 管理者の操作の理由を書くダイアログ（6.6 S-21・S-22、BR-29）
export function ReasonDialog(props: Props) {
  if (!props.open) return null;
  return <ReasonDialogBody {...props} />;
}

function ReasonDialogBody({
  title,
  message,
  confirmLabel,
  required = false,
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState('');
  const length = Array.from(reason.trim()).length;
  const ok = length <= MAX && (!required || length >= 1);
  return (
    <BottomSheet open title={title} onClose={onCancel}>
      <div className={styles.dialog}>
        {message && <p className={styles.dialogMessage}>{message}</p>}
        <TextAreaField
          label={required ? AdminMessages.reasonRequired : AdminMessages.reasonOptional}
          value={reason}
          rows={3}
          counter={{ current: length, max: MAX }}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className={styles.dialogButtons}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            やめる
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={!ok}
            loading={loading}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
