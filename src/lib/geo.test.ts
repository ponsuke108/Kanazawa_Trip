import { describe, expect, it } from 'vitest';
import {
  distanceKm,
  isInKanazawa,
  KanazawaBounds,
  KanazawaCenter,
  MapMaxBounds,
  totalDistanceKm,
} from '@/lib/geo';

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

describe('直線距離（BR-22）', () => {
  const station = { lat: 36.578342, lng: 136.647983 }; // 金沢駅
  const kenrokuen = { lat: 36.562128, lng: 136.662652 }; // 兼六園
  const omicho = { lat: 36.571665, lng: 136.656146 }; // 近江町市場

  it('金沢駅〜兼六園はおよそ2.2km', () => {
    const d = distanceKm(station, kenrokuen);
    expect(d).toBeGreaterThan(2.1);
    expect(d).toBeLessThan(2.4);
  });

  it('同じ点は0', () => {
    expect(distanceKm(station, station)).toBe(0);
  });

  it('合計は区間ごとの距離の和', () => {
    const total = totalDistanceKm([station, omicho, kenrokuen]);
    expect(total).toBeCloseTo(distanceKm(station, omicho) + distanceKm(omicho, kenrokuen), 10);
    expect(total).toBeGreaterThan(distanceKm(station, kenrokuen));
  });

  it('1点以下なら0', () => {
    expect(totalDistanceKm([])).toBe(0);
    expect(totalDistanceKm([station])).toBe(0);
  });
});
