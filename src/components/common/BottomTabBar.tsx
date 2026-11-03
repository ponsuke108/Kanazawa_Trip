import { Link, useLocation } from 'react-router';
import { MainMenuItems, isMenuItemActive } from '@/components/common/mainMenu';
import styles from './BottomTabBar.module.css';

// 下部タブ。項目は mainMenu.ts（PC の左の縦のメニューと同じ）
export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className={styles.bar} aria-label="メインメニュー">
      {MainMenuItems.map(({ to, label, icon: Icon, match }) => {
        const active = isMenuItemActive(match, pathname);
        return (
          <Link
            key={to}
            to={to}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={24} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
