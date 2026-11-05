import { describe, expect, it } from 'vitest';
import {
  buildDirectionsUrl,
  buildWholeRouteUrls,
  MAX_WAYPOINTS,
  splitWholeRoute,
} from '@/lib/mapsUrl';
import type { Spot } from '@/types/models';

const base: Omit<Spot, 'id' | 'name' | 'lat' | 'lng' | 'placeId'> = {
  description: null,
  spotType: 'minor',
  area: 'その他',
  isActive: true,
  source: 'curated',
  address: null,
  placeKind: null,
  postCount: 0,
  latestImageUrl: null,
  hasActiveCampaign: false,
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

// （v11）全体のナビ（BR-23、10.8、11.6）
function spotsOf(n: number): Spot[] {
  return Array.from({ length: n }, (_, i) => ({
    ...base,
    id: i + 1,
    name: `スポット${i + 1}`,
    lat: 36.5 + i * 0.001234567,
    lng: 136.6 + i * 0.001234567,
    placeId: `ChIJ${'x'.repeat(30)}${i}`,
  }));
}
function waypointsOf(url: string): string[] {
  const w = params(url).get('waypoints');
  return w ? w.split('|') : [];
}

describe('buildWholeRouteUrls（10.8、BR-23）', () => {
  it('10か所までは1本で、経由地は9か所まで', () => {
    const urls = buildWholeRouteUrls(spotsOf(11), 'walk', false);
    expect(urls).toHaveLength(1);
    expect(waypointsOf(urls[0] ?? '')).toHaveLength(MAX_WAYPOINTS);
  });

  it('経由地は「緯度,経度」で書き、place_id を使わない。「|」はエンコードする', () => {
    const url = buildWholeRouteUrls(spotsOf(4), 'walk', false)[0] ?? '';
    expect(params(url).get('origin')).toBe('36.5,136.6');
    expect(url).not.toContain('place_id');
    expect(url).not.toContain('|');
    expect(url).toContain('%7C');
  });

  it('12か所以上は、前の到着地を次の出発地にして分ける', () => {
    const spots = spotsOf(12);
    const urls = buildWholeRouteUrls(spots, 'car', false);
    expect(urls).toHaveLength(2);
    const first = params(urls[0] ?? '');
    const second = params(urls[1] ?? '');
    expect(first.get('destination')).toBe(`${spots[10]?.lat},${spots[10]?.lng}`);
    expect(second.get('origin')).toBe(first.get('destination'));
    expect(second.get('destination')).toBe(`${spots[11]?.lat},${spots[11]?.lng}`);
    expect(second.get('travelmode')).toBe('driving');
    expect(splitWholeRoute(12, false)).toEqual([
      { from: 1, to: 11 },
      { from: 11, to: 12 },
    ]);
  });

  it('21か所なら 1〜11、11〜21 の2本', () => {
    expect(splitWholeRoute(21, false)).toEqual([
      { from: 1, to: 11 },
      { from: 11, to: 21 },
    ]);
    expect(buildWholeRouteUrls(spotsOf(21), 'walk', false)).toHaveLength(2);
  });

  it('「現在地から」では origin を付けず、1番目のスポットを最初の経由地にする', () => {
    const spots = spotsOf(3);
    const url = buildWholeRouteUrls(spots, 'bicycle', true)[0] ?? '';
    const p = params(url);
    expect(p.has('origin')).toBe(false);
    expect(waypointsOf(url)[0]).toBe('36.5,136.6');
    expect(p.get('travelmode')).toBe('bicycling');
  });

  it('「現在地から」で11か所なら、1〜10番目と10〜11番目に分かれる', () => {
    expect(splitWholeRoute(11, true)).toEqual([
      { from: 1, to: 10 },
      { from: 10, to: 11 },
    ]);
    const urls = buildWholeRouteUrls(spotsOf(11), 'walk', true);
    expect(urls).toHaveLength(2);
    expect(params(urls[1] ?? '').has('origin')).toBe(true);
  });

  it('30か所でも、どの URL も2,048文字を超えない', () => {
    for (const fromCurrent of [false, true]) {
      for (const url of buildWholeRouteUrls(spotsOf(30), 'walk', fromCurrent)) {
        expect(url.length).toBeLessThanOrEqual(2048);
        expect(waypointsOf(url).length).toBeLessThanOrEqual(MAX_WAYPOINTS);
      }
    }
  });

  it('スポットが1つなら URL は作らない', () => {
    expect(buildWholeRouteUrls(spotsOf(1), 'walk', false)).toEqual([]);
  });
});
