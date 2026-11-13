import { describe, expect, it } from 'vitest';
import { OchanekoDefaultHint, OchanekoTrivia } from '@/constants/ochaneko';
import { ochanekoHint, ochanekoLine } from '@/lib/ochaneko';

describe('おちゃねこのしゃべること（7.10、K73）', () => {
  it('画面ごとのヒントを URL で選ぶ', () => {
    expect(ochanekoHint('/plans/new')).toContain('並べ替え');
    expect(ochanekoHint('/plans/abc/edit')).toContain('並べ替え');
    expect(ochanekoHint('/plans/abc/navi')).toContain('Googleマップ');
    expect(ochanekoHint('/plans/abc')).toContain('コピーして編集');
    expect(ochanekoHint('/map')).toContain('ピン');
    expect(ochanekoHint('/search/results')).toContain('タグ');
    expect(ochanekoHint('/')).toContain('案内役');
  });

  it('合う画面がなければ、決まったヒント', () => {
    expect(ochanekoHint('/official')).toBe(OchanekoDefaultHint);
  });

  it('押すたびに、ヒントと豆知識をかわりばんこに話す', () => {
    expect(ochanekoLine('/map', 1)).toBe(ochanekoHint('/map'));
    expect(ochanekoLine('/map', 2)).toBe(OchanekoTrivia[0]);
    expect(ochanekoLine('/map', 3)).toBe(ochanekoHint('/map'));
    expect(ochanekoLine('/map', 4)).toBe(OchanekoTrivia[1]);
    expect(ochanekoLine('/map', OchanekoTrivia.length * 2 + 2)).toBe(OchanekoTrivia[0]);
  });
});
