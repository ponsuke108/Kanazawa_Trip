// 画面と src/api/ の間で受け渡すデータの形（設計書 v3 5.6）
// 3人ともこの型を使い、勝手に変えない。変更はDB担当（C）に依頼する。

export type TransportMode = 'walk' | 'bus' | 'bicycle' | 'car';
export type PlanStatus = 'draft' | 'published';

export type Spot = {
  id: number;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  isMajor: boolean;
};

export type Tag = {
  id: number;
  slug: string; // アイコンとの対応に使う（9.2）
  name: string;
  group: 'theme' | 'weather';
};

// データベースに保存されるブロック
export type SpotBlock = {
  id: string;
  type: 'spot';
  spot: Spot;
  transportMode: TransportMode | null; // このスポットへの到着手段。最初のスポットは null
  imageUrl: string | null;
};

export type CommentBlock = {
  id: string;
  type: 'comment';
  body: string;
};

export type Block = SpotBlock | CommentBlock;

// 画面表示用。移動手段ブロックは toDisplayBlocks() で差し込む
export type MoveBlock = {
  type: 'move';
  from: Spot;
  to: Spot;
  mode: TransportMode;
  targetBlockId: string; // 移動手段を変えたとき、どのスポットブロックを更新するか
};

export type DisplayBlock = Block | MoveBlock;

// プラン詳細（getPlan の戻り値）
export type PlanDetail = {
  id: string;
  title: string;
  status: PlanStatus;
  author: { id: string; displayName: string };
  sourcePlan: { id: string; authorName: string } | null;
  tags: Tag[];
  likeCount: number;
  publishedAt: string | null;
  updatedAt: string;
  blocks: Block[];
};

// 一覧・検索・ランキング・マイページのカード
export type PlanSummary = {
  id: string;
  title: string;
  status: PlanStatus;
  authorName: string;
  likeCount: number;
  spotCount: number;
  spotNames: string[];
  hasMinorSpot: boolean;
  coverImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

// savePlan の入力
export type SavePlanInput = {
  id: string | null;
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
