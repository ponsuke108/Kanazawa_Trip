// モックデータ（要件定義書 9.7 をそのまま）
import type { PlanStatus, Spot, Tag, TransportMode, UserRole } from '@/types/models';

// 9.7 の13件（開発側の登録）。v11 の項目は下の curated() で埋める
type CuratedSeed = Pick<
  Spot,
  'id' | 'name' | 'spotType' | 'area' | 'description' | 'lat' | 'lng' | 'placeId' | 'isActive'
>;

const curatedSeeds: CuratedSeed[] = [
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

// v11 の項目の既定値。投稿の数・写真・キャンペーンは mockApi で投稿とキャンペーンから計算する
function v11Defaults(): Pick<
  Spot,
  'source' | 'address' | 'placeKind' | 'postCount' | 'latestImageUrl' | 'hasActiveCampaign'
> {
  return {
    source: 'curated',
    address: null,
    placeKind: null,
    postCount: 0,
    latestImageUrl: null,
    hasActiveCampaign: false,
  };
}

function curated(seed: CuratedSeed): Spot {
  return { ...seed, ...v11Defaults() };
}

// （v11）デモ用のスポット（9.7）。本番とモックの両方に入れる
export const MOCK_DEMO_SPOT_ID = 90001;

// （v11）モックの追加データ（9.7）：利用者のスポット。100002 はモック専用の架空のお店
const userSpots: Spot[] = [
  {
    ...v11Defaults(),
    id: 100001,
    name: '金沢港クルーズターミナル',
    spotType: 'minor',
    area: null,
    description: null,
    lat: 36.6079,
    lng: 136.6145,
    placeId: null,
    isActive: true,
    source: 'user',
    address: '石川県金沢市無量寺町',
    placeKind: '建物',
  },
  {
    ...v11Defaults(),
    id: 100002,
    name: 'テスト茶房',
    spotType: 'minor',
    area: null,
    description: null,
    lat: 36.557,
    lng: 136.648,
    placeId: null,
    isActive: true,
    source: 'user',
    address: '石川県金沢市野町',
    placeKind: '飲食店',
  },
];

export const mockSpots: Spot[] = [
  ...curatedSeeds.map(curated),
  {
    ...v11Defaults(),
    id: MOCK_DEMO_SPOT_ID,
    name: '金沢工業大学',
    spotType: 'minor',
    area: 'その他',
    description: '扇が丘キャンパス。このサイトのデモで、お店の申請とキャンペーンを試すために使う',
    lat: 36.530922,
    lng: 136.627583,
    placeId: null,
    isActive: true,
    address: '石川県野々市市扇が丘7-1',
    placeKind: '場所',
  },
  ...userSpots,
];

// 利用者のスポットの osm_ref（BR-20 の重複の確かめに使う。Spot の型には含めない）
export const mockOsmRefs: Record<number, string> = {
  [MOCK_DEMO_SPOT_ID]: 'way/295949646',
  100001: 'way/884746182',
  100002: 'node/0000000001',
};

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

export type MockUser = { id: string; displayName: string; email: string; role: UserRole };

// （v11）テスト太郎は一般、テスト花子は管理者、テスト茶房はお店（9.7）
export const MOCK_TARO: MockUser = {
  id: 'mock-user-taro',
  displayName: 'テスト太郎',
  email: 'taro@example.com',
  role: 'user',
};

export const MOCK_HANAKO: MockUser = {
  id: 'mock-user-hanako',
  displayName: 'テスト花子',
  email: 'hanako@example.com',
  role: 'admin',
};

export const MOCK_SHOP_USER: MockUser = {
  id: 'mock-user-shop',
  displayName: 'テスト茶房',
  email: 'shop@example.com',
  role: 'official',
};

// 管理者の画面の確認用の、架空の申請者（9.7）。ログインには使わない
export const MOCK_APPLICANT: MockUser = {
  id: 'mock-user-applicant',
  displayName: 'テスト雑貨店の人',
  email: 'applicant@example.com',
  role: 'user',
};

export const mockUsers: MockUser[] = [MOCK_TARO, MOCK_HANAKO, MOCK_SHOP_USER, MOCK_APPLICANT];

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

// ---- （v11）モックの追加データ（9.7） ----

// テスト太郎のリスト。スポットは入れた順
export const mockLists: Array<{
  id: string;
  userId: string;
  name: string;
  updatedAt: string;
  spotIds: number[];
}> = [
  {
    id: 'mock-list-1',
    userId: MOCK_TARO.id,
    name: '冬の金沢 1日目',
    updatedAt: '2026-11-02T10:00:00+09:00',
    spotIds: [1, 2, 11, 8, 100001],
  },
  {
    id: 'mock-list-2',
    userId: MOCK_TARO.id,
    name: '雨の日',
    updatedAt: '2026-11-01T10:00:00+09:00',
    spotIds: [13, 12],
  },
];

// スポットの投稿。モックの写真は用意しない（写真がないときの表示になる。本物では写真は必須）
export const mockSpotPosts: Array<{
  id: string;
  userId: string;
  spotId: number;
  body: string;
  createdAt: string;
}> = [
  {
    id: 'mock-post-1',
    userId: MOCK_HANAKO.id,
    spotId: 8,
    body: '朝のうちは人が少なく、格子の町並みがゆっくり見られた',
    createdAt: '2026-11-02T09:00:00+09:00',
  },
  {
    id: 'mock-post-2',
    userId: MOCK_TARO.id,
    spotId: 100001,
    body: '夕方に行くと海に沈む夕日が見られる',
    createdAt: '2026-11-03T17:30:00+09:00',
  },
];

// お店とキャンペーン（モック専用の架空のお店。実在のお店の名前や連絡先は入れない）
export const MOCK_SHOP = {
  id: 'mock-shop-1',
  spotId: 100002,
  ownerId: MOCK_SHOP_USER.id,
  name: 'テスト茶房',
  introduction: 'にし茶屋街の近くの、モック専用の架空のお店です',
};

export const mockCampaign = {
  id: 'mock-campaign-1',
  shopId: MOCK_SHOP.id,
  shopName: MOCK_SHOP.name,
  title: '投稿で抹茶ラテ割引',
  benefit: '抹茶ラテ 100円引き',
  notice: 'お店で写真を撮って投稿すると、抹茶ラテが100円引きになります',
  description: '特典は1人1回、受け取った日のうちに使えます。投稿の内容は自由です',
  imageUrl: null,
  startsOn: '2026-11-01',
  endsOn: '2026-12-31',
  status: 'active' as const,
};

// 管理者の画面の確認用の、審査中の申請（9.7）。連絡先は example.com の架空のもの
export const mockApplications = [
  {
    id: 'mock-application-1',
    userId: MOCK_APPLICANT.id,
    spotId: 100001,
    shopName: 'テスト雑貨店',
    introduction: 'モック専用の架空の雑貨店です',
    contactName: 'テスト 担当',
    contactEmail: 'zakka@example.com',
    contactPhone: '076-000-0000',
    campaignDraft: null,
    status: 'pending' as const,
    rejectReason: null,
    createdAt: '2026-11-04T10:00:00+09:00',
    reviewedAt: null,
  },
];

// 場所の検索（searchPlaces）のモックの候補。名前に入力の文字を含むものを返す
export const mockPlaceCandidates = [
  {
    osmRef: 'way/884746182',
    name: '金沢港クルーズターミナル',
    lat: 36.6079,
    lng: 136.6145,
    address: '石川県金沢市無量寺町',
    placeKind: '建物',
  },
  {
    osmRef: 'node/2146147847',
    name: 'にし茶屋街',
    lat: 36.55676,
    lng: 136.6474,
    address: '石川県金沢市野町',
    placeKind: '観光名所',
  },
  {
    // 金沢市の外（白山市）。BR-20 の確かめで登録できないことを確かめる
    osmRef: 'way/0000000002',
    name: '白山比咩神社',
    lat: 36.4366,
    lng: 136.6285,
    address: '石川県白山市三宮町',
    placeKind: '寺社',
  },
];
