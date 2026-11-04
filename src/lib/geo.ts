// （v11）位置の計算（要件定義書 11.1、BR-19、BR-24）。外部の API は呼ばない

export type LatLngBounds = { south: number; west: number; north: number; east: number };

// 金沢市を囲む四角の範囲（BR-19）。地図の範囲、isInKanazawa、Nominatim の viewbox で同じものを使う
export const KanazawaBounds: LatLngBounds = {
  south: 36.4,
  west: 136.5,
  north: 36.7,
  east: 136.9,
};

// 地図を動かせる範囲（BR-24）。KanazawaBounds を少し広げ、端のスポットも画面の中に寄せられるようにする
const MAP_MARGIN = 0.05;
export const MapMaxBounds: LatLngBounds = {
  south: KanazawaBounds.south - MAP_MARGIN,
  west: KanazawaBounds.west - MAP_MARGIN,
  north: KanazawaBounds.north + MAP_MARGIN,
  east: KanazawaBounds.east + MAP_MARGIN,
};

// 地図を初めに開く位置（金沢駅と兼六園の間あたり）
export const KanazawaCenter = { lat: 36.566, lng: 136.653 };

// BR-19 の範囲に入るか（住所で金沢市かを確かめるのは places.ts で行う）
export function isInKanazawa(lat: number, lng: number): boolean {
  return (
    lat >= KanazawaBounds.south &&
    lat <= KanazawaBounds.north &&
    lng >= KanazawaBounds.west &&
    lng <= KanazawaBounds.east
  );
}

type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

// 2点間の直線距離（km、球面での距離。ハバーサインの式）。
// データベースの関数 public.distance_m と同じ式（handoff 8.3）
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// 並び順に結んだ直線距離の合計（km。BR-22）
export function totalDistanceKm(stops: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const cur = stops[i];
    if (prev && cur) sum += distanceKm(prev, cur);
  }
  return sum;
}
