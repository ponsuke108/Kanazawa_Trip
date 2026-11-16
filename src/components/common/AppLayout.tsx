import { useContext, useEffect, type ReactNode } from 'react';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { OchanekoGuide } from '@/components/common/OchanekoGuide';
import { SiteFooter } from '@/components/common/SiteFooter';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ToastContext } from '@/components/common/toastContext';
import { useAuth } from '@/hooks/useAuth';
import styles from './AppLayout.module.css';

type Props = {
  showTabBar: boolean; // 下部タブを出す画面（6.1）。PC では下部タブを出さず、上部のサイトのヘッダーのメニューを使う（7.8）
  bottomBar?: boolean; // 画面下部に固定のボタンがある画面（BottomActionBar を使う）
  // （v23）サイトの枠（6.1）
  site?: boolean; // サイトのヘッダーとフッターを出す。S-12 ログインだけ出さない
  siteHeaderOnPhone?: boolean; // スマホ・タブレットでもサイトのヘッダーを出す（S-01）
  siteHeaderRight?: ReactNode; // そのとき右に出すボタン（S-01 のマイページ）
  // フッターを出す。下部に固定のボタンがある画面（bottomBar）には出さない。スマホ・タブレットでは、下部タブと重なって長くなるので S-01 だけに出し、PC は全画面に出す。
  footer?: boolean; //地図をいっぱいに出す画面（S-13）と作成画面（S-06〜S-09）は出さない
  footerSources?: boolean; // フッターに出典の一覧を出す（S-01）
  wide?: boolean; // 内容を画面の幅いっぱいにする（S-01 の写真、S-13 の地図）。中の部品が自分で幅を決める
  children: ReactNode;
};

// 全画面の共通の枠（6.1、7.8）。
// スマホは幅いっぱい（最大480px）、タブレットは中央に最大幅720pxの1列、PC は最大幅1200px。
// PC は上にサイトのヘッダー（ロゴとメニュー）を固定し、下部タブは出さない
export function AppLayout({
  showTabBar,
  bottomBar = false,
  site = true,
  siteHeaderOnPhone = false,
  siteHeaderRight,
  footer = true,
  footerSources = false,
  wide = false,
  children,
}: Props) {
  const toast = useContext(ToastContext);
  const { user } = useAuth();
  // （v21）ログインしていれば、左下におちゃねこを出す（7.10、K73）
  const guide = user ? (
    <OchanekoGuide
      above={
        showTabBar && bottomBar ? 'both' : showTabBar ? 'tabbar' : bottomBar ? 'actionbar' : 'none'
      }
    />
  ) : null;
  useEffect(() => {
    toast?.setTabBarVisible(showTabBar);
  }, [toast, showTabBar]);

  const classes = [
    styles.column,
    wide ? styles.wide : '',
    showTabBar ? styles.withTabBar : '',
    bottomBar ? styles.withBottomBar : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${styles.root} ${site ? styles.withSite : ''}`}>
      {site && (
        <SiteHeader onPhone={siteHeaderOnPhone} phoneRight={siteHeaderRight} menu={Boolean(user)} />
      )}
      <div className={classes}>{children}</div>
      {site && footer && !bottomBar && (
        <div
          className={`${styles.footer} ${siteHeaderOnPhone ? '' : styles.footerPcOnly} ${showTabBar ? styles.footerAboveTabBar : ''}`}
        >
          <SiteFooter sources={footerSources} links={Boolean(user)} />
        </div>
      )}
      {showTabBar && <BottomTabBar />}
      {guide}
    </div>
  );
}
