import { useContext, useEffect, type ReactNode } from 'react';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { SideMenu } from '@/components/common/SideMenu';
import { ToastContext } from '@/components/common/toastContext';
import styles from './AppLayout.module.css';

type Props = {
  showTabBar: boolean; // 下部タブを出す画面（6.1）：S-02、S-03、S-04、S-10、S-11。PC では左の縦のメニューになる（7.8）
  bottomBar?: boolean; // 画面下部に固定のボタンがある画面（BottomActionBar を使う）
  children: ReactNode;
};

// 全画面の共通の枠（7.8）。
// スマホは幅いっぱい（最大480px）、タブレットは中央に最大幅720pxの1列、PC は最大幅1200px。
// 下部タブを出す画面では、PC のときだけ下部タブの代わりに左の縦のメニュー（幅220px）を出す
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
    <div className={showTabBar ? styles.withSideMenu : undefined}>
      {showTabBar && <SideMenu />}
      <div className={classes}>
        {children}
        {showTabBar && <BottomTabBar />}
      </div>
    </div>
  );
}
