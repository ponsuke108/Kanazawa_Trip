import { describe, expect, it } from 'vitest';
import { toRouteStops } from '@/lib/route';
import { testSpot } from '@/lib/testSpots';
import type { Block } from '@/types/models';

const station = testSpot({ id: 1, name: '金沢駅' });
const omicho = testSpot({ id: 2, name: '近江町市場' });
const kenrokuen = testSpot({ id: 5, name: '兼六園' });

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
