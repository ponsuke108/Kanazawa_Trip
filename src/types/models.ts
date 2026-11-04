// 画面と src/api/ の間で受け渡すデータの形（要件定義書 10.7）
// 画面と api の受け渡しには必ずこの型を使う。形を変える場合は要件定義書 12.2 の手順に従う

export type TransportMode = 'walk' | 'bus' | 'bicycle' | 'car';
export type PlanStatus = 'draft' | 'published';
export type SpotType = 'major' | 'minor' | 'hub';

export type Spot = {
  id: number;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  spotType: SpotType;
  area: string | null; // （v11）利用者のスポットは null
  isActive: boolean; // 使用中止のスポットも、既存のプランの表示では返る
  // ---- v11 で足す項目 ----
  source: 'curated' | 'user';
  address: string | null; // 利用者のスポットの住所
  placeKind: string | null; // 「観光名所」など（9.8）
  postCount: number;
  latestImageUrl: string | null;
  hasActiveCampaign: boolean;
};

export type Tag = {
  id: number;
  slug: string;
  name: string;
  group: 'theme' | 'weather';
};

export type SpotBlock = {
  id: string;
  type: 'spot';
  spot: Spot;
  transportMode: TransportMode | null; // 最初のスポットは null（BR-04）
  imagePath: string | null;
  imageUrl: string | null;
};

export type CommentBlock = {
  id: string;
  type: 'comment';
  body: string;
};

export type Block = SpotBlock | CommentBlock;

export type MoveBlock = {
  type: 'move';
  key: string; // 表示用のキー（到着側ブロックのID + '-move'）
  from: Spot;
  to: Spot;
  mode: TransportMode;
  targetBlockId: string; // 移動手段を変えるときに更新するスポットブロックのID
};

export type DisplayBlock = Block | MoveBlock;

export type PlanDetail = {
  id: string;
  title: string;
  status: PlanStatus;
  author: { id: string; displayName: string };
  sourcePlan: { id: string; authorName: string } | null; // BR-07
  tags: Tag[];
  likeCount: number;
  publishedAt: string | null;
  updatedAt: string;
  blocks: Block[];
};

export type PlanSummary = {
  id: string;
  title: string;
  status: PlanStatus;
  authorId: string;
  authorName: string;
  likeCount: number;
  spotCount: number;
  spotNames: string[];
  tagIds: number[];
  hasMinorSpot: boolean;
  coverImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type SearchResult = {
  items: PlanSummary[];
  totalCount: number;
  hasMore: boolean;
};

export type SavePlanInput = {
  id: string | null; // null なら新規
  title: string;
  status: PlanStatus;
  sourcePlanId: string | null;
  tagIds: number[];
  blocks: Array<
    | {
        type: 'spot';
        spotId: number;
        transportMode: TransportMode | null;
        imagePath: string | null;
      }
    | { type: 'comment'; body: string }
  >;
};

export type ValidationCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_LONG'
  | 'SPOTS_TOO_FEW'
  | 'TAGS_REQUIRED'
  | 'BLOCKS_TOO_MANY'
  | 'COMMENT_TOO_LONG'
  | 'SAME_SPOT_ADJACENT'
  | 'TRANSPORT_INVALID';

export type ValidationIssue = {
  code: ValidationCode;
  message: string;
  step: 'blocks' | 'info'; // 直すステップ
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole; // v11
};

// ---- ここから v11 で増える型 ----
export type UserRole = 'user' | 'official' | 'admin';

export type SpotDetail = Spot & {
  campaign: Campaign | null; // キャンペーン中なら
  shopName: string | null;
};

export type PlaceCandidate = {
  osmRef: string; // 'node/2146147847' など
  name: string;
  lat: number;
  lng: number;
  address: string;
  placeKind: string;
  existingSpotId: number | null; // すでに登録されていれば
};

export type SpotOrCandidate =
  { kind: 'spot'; spot: Spot } | { kind: 'candidate'; candidate: PlaceCandidate };

export type ListSummary = {
  id: string;
  name: string;
  spotCount: number;
  spotIds: number[]; // リストを選ぶシートで「入っています」を出すため
  firstSpotNames: string[]; // 最初の3つ
  updatedAt: string;
};

export type ListDetail = {
  id: string;
  name: string;
  spots: Spot[]; // 入れた順。使用中止のものも返す
  updatedAt: string;
};

export type RouteStop = {
  spot: Spot;
  numbers: number[]; // 同じスポットが2回なら [1, 5]
  blockIds: string[];
};

export type SpotPost = {
  id: string;
  spot: { id: number; name: string };
  author: { id: string; displayName: string };
  body: string;
  imageUrls: string[];
  isCampaign: boolean; // 「キャンペーン参加」のラベル
  isHidden: boolean;
  rewardId: string | null; // 本人の有効な特典（getMySpotPosts だけ）
  createdAt: string;
  updatedAt: string;
};

export type SaveSpotPostInput = {
  id: string | null; // null なら新規
  spotId: number;
  body: string;
  imagePaths: string[]; // 1〜4枚
  position: { lat: number; lng: number; accuracy: number } | null; // キャンペーン中のお店で確かめた位置（保存しない）
};

export type Campaign = {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  benefit: string;
  notice: string;
  description: string;
  imageUrl: string | null;
  startsOn: string; // YYYY-MM-DD
  endsOn: string;
  status: 'active' | 'ended' | 'stopped';
};

export type CampaignInput = Omit<Campaign, 'id' | 'shopId' | 'shopName' | 'imageUrl' | 'status'> & {
  id: string | null;
  imagePath: string | null;
};

export type CampaignReward = {
  id: string;
  campaign: Campaign;
  issuedAt: string;
  expiresAt: string; // 受け取った日の 23:59（日本時間）
  usedAt: string | null;
};

export type ShopApplication = {
  id: string;
  spot: { id: number; name: string };
  shopName: string;
  introduction: string;
  contactName: string; // 本人と管理者だけに返る
  contactEmail: string;
  contactPhone: string;
  campaignDraft: CampaignInput | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type ApplicationInput = Omit<
  ShopApplication,
  'id' | 'spot' | 'status' | 'rejectReason' | 'createdAt' | 'reviewedAt'
> & {
  spotId: number;
};

export type ShopDetail = {
  id: string;
  spot: { id: number; name: string };
  name: string;
  introduction: string;
  status: 'active' | 'suspended';
  campaign: Campaign | null;
  rewardCount: number;
  usedRewardCount: number;
};
