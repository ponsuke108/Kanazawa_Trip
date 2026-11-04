// （v11）経路順の地図（BR-22）。外部の API は呼ばない
import type { Block, RouteStop, SpotBlock } from '@/types/models';

// スポットブロックを並び順の番号付きの点にする。コメントは飛ばして番号を振る。
// 同じスポットが2回以上出るときは1つの点にまとめ、番号を並べる（[1, 5] など）。点の順は最初に出た順
export function toRouteStops(blocks: Block[]): RouteStop[] {
  const stops: RouteStop[] = [];
  const bySpotId = new Map<number, RouteStop>();
  let n = 0;
  for (const b of blocks) {
    if (b.type !== 'spot') continue;
    n += 1;
    const block: SpotBlock = b;
    const found = bySpotId.get(block.spot.id);
    if (found) {
      found.numbers.push(n);
      found.blockIds.push(block.id);
    } else {
      const stop: RouteStop = { spot: block.spot, numbers: [n], blockIds: [block.id] };
      bySpotId.set(block.spot.id, stop);
      stops.push(stop);
    }
  }
  return stops;
}
