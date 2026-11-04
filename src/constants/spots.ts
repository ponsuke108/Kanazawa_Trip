// スポットの種類の表示（要件定義書 6.4 S-05、S-16）
import type { SpotType } from '@/types/models';

export const SpotTypeLabels: Record<SpotType, string> = {
  major: '定番',
  minor: '定番以外',
  hub: '起点',
};

// デモ用のスポット（金沢工業大学。9.7、BR-17）。スポット名の横に「デモ」のラベルを出す。
// Spot の型（10.7）にデモかどうかの項目がないため、id で判定する
export const DEMO_SPOT_IDS: readonly number[] = [90001];

export function isDemoSpot(spotId: number): boolean {
  return DEMO_SPOT_IDS.includes(spotId);
}

export const SPOT_POST_BODY_MAX = 300; // BR-21
export const SPOT_POST_IMAGES_MAX = 4; // BR-21
