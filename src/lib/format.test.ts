import { describe, expect, it } from 'vitest';
import { formatAuthor, formatDate, formatRoute, formatTitle } from '@/lib/format';

describe('formatDate（BR-12）', () => {
  it('日本時間の YYYY/MM/DD になる', () => {
    expect(formatDate('2026-10-14T03:00:00Z')).toBe('2026/10/14');
  });
  it('UTC では前日でも日本時間の日付になる', () => {
    expect(formatDate('2026-10-13T16:00:00Z')).toBe('2026/10/14');
  });
});

describe('formatRoute（BR-12）', () => {
  it('3件以下はすべてを「→」でつなぐ', () => {
    expect(formatRoute(['金沢駅', '近江町市場'])).toBe('金沢駅 → 近江町市場');
  });
  it('4件以上は最初の3件と「ほかN件」', () => {
    expect(formatRoute(['金沢駅', '近江町市場', '国立工芸館', '兼六園', 'ひがし茶屋街'])).toBe(
      '金沢駅 → 近江町市場 → 国立工芸館 ほか2件',
    );
  });
  it('0件は空文字', () => {
    expect(formatRoute([])).toBe('');
  });
});

describe('formatTitle・formatAuthor（BR-12）', () => {
  it('空のタイトルは「無題のプラン」', () => {
    expect(formatTitle('')).toBe('無題のプラン');
    expect(formatTitle('  ')).toBe('無題のプラン');
    expect(formatTitle('金沢の旅')).toBe('金沢の旅');
  });
  it('作成者は「〇〇さんのプラン」', () => {
    expect(formatAuthor('ひろと')).toBe('ひろとさんのプラン');
  });
});
