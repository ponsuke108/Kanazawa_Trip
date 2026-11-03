import type { Spot } from '@/types/models';

// MapView に渡すスポット（要件定義書 7.6 の spots: Spot[]）。
// latestImageUrl と hasActiveCampaign は v11 で Spot に足す項目（11.3。型の追加は I-27）。
// I-27 のあとは Spot をそのまま渡せる。それまでは無いものとして扱う
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
