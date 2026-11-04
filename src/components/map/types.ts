import type { Spot } from '@/types/models';

// MapView に渡すスポット（要件定義書 7.6 の spots: Spot[]）。Spot をそのまま渡せる。
// 地図に要る項目だけを取り出した形にしておき、テストでは一部だけで作れるようにする
export type MapSpot = Pick<Spot, 'id' | 'name' | 'lat' | 'lng' | 'spotType'> & {
  latestImageUrl?: string | null; // 写真のピン。null なら縁の色だけの丸（BR-24）
  hasActiveCampaign?: boolean; // キャンペーン中なら札（Ticket）を付ける（BR-24）
};

export type MapViewProps = {
  spots: MapSpot[];
  selectedSpotId?: number | null;
  onSelectSpot?: (spotId: number) => void;
  interactive?: boolean; // false なら動かせない（S-05 の小さな地図）
  fitToSpots?: boolean; // スポットがすべて入るように合わせる
  height: string; // CSS の高さ（'160px'、'100%' など）。高さのある親の中に置く
};
