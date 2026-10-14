import { useContext } from 'react';
import { ToastContext } from '@/components/common/toastContext';

// 通知（トースト）を出す。show({ type, message })
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast は ToastProvider の中で使ってください');
  return { show: ctx.show };
}
