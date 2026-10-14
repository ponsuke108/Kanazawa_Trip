import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/lib/redirect';

describe('safeRedirect（BR-14）', () => {
  it('サイト内のURLはそのまま', () => {
    expect(safeRedirect('/plans/abc?x=1')).toBe('/plans/abc?x=1');
  });
  it('なければホーム', () => {
    expect(safeRedirect(null)).toBe('/');
  });
  it('外部や // で始まるものはホーム', () => {
    expect(safeRedirect('https://example.com')).toBe('/');
    expect(safeRedirect('//example.com')).toBe('/');
    expect(safeRedirect('/\\example.com')).toBe('/');
  });
});
