import { describe, expect, it } from 'vitest';
import { distanceKm } from '@/lib/geo';
import { formatKmDiff, routeDistanceKm, toRouteStops } from '@/lib/route';
import { testSpot } from '@/lib/testSpots';
import type { Block } from '@/types/models';

const station = testSpot({ id: 1, name: '金沢駅', lat: 36.578342, lng: 136.647983 });
const omicho = testSpot({ id: 2, name: '近江町市場' });
const kenrokuen = testSpot({ id: 5, name: '兼六園', lat: 36.562128, lng: 136.662652 });

function spot(id: string, s: typeof station): Block {
  return { id, type: 'spot', spot: s, transportMode: null, imagePath: null, imageUrl: null };
}
function comment(id: string): Block {
  return { id, type: 'comment', body: 'メモ' };
}

describe('toRouteStops（BR-22）', () => {
  it('コメントを飛ばして番号が振られる', () => {
    const stops = toRouteStops([
      spot('a', station),
      comment('c'),
      spot('b', omicho),
      spot('d', kenrokuen),
    ]);
    expect(stops.map((s) => [s.spot.name, s.numbers, s.blockIds])).toEqual([
      ['金沢駅', [1], ['a']],
      ['近江町市場', [2], ['b']],
      ['兼六園', [3], ['d']],
    ]);
  });

  it('同じスポットが2回出ると番号がまとまる', () => {
    const stops = toRouteStops([
      spot('a', station),
      spot('b', omicho),
      comment('c'),
      spot('d', kenrokuen),
      spot('e', station),
    ]);
    expect(stops.map((s) => [s.spot.id, s.numbers, s.blockIds])).toEqual([
      [1, [1, 4], ['a', 'e']],
      [2, [2], ['b']],
      [5, [3], ['d']],
    ]);
  });

  it('スポットがなければ空', () => {
    expect(toRouteStops([comment('c')])).toEqual([]);
  });
});

describe('routeDistanceKm（BR-22）', () => {
  it('番号の順に結んだ直線距離の合計。同じスポットに戻る分も数える', () => {
    const stops = toRouteStops([spot('a', station), spot('b', kenrokuen), spot('c', station)]);
    expect(routeDistanceKm(stops)).toBeCloseTo(distanceKm(station, kenrokuen) * 2, 10);
    expect(routeDistanceKm(stops)).toBeGreaterThan(4);
  });

  it('差の書き方', () => {
    expect(formatKmDiff(-0.83)).toBe('−0.8km');
    expect(formatKmDiff(0.31)).toBe('+0.3km');
  });
});
