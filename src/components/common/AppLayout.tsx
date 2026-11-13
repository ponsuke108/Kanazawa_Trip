import { useContext, useEffect, type ReactNode } from 'react';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { SceneryShow } from '@/components/common/SceneryShow';
import { SideMenu } from '@/components/common/SideMenu';
import { ToastContext } from '@/components/common/toastContext';
import styles from './AppLayout.module.css';

type Props = {
  showTabBar: boolean; // 下部タブを出す画面（6.1）：S-02、S-03、S-04、S-10、S-11。PC では左の縦のメニューになる（7.8）
  bottomBar?: boolean; // 画面下部に固定のボタンがある画面（BottomActionBar を使う）
  // （v18）旅のしおりの見た目（S-14、S-06〜S-09。7.9）。どの幅でも幅420pxの列を中央に置き、
  // 背面に名所の写真のスライドショーを出す。（v19、K72）下部タブを出す画面（S-14）は、PC ではほかの画面と同じく
  // 左のメニューを出し、その右の部分の中で写真と列を見せる
  shiori?: boolean;
  children: ReactNode;
};

// 全画面の共通の枠（7.8）。
// スマホは幅いっぱい（最大480px）、タブレットは中央に最大幅720pxの1列、PC は最大幅1200px。
// 下部タブを出す画面では、PC のときだけ下部タブの代わりに左の縦のメニュー（幅220px）を出す
export function AppLayout({ showTabBar, bottomBar = false, shiori = false, children }: Props) {
  const toast = useContext(ToastContext);
  useEffect(() => {
    toast?.setTabBarVisible(showTabBar);
  }, [toast, showTabBar]);

  // 共通の変数（色、角丸、書体）を、しおりの見た目の値に置きかえる（variables.css）
  useEffect(() => {
    if (!shiori) return;
    const root = document.documentElement;
    root.dataset.theme = 'shiori';
    return () => {
      delete root.dataset.theme;
    };
  }, [shiori]);

  const classes = [
    styles.column,
    shiori ? styles.shiori : '',
    showTabBar ? styles.withTabBar : '',
    bottomBar ? styles.withBottomBar : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (shiori) {
    return (
      <div className={`${styles.shioriRoot} ${showTabBar ? styles.withSideMenu : ''}`}>
        {showTabBar && <SideMenu />}
        <SceneryShow besideMenu={showTabBar} />
        <div className={classes}>
          {children}
          {showTabBar && <BottomTabBar />}
        </div>
      </div>
    );
  }
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
