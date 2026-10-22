// 画面と src/api/ の間で受け渡すデータの形（要件定義書 10.7）
// 全員が必ずこの型を使う。変更は要件定義書 12.2 の contract の手順で行う

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
  area: string;
  isActive: boolean; // 使用中止のスポットも、既存のプランの表示では返る
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
};
