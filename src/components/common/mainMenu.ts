import { TabIcons, type LucideIcon } from '@/lib/icons';

export type MainMenuItem = { to: string; label: string; icon: LucideIcon; match: string[] };

// 4つのタブ（6.1、K31）：地図、探す、作る、マイページ。ホームはない（K22）。
// 選択状態は URL の先頭で判定する。S-04、S-05 ではどれも選択しない。
// スマホ・タブレットの下部タブ（BottomTabBar）と、PC の左の縦のメニュー（SideMenu）で同じ項目を使う（7.8）
export const MainMenuItems: MainMenuItem[] = [
  { to: '/map', label: '地図', icon: TabIcons.map, match: ['/map'] },
  { to: '/search', label: '探す', icon: TabIcons.search, match: ['/search', '/ranking'] },
  { to: '/create', label: '作る', icon: TabIcons.create, match: ['/create', '/lists'] },
  {
    to: '/mypage',
    label: 'マイページ',
    icon: TabIcons.mypage,
    match: ['/mypage', '/official', '/admin'],
  },
];

// いま開いている画面が、その項目のものか
export function isMenuItemActive(match: string[], pathname: string): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
