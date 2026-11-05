// Googleマップの経路URL（要件定義書 10.8、BR-16）
// 1区間ずつのURLを作る。経由地は使わない（経由地を使うとバスを指定できないため）
import type { Spot, TransportMode } from '@/types/models';

// 移動手段と travelmode の対応はここ1か所にまとめる。
// T2 で自転車の経路が出ないと分かったら、bicycle を 'walking' に変える
export const TRAVEL_MODES: Record<TransportMode, string> = {
  walk: 'walking',
  bus: 'transit',
  bicycle: 'bicycling',
  car: 'driving',
};

export function buildDirectionsUrl(from: Spot, to: Spot, mode: TransportMode): string {
  const params: Array<[string, string]> = [['api', '1']];
  addPlace(params, 'origin', from);
  addPlace(params, 'destination', to);
  params.push(['travelmode', TRAVEL_MODES[mode]]);
  const query = params
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `https://www.google.com/maps/dir/?${query}`;
}

// 場所IDがあれば名前と場所ID、なければ「緯度,経度」を使い place_id は付けない
function addPlace(params: Array<[string, string]>, key: 'origin' | 'destination', spot: Spot) {
  if (spot.placeId) {
    params.push([key, spot.name]);
    params.push([`${key}_place_id`, spot.placeId]);
  } else {
    params.push([key, `${spot.lat},${spot.lng}`]);
  }
}

// （v11）全体のナビ（BR-23、10.8）
// 「全体を1本で開く」で選べる移動手段は、この1か所の一覧で持つ。
// 公共交通のデータを得たら、ここに足すだけで画面（S-18）に出る（BR-23 の将来の余地）
export type WholeRouteMode = 'walk' | 'bicycle' | 'car';
export const WHOLE_ROUTE_MODES: readonly WholeRouteMode[] = ['walk', 'car', 'bicycle'];

// 1本の URL に入れる経由地の数の上限（Googleマップのアプリが9か所まで。BR-23）
export const MAX_WAYPOINTS = 9;
const BASE_URL = 'https://www.google.com/maps/dir/';

// 分けた1本ごとの範囲。番号はプランのスポットの何番目か（1から）
export type WholeRouteRange = { from: number; to: number };

// 全体を「出発・経由地9・到着」の11か所ずつに分ける。前の到着地を次の出発地にする（10.8）。
// 「現在地から」のときは、最初の1本だけ出発地が現在地になり、1番目のスポットが最初の経由地になる
export function splitWholeRoute(count: number, fromCurrentLocation: boolean): WholeRouteRange[] {
  if (count < 1) return [];
  const perUrl = MAX_WAYPOINTS + 2;
  // 点の並び：「現在地から」のときは先頭に現在地（0）を置く
  const points = fromCurrentLocation ? count + 1 : count;
  const toSpotNumber = (i: number) => (fromCurrentLocation ? Math.max(i, 1) : i + 1);
  const ranges: WholeRouteRange[] = [];
  for (let start = 0; start < points - 1; start += perUrl - 1) {
    const end = Math.min(start + perUrl - 1, points - 1);
    ranges.push({ from: toSpotNumber(start), to: toSpotNumber(end) });
  }
  return ranges;
}

function latLng(spot: Spot): string {
  return `${spot.lat},${spot.lng}`;
}

// 経由地は「緯度,経度」で書き、place_id は使わない。「|」もエンコードする（10.8）
export function buildWholeRouteUrls(
  spots: Spot[],
  mode: WholeRouteMode,
  fromCurrentLocation: boolean,
): string[] {
  if (spots.length === 0 || (spots.length === 1 && !fromCurrentLocation)) return [];
  return splitWholeRoute(spots.length, fromCurrentLocation).map((range, i) => {
    const useCurrent = fromCurrentLocation && i === 0;
    const part = spots.slice(range.from - 1, range.to);
    const origin = useCurrent ? null : part[0];
    const rest = useCurrent ? part : part.slice(1);
    const destination = rest[rest.length - 1];
    const waypoints = rest.slice(0, -1);
    const params: Array<[string, string]> = [['api', '1']];
    if (origin) params.push(['origin', latLng(origin)]);
    if (destination) params.push(['destination', latLng(destination)]);
    if (waypoints.length > 0) params.push(['waypoints', waypoints.map(latLng).join('|')]);
    params.push(['travelmode', TRAVEL_MODES[mode]]);
    const query = params
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${BASE_URL}?${query}`;
  });
}
