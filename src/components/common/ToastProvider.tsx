import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext, type ToastInput } from '@/components/common/toastContext';
import styles from './ToastProvider.module.css';

type Item = ToastInput & { id: number };

const DURATION = 3000; // 3秒で消える（6.1）

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const seq = useRef(0);

  const show = useCallback((toast: ToastInput) => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-2), { ...toast, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION);
  }, []);

  const value = useMemo(() => ({ show, setTabBarVisible }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={`${styles.viewport} ${tabBarVisible ? styles.aboveTabBar : ''}`}>
          {items.map((t) => (
            <div
              key={t.id}
              className={`${styles.toast} ${styles[t.type]}`}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
