import { TabIcons, type LucideIcon } from '@/lib/icons';

export type MainMenuItem = { to: string; label: string; icon: LucideIcon; match: string | null };

// 4つのタブ。ホームはない（6.1、K22）。「作る」は選択状態にしない。
// スマホ・タブレットの下部タブ（BottomTabBar）と、PC の左の縦のメニュー（SideMenu）で同じ項目を使う（7.8）
export const MainMenuItems: MainMenuItem[] = [
  { to: '/search', label: '探す', icon: TabIcons.search, match: '/search' },
  { to: '/plans/new', label: '作る', icon: TabIcons.create, match: null },
  { to: '/ranking', label: 'ランキング', icon: TabIcons.ranking, match: '/ranking' },
  { to: '/mypage', label: 'マイページ', icon: TabIcons.mypage, match: '/mypage' },
];

// いま開いている画面が、その項目のものか
export function isMenuItemActive(match: string | null, pathname: string): boolean {
  return match !== null && (pathname === match || pathname.startsWith(`${match}/`));
}
