import { describe, expect, it } from 'vitest';
import { targetPinOf, visibleCenterOffset } from '@/components/map/mapFocus';

const spot = { id: 5, lat: 36.56, lng: 136.66, name: '兼六園' };
const candidate = { lat: 36.57, lng: 136.65, name: '場所の候補' };

describe('targetPinOf', () => {
  it('写真のピンがあるスポットには、別のピンを出さない', () => {
    expect(targetPinOf(spot, null, new Set([5]))).toBeNull();
  });

  it('写真のピンがないスポットは、ピンで指す', () => {
    expect(targetPinOf(spot, null, new Set([1]))).toEqual({
      lat: spot.lat,
      lng: spot.lng,
      name: spot.name,
    });
  });

  it('まだ登録されていない場所の候補は、ピンで指す', () => {
    expect(targetPinOf(null, candidate, new Set([5]))).toEqual(candidate);
  });

  it('何も選んでいないときは、ピンを出さない', () => {
    expect(targetPinOf(null, null, new Set())).toBeNull();
  });
});

describe('visibleCenterOffset', () => {
  it('下のシートのときは、シートが最大（60%）でも隠れないように上へずらす', () => {
    const [x, y] = visibleCenterOffset(700, false);
    expect(x).toBe(0);
    expect(y).toBeCloseTo(-105);
    expect(700 / 2 + y).toBeLessThan(700 * 0.4);
  });

  it('右のシートのときは、シートの幅の半分だけ左へずらす', () => {
    expect(visibleCenterOffset(700, true)).toEqual([-200, 0]);
  });
});
