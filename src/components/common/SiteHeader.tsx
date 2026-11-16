import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { MainMenuItems, isMenuItemActive } from '@/components/common/mainMenu';
import styles from './SiteHeader.module.css';

type Props = {
  onPhone?: boolean; // スマホ・タブレットでも出す（S-01 ホーム）。ほかの画面は PC だけ
  phoneRight?: ReactNode; // スマホ・タブレットで右に出すボタン（S-01 のマイページ）。PC はメニューがあるので出さない
  menu?: boolean; // メニューを出す。ログインしていない人が見る画面（S-24）では出さない
};

// サイトのヘッダー（6.1、7.8、v23）。左にロゴ、PC は右に5つのメニュー（mainMenu.ts。下部タブと同じ項目）。
// スマホ・タブレットのメニューは下部タブ（BottomTabBar）なので、ここには出さない
export function SiteHeader({ onPhone = false, phoneRight, menu = true }: Props) {
  const { pathname } = useLocation();
  return (
    <header className={`${styles.header} ${onPhone ? styles.onPhone : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.site} aria-label="旅ノート金沢 ホームへ">
          <Logo size="lg" seal />
        </Link>
        {phoneRight && <div className={styles.phoneRight}>{phoneRight}</div>}
        {menu && (
          <nav className={styles.nav} aria-label="メインメニュー">
            <ul className={styles.items}>
              {MainMenuItems.map(({ to, label, icon: Icon, match }) => {
                const active = isMenuItemActive(match, pathname);
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`${styles.item} ${active ? styles.active : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
