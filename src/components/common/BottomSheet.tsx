import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/common/IconButton';
import { ActionIcons } from '@/lib/icons';
import styles from './BottomSheet.module.css';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// 画面の下から出るシート（S-07）
export function BottomSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton icon={ActionIcons.close} label="閉じる" onClick={onClose} />
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
