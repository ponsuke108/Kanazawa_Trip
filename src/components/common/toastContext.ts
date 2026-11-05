import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastInput = {
  type: ToastType;
  message: string;
  // （v11）トーストの中のボタン（S-04「開く」、S-15「元に戻す」）
  action?: { label: string; onClick: () => void };
};

export type ToastContextValue = {
  show: (toast: ToastInput) => void;
  // 下部タブがある画面では、トーストをその上に出す（6.1）
  setTabBarVisible: (visible: boolean) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
