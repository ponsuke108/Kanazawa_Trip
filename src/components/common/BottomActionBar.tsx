import type { ReactNode } from 'react';
import styles from './BottomActionBar.module.css';

type Props = {
  aboveTabBar?: boolean; // 下部タブがある画面ではその上に出す
  children: ReactNode;
};

// 画面下部に固定する主な操作のボタン（15章：主な操作は画面下部）
export function BottomActionBar({ aboveTabBar = false, children }: Props) {
  return <div className={`${styles.bar} ${aboveTabBar ? styles.aboveTabBar : ''}`}>{children}</div>;
}
