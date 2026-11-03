import { describe, expect, it } from 'vitest';
import { repScore, repSpotId, toFeatureCollection } from '@/components/map/spotsGeoJson';

describe('写真の束の代表（BR-24）', () => {
  it('写真のあるスポットが、id の大きい写真のないスポットより優先される', () => {
    const withPhoto = repScore({
      id: 3,
      name: 'a',
      lat: 0,
      lng: 0,
      spotType: 'minor',
      latestImageUrl: 'x',
    });
    const noPhoto = repScore({
      id: 100001,
      name: 'b',
      lat: 0,
      lng: 0,
      spotType: 'minor',
      latestImageUrl: null,
    });
    expect(withPhoto).toBeGreaterThan(noPhoto);
    expect(repSpotId(withPhoto)).toBe(3);
    expect(repSpotId(noPhoto)).toBe(100001);
  });

  it('GeoJSON は [経度, 緯度] の順', () => {
    const fc = toFeatureCollection([
      { id: 1, name: '金沢駅', lat: 36.578, lng: 136.648, spotType: 'hub' },
    ]);
    expect(fc.features[0]?.geometry.coordinates).toEqual([136.648, 36.578]);
    expect(fc.features[0]?.properties.id).toBe(1);
  });
});
