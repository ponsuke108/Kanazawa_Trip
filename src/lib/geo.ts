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
