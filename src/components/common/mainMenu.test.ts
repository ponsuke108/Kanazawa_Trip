import { describe, expect, it } from 'vitest';
import { isMenuItemActive, MainMenuItems } from '@/components/common/mainMenu';

const activeLabel = (pathname: string) =>
  MainMenuItems.filter((i) => isMenuItemActive(i.match, pathname)).map((i) => i.label);

describe('下部タブの選択状態（6.1）', () => {
  it('URL の先頭で判定する', () => {
    expect(activeLabel('/map')).toEqual(['地図']);
    expect(activeLabel('/search/results')).toEqual(['探す']);
    expect(activeLabel('/search')).toEqual(['探す']);
    expect(activeLabel('/ranking')).toEqual(['ランキング']);
    expect(activeLabel('/create')).toEqual(['作る']);
    expect(activeLabel('/lists/abc')).toEqual(['作る']);
    expect(activeLabel('/mypage')).toEqual(['マイページ']);
    expect(activeLabel('/admin')).toEqual(['マイページ']);
  });

  it('（K71）タブは5つで、ランキングは探すの隣', () => {
    expect(MainMenuItems.map((i) => i.label)).toEqual([
      '地図',
      '探す',
      'ランキング',
      '作る',
      'マイページ',
    ]);
    expect(MainMenuItems.find((i) => i.label === 'ランキング')?.to).toBe('/ranking');
  });

  it('S-04、S-05 ではどれも選択しない', () => {
    expect(activeLabel('/plans/abc')).toEqual([]);
    expect(activeLabel('/spots/8')).toEqual([]);
    expect(activeLabel('/mapping')).toEqual([]);
  });
});
