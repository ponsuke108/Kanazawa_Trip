import { describe, expect, it } from 'vitest';
import { buildDirectionsUrl } from '@/lib/mapsUrl';
import type { Spot } from '@/types/models';

const base: Omit<Spot, 'id' | 'name' | 'lat' | 'lng' | 'placeId'> = {
  description: null,
  spotType: 'minor',
  area: 'その他',
  isActive: true,
};
const station: Spot = {
  ...base,
  id: 1,
  name: '金沢駅',
  lat: 36.578342,
  lng: 136.647983,
  placeId: null,
};
const market: Spot = {
  ...base,
  id: 2,
  name: '近江町市場',
  lat: 36.571665,
  lng: 136.656146,
  placeId: null,
};
const withPlace: Spot = { ...market, placeId: 'ChIJabc123' };

function params(url: string) {
  return new URL(url).searchParams;
}

describe('buildDirectionsUrl（10.8）', () => {
  it('Googleマップの経路URLの形になる', () => {
    const url = buildDirectionsUrl(station, market, 'walk');
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1&')).toBe(true);
  });

  it.each([
    ['walk', 'walking'],
    ['bus', 'transit'],
    ['bicycle', 'bicycling'],
    ['car', 'driving'],
  ] as const)('移動手段 %s は travelmode=%s', (mode, expected) => {
    expect(params(buildDirectionsUrl(station, market, mode)).get('travelmode')).toBe(expected);
  });

  it('場所IDがなければ「緯度,経度」を使い、place_id を付けない', () => {
    const p = params(buildDirectionsUrl(station, market, 'walk'));
    expect(p.get('origin')).toBe('36.578342,136.647983');
    expect(p.has('origin_place_id')).toBe(false);
  });

  it('場所IDがあれば名前と place_id を使う', () => {
    const p = params(buildDirectionsUrl(station, withPlace, 'bus'));
    expect(p.get('destination')).toBe('近江町市場');
    expect(p.get('destination_place_id')).toBe('ChIJabc123');
  });

  it('日本語は URL エンコードされる', () => {
    const url = buildDirectionsUrl(station, withPlace, 'walk');
    expect(url).toContain(`destination=${encodeURIComponent('近江町市場')}`);
    expect(url).not.toContain('近江町市場');
  });

  it('経由地（waypoints）は使わない（BR-16）', () => {
    expect(buildDirectionsUrl(station, market, 'bus')).not.toContain('waypoints');
  });
});
