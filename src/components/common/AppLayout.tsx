import { useContext, useEffect, type ReactNode } from 'react';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { ToastContext } from '@/components/common/toastContext';
import styles from './AppLayout.module.css';

type Props = {
  showTabBar: boolean; // 下部タブを出す画面（6.1）：S-02、S-03、S-04、S-10、S-11
  bottomBar?: boolean; // 画面下部に固定のボタンがある画面（BottomActionBar を使う）
  children: ReactNode;
};

// 全画面の共通の枠。スマホでは幅いっぱい、PCでは中央に幅480pxの列
export function AppLayout({ showTabBar, bottomBar = false, children }: Props) {
  const toast = useContext(ToastContext);
  useEffect(() => {
    toast?.setTabBarVisible(showTabBar);
  }, [toast, showTabBar]);

  const classes = [
    styles.column,
    showTabBar ? styles.withTabBar : '',
    bottomBar ? styles.withBottomBar : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
      {children}
      {showTabBar && <BottomTabBar />}
    </div>
  );
}
