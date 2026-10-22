import { describe, expect, it } from 'vitest';
import { parseTagIds, tagsQuery } from '@/lib/tagParams';

describe('parseTagIds・tagsQuery（6.2）', () => {
  it('数字以外を無視し、小さい順に並べる', () => {
    expect(parseTagIds('3,a,1,,2,3')).toEqual([1, 2, 3]);
    expect(parseTagIds(null)).toEqual([]);
  });
  it('クエリ文字列を作る', () => {
    expect(tagsQuery([4, 2])).toBe('?tags=2,4');
    expect(tagsQuery([])).toBe('');
  });
});
