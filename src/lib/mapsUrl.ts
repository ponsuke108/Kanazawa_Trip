// Googleマップの経路URLを作る（設計書 v3 5.5、F-07）
// APIキーは不要。URLを作って新しいタブで開くだけ。
import type { Spot, TransportMode } from '../types/models';

const TRAVEL_MODE: Record<TransportMode, string> = {
  walk: 'walking',
  bus: 'transit',
  bicycle: 'bicycling', // T2：日本で経路が出ない場合は 'walking' に変える
  car: 'driving',
};

export function buildDirectionsUrl(from: Spot, to: Spot, mode: TransportMode): string {
  const params = new URLSearchParams({ api: '1' });
  setPlace(params, 'origin', from);
  setPlace(params, 'destination', to);
  params.set('travelmode', TRAVEL_MODE[mode]);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// 場所IDがあれば名前と場所IDを、なければ「緯度,経度」を使う
function setPlace(params: URLSearchParams, key: 'origin' | 'destination', spot: Spot) {
  if (spot.placeId) {
    params.set(key, spot.name);
    params.set(`${key}_place_id`, spot.placeId);
  } else {
    params.set(key, `${spot.lat},${spot.lng}`);
  }
}
