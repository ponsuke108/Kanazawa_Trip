import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastInput = { type: ToastType; message: string };

export type ToastContextValue = {
  show: (toast: ToastInput) => void;
  // 下部タブがある画面では、トーストをその上に出す（6.1）
  setTabBarVisible: (visible: boolean) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
