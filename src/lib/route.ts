// （v11）経路順の地図（BR-22）。外部の API は呼ばない
import { totalDistanceKm } from '@/lib/geo';
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

// 並び順に結んだ直線距離の合計（km。BR-22）。同じスポットに戻るときも番号の順にたどる
export function routeDistanceKm(stops: RouteStop[]): number {
  const points = stops
    .flatMap((s) => s.numbers.map((n) => ({ n, lat: s.spot.lat, lng: s.spot.lng })))
    .sort((a, b) => a.n - b.n);
  return totalDistanceKm(points);
}

// 「約4.2km」「−0.8km」「+0.3km」（BR-22）
export function formatKm(km: number): string {
  return `${km.toFixed(1)}km`;
}

export function formatKmDiff(diff: number): string {
  const v = Math.abs(diff).toFixed(1);
  return diff < 0 ? `−${v}km` : `+${v}km`;
}
