// テスト用のスポットを作る（v11 の項目を既定値で埋める）。テストからだけ使う
import type { Spot } from '@/types/models';

export function testSpot(over: Partial<Spot> & Pick<Spot, 'id' | 'name'>): Spot {
  return {
    description: null,
    lat: 36.57,
    lng: 136.65,
    placeId: null,
    spotType: 'minor',
    area: null,
    isActive: true,
    source: 'curated',
    address: null,
    placeKind: null,
    postCount: 0,
    latestImageUrl: null,
    hasActiveCampaign: false,
    ...over,
  };
}
