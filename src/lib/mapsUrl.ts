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
