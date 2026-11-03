import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { MainMenuItems, isMenuItemActive } from '@/components/common/mainMenu';
import styles from './SideMenu.module.css';

// PC（1024px 以上）の左の縦のメニュー（7.8）。下部タブの代わりに出す。
// 項目は下部タブと同じ（mainMenu.ts）。スマホとタブレットでは CSS で隠す
export function SideMenu() {
  const { pathname } = useLocation();
  return (
    <nav className={styles.menu} aria-label="メインメニュー">
      <Link to="/" className={styles.site} aria-label="旅ノート金沢 ホームへ">
        <Logo size="lg" />
      </Link>
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
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
