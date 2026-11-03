import { describe, expect, it } from 'vitest';
import { isInKanazawa, KanazawaBounds, KanazawaCenter, MapMaxBounds } from '@/lib/geo';

describe('isInKanazawa（BR-19）', () => {
  it('金沢駅と兼六園は範囲に入る', () => {
    expect(isInKanazawa(36.5781, 136.6478)).toBe(true);
    expect(isInKanazawa(36.5621, 136.6626)).toBe(true);
  });

  it('範囲の外は入らない', () => {
    expect(isInKanazawa(35.6812, 139.7671)).toBe(false); // 東京駅
    expect(isInKanazawa(36.75, 136.65)).toBe(false); // 北にはずれる
    expect(isInKanazawa(36.56, 136.95)).toBe(false); // 東にはずれる
  });

  it('範囲の端は入る', () => {
    expect(isInKanazawa(KanazawaBounds.south, KanazawaBounds.west)).toBe(true);
    expect(isInKanazawa(KanazawaBounds.north, KanazawaBounds.east)).toBe(true);
  });
});

describe('地図の範囲（BR-24）', () => {
  it('動かせる範囲は金沢市の範囲を含み、少しだけ広い', () => {
    expect(MapMaxBounds.south).toBeLessThan(KanazawaBounds.south);
    expect(MapMaxBounds.north).toBeGreaterThan(KanazawaBounds.north);
    expect(MapMaxBounds.west).toBeLessThan(KanazawaBounds.west);
    expect(MapMaxBounds.east).toBeGreaterThan(KanazawaBounds.east);
    expect(KanazawaBounds.south - MapMaxBounds.south).toBeLessThanOrEqual(0.1);
  });

  it('初めの位置は範囲の中', () => {
    expect(isInKanazawa(KanazawaCenter.lat, KanazawaCenter.lng)).toBe(true);
  });
});
