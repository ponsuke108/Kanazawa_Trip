import { Link, useLocation } from 'react-router';
import { TabIcons, type LucideIcon } from '@/lib/icons';
import styles from './BottomTabBar.module.css';

type Tab = { to: string; label: string; icon: LucideIcon; match: string | null };

// 4つのタブ。ホームはない（6.1、K22）。「作る」は選択状態にしない
const TABS: Tab[] = [
  { to: '/search', label: '探す', icon: TabIcons.search, match: '/search' },
  { to: '/plans/new', label: '作る', icon: TabIcons.create, match: null },
  { to: '/ranking', label: 'ランキング', icon: TabIcons.ranking, match: '/ranking' },
  { to: '/mypage', label: 'マイページ', icon: TabIcons.mypage, match: '/mypage' },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className={styles.bar} aria-label="メインメニュー">
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const active = match !== null && (pathname === match || pathname.startsWith(`${match}/`));
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
