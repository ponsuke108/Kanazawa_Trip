import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { TabIcons } from '../../lib/icons';
import styles from './BottomTabs.module.css';

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean };

const TABS: Tab[] = [
  { to: '/', label: 'ホーム', icon: TabIcons.home, end: true },
  { to: '/search', label: '探す', icon: TabIcons.search },
  { to: '/plans/new', label: '作る', icon: TabIcons.create },
  { to: '/ranking', label: 'ランキング', icon: TabIcons.ranking },
  { to: '/mypage', label: 'マイページ', icon: TabIcons.mypage },
];

// 画面下部の固定タブ（設計書 v3 8章、9.2）
export default function BottomTabs() {
  return (
    <nav className={styles.bar} aria-label="メインメニュー">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <Icon size={24} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
