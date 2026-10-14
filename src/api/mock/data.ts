// モックデータ（要件定義書 9.7 をそのまま）
import type { PlanStatus, Spot, Tag, TransportMode } from '@/types/models';

export const mockSpots: Spot[] = [
  {
    id: 1,
    name: '金沢駅',
    spotType: 'hub',
    area: '金沢駅周辺',
    description: '鼓門ともてなしドームが迎える金沢の玄関口。多くの路線バスがここから出る',
    lat: 36.578342,
    lng: 136.647983,
    placeId: null,
    isActive: true,
  },
  {
    id: 2,
    name: '近江町市場',
    spotType: 'major',
    area: '近江町市場周辺',
    description: '鮮魚や青果の店が並ぶ「金沢の台所」。海鮮丼や食べ歩きが楽しめる',
    lat: 36.571665,
    lng: 136.656146,
    placeId: null,
    isActive: true,
  },
  {
    id: 3,
    name: '長町武家屋敷跡界隈',
    spotType: 'major',
    area: '香林坊・長町武家屋敷跡周辺',
    description: '土塀と石畳の路地が続く、加賀藩士の屋敷が並んでいた一帯',
    lat: 36.563617,
    lng: 136.65076,
    placeId: null,
    isActive: true,
  },
  {
    id: 4,
    name: '金沢21世紀美術館',
    spotType: 'major',
    area: '兼六園周辺',
    description: 'ガラス張りの円形の建物が目印の現代美術館。無料で入れる場所もある',
    lat: 36.560896,
    lng: 136.658152,
    placeId: null,
    isActive: true,
  },
  {
    id: 5,
    name: '兼六園',
    spotType: 'major',
    area: '兼六園周辺',
    description: '日本三名園の一つに数えられる加賀藩の大名庭園。冬の雪吊りが有名',
    lat: 36.562128,
    lng: 136.662652,
    placeId: null,
    isActive: true,
  },
  {
    id: 6,
    name: '金沢城公園・玉泉院丸庭園',
    spotType: 'major',
    area: '兼六園周辺',
    description: '加賀藩前田家の居城跡。復元された櫓や門と、夜のライトアップが見どころ',
    lat: 36.565771,
    lng: 136.659622,
    placeId: null,
    isActive: true,
  },
  {
    id: 7,
    name: 'ひがし茶屋街',
    spotType: 'major',
    area: 'ひがし茶屋街周辺',
    description: '格子戸の茶屋建築が並ぶ、金沢を代表する茶屋街',
    lat: 36.57263,
    lng: 136.666446,
    placeId: null,
    isActive: true,
  },
  {
    id: 8,
    name: 'にし茶屋街',
    spotType: 'minor',
    area: '寺町・にし茶屋街周辺',
    description: '犀川の近くにある小さな茶屋街。ひがし茶屋街より落ち着いた雰囲気',
    lat: 36.556757,
    lng: 136.647402,
    placeId: null,
    isActive: true,
  },
  {
    id: 9,
    name: '妙立寺（忍者寺）',
    spotType: 'minor',
    area: '寺町・にし茶屋街周辺',
    description: '隠し階段や落とし穴など仕掛けの多い寺。「忍者寺」と呼ばれる。見学は予約制',
    lat: 36.555384,
    lng: 136.648997,
    placeId: null,
    isActive: true,
  },
  {
    id: 10,
    name: '尾山神社',
    spotType: 'minor',
    area: '香林坊・長町武家屋敷跡周辺',
    description: '前田利家とまつを祀る神社。ステンドグラスのある神門が珍しい',
    lat: 36.566081,
    lng: 136.655416,
    placeId: null,
    isActive: true,
  },
  {
    id: 11,
    name: '鈴木大拙館',
    spotType: 'minor',
    area: '兼六園周辺',
    description: '仏教哲学者・鈴木大拙を伝える館。水鏡の庭で静かに過ごせる',
    lat: 36.557822,
    lng: 136.661199,
    placeId: null,
    isActive: true,
  },
  {
    id: 12,
    name: '国立工芸館',
    spotType: 'minor',
    area: '兼六園周辺',
    description: '東京から移転した工芸とデザインの国立美術館。明治期の建物を活用している',
    lat: 36.559034,
    lng: 136.661715,
    placeId: null,
    isActive: true,
  },
  {
    id: 13,
    name: '石川県立図書館',
    spotType: 'minor',
    area: 'その他',
    description: '円形の大閲覧室が特徴の図書館。本に囲まれた空間を見に訪れる人も多い',
    lat: 36.548953,
    lng: 136.679911,
    placeId: null,
    isActive: true,
  },
];

export const mockTags: Tag[] = [
  { id: 1, name: '食事', slug: 'food', group: 'theme' },
  { id: 2, name: '景観', slug: 'scenery', group: 'theme' },
  { id: 3, name: '歴史', slug: 'history', group: 'theme' },
  { id: 4, name: '写真', slug: 'photo', group: 'theme' },
  { id: 5, name: 'ゆったり', slug: 'relaxed', group: 'theme' },
  { id: 6, name: '時短', slug: 'quick', group: 'theme' },
  { id: 7, name: 'コスパ', slug: 'budget', group: 'theme' },
  { id: 8, name: 'くつろぎ', slug: 'cozy', group: 'theme' },
  { id: 9, name: '晴れ', slug: 'sunny', group: 'weather' },
  { id: 10, name: '雨', slug: 'rainy', group: 'weather' },
  { id: 11, name: '曇り', slug: 'cloudy', group: 'weather' },
];

export type MockUser = { id: string; displayName: string; email: string };

export const MOCK_TARO: MockUser = {
  id: 'mock-user-taro',
  displayName: 'テスト太郎',
  email: 'taro@example.com',
};

export const MOCK_HANAKO: MockUser = {
  id: 'mock-user-hanako',
  displayName: 'テスト花子',
  email: 'hanako@example.com',
};

export const mockUsers: MockUser[] = [MOCK_TARO, MOCK_HANAKO];

// ブロックの定義。spot の transportMode は「そのスポットへ何で来たか」（BR-04）
export type MockBlockSeed =
  | { type: 'spot'; spotId: number; transportMode: TransportMode | null }
  | { type: 'comment'; body: string };

export type MockPlanSeed = {
  id: string;
  title: string;
  userId: string;
  status: PlanStatus;
  tagIds: number[];
  sourcePlanId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  // いいね数のうち、モックの利用者（テスト太郎・テスト花子）以外が付けた分
  otherLikes: number;
  blocks: MockBlockSeed[];
};

export const mockPlans: MockPlanSeed[] = [
  {
    id: 'mock-plan-1',
    title: 'にぎわいを避けて歩く寺町・にし茶屋街',
    userId: MOCK_HANAKO.id,
    status: 'published',
    tagIds: [3, 5, 4], // 歴史、ゆったり、写真
    sourcePlanId: null,
    publishedAt: '2026-10-05T10:00:00+09:00',
    updatedAt: '2026-10-05T10:00:00+09:00',
    createdAt: '2026-10-05T10:00:00+09:00',
    otherLikes: 4, // テスト太郎のいいねと合わせて 5
    blocks: [
      { type: 'spot', spotId: 1, transportMode: null },
      { type: 'spot', spotId: 3, transportMode: 'bus' },
      { type: 'spot', spotId: 8, transportMode: 'walk' },
      { type: 'comment', body: 'ひがし茶屋街より人が少なく、写真が撮りやすい' },
      { type: 'spot', spotId: 9, transportMode: 'walk' },
      { type: 'comment', body: '見学は予約制なので事前に申し込む' },
    ],
  },
  {
    id: 'mock-plan-2',
    title: '初めての金沢 定番1日コース',
    userId: MOCK_TARO.id,
    status: 'published',
    tagIds: [2, 1, 4], // 景観、食事、写真
    sourcePlanId: null,
    publishedAt: '2026-10-01T10:00:00+09:00',
    updatedAt: '2026-10-01T10:00:00+09:00',
    createdAt: '2026-10-01T10:00:00+09:00',
    otherLikes: 8,
    blocks: [
      { type: 'spot', spotId: 1, transportMode: null },
      { type: 'spot', spotId: 2, transportMode: 'bus' },
      { type: 'comment', body: '海鮮丼は朝のうちが空いている' },
      { type: 'spot', spotId: 4, transportMode: 'walk' },
      { type: 'spot', spotId: 5, transportMode: 'walk' },
      { type: 'spot', spotId: 6, transportMode: 'walk' },
      { type: 'spot', spotId: 7, transportMode: 'bus' },
    ],
  },
  {
    id: 'mock-plan-3',
    title: '',
    userId: MOCK_TARO.id,
    status: 'draft',
    tagIds: [],
    sourcePlanId: null,
    publishedAt: null,
    updatedAt: '2026-10-10T10:00:00+09:00',
    createdAt: '2026-10-10T10:00:00+09:00',
    otherLikes: 0,
    blocks: [
      { type: 'spot', spotId: 4, transportMode: null },
      { type: 'spot', spotId: 12, transportMode: 'walk' },
      { type: 'spot', spotId: 11, transportMode: 'walk' },
    ],
  },
  {
    id: 'mock-plan-4',
    title: '定番コースに尾山神社を足したプラン',
    userId: MOCK_HANAKO.id,
    status: 'published',
    tagIds: [3, 6], // 歴史、時短
    sourcePlanId: 'mock-plan-2',
    publishedAt: '2026-10-08T10:00:00+09:00',
    updatedAt: '2026-10-08T10:00:00+09:00',
    createdAt: '2026-10-08T10:00:00+09:00',
    otherLikes: 1, // テスト太郎のいいねと合わせて 2
    blocks: [
      { type: 'spot', spotId: 1, transportMode: null },
      { type: 'spot', spotId: 2, transportMode: 'bus' },
      { type: 'spot', spotId: 10, transportMode: 'walk' },
      { type: 'spot', spotId: 6, transportMode: 'walk' },
      { type: 'spot', spotId: 5, transportMode: 'walk' },
    ],
  },
];

// テスト太郎のいいね（mock-plan-1、mock-plan-4）
export const mockLikes: Array<{ userId: string; planId: string; createdAt: string }> = [
  { userId: MOCK_TARO.id, planId: 'mock-plan-1', createdAt: '2026-10-06T10:00:00+09:00' },
  { userId: MOCK_TARO.id, planId: 'mock-plan-4', createdAt: '2026-10-09T10:00:00+09:00' },
];
