// ブロックの整え方と確認（要件定義書 BR-03、BR-04、BR-06、BR-07、10.3、10.6、11.4）
import { toValidationIssue } from '@/api/errors';
import type {
  Block,
  DisplayBlock,
  MoveBlock,
  PlanDetail,
  PlanStatus,
  SavePlanInput,
  Spot,
  TransportMode,
  ValidationCode,
  ValidationIssue,
} from '@/types/models';

export const MAX_BLOCKS = 30; // BR-03
export const MAX_TITLE = 50; // BR-05
export const MAX_COMMENT = 500; // BR-05
export const DEFAULT_TRANSPORT: TransportMode = 'walk'; // BR-04

// ---- 作成画面の状態（11.4） ----

export type EditorBlock =
  | {
      key: string;
      type: 'spot';
      spot: Spot;
      transportMode: TransportMode | null;
      imagePath: string | null;
      imageUrl: string | null;
    }
  | { key: string; type: 'comment'; body: string };

export type EditorState = {
  version: 1; // 一時保存の形式の版
  planId: string | null; // 新規なら null
  originalStatus: PlanStatus | null; // 編集開始時の状態。公開中なら「下書き保存」を出さない
  sourcePlan: { id: string; authorName: string; title: string } | null;
  title: string;
  tagIds: number[];
  blocks: EditorBlock[];
  dirty: boolean; // 未保存の変更があるか
  savedAt: string | null; // 一時保存した日時
};

type Normalizable = { type: 'spot'; transportMode: TransportMode | null } | { type: 'comment' };

// 文字数（絵文字などのサロゲートペアも1文字と数える）
export function charLength(s: string): number {
  return [...s].length;
}

// ---- BR-04 ----

// 最初のスポットの移動手段を空にし、2つ目以降で空のものを「徒歩」にする。
// ブロックを変更するたびと、保存の直前に必ず呼ぶ
export function normalizeBlocks<T extends Normalizable>(blocks: T[]): T[] {
  let seenSpot = false;
  return blocks.map((b) => {
    if (b.type !== 'spot') return b;
    const spot = b as Extract<T, { type: 'spot' }>;
    if (!seenSpot) {
      seenSpot = true;
      return spot.transportMode === null ? b : { ...spot, transportMode: null };
    }
    return spot.transportMode === null ? { ...spot, transportMode: DEFAULT_TRANSPORT } : b;
  });
}

// 2つ目以降の各スポットブロックの直前に、移動手段ブロックを1つ差し込む。
// 間にコメントがある場合も、次のスポットの直前に入れる
export function toDisplayBlocks(blocks: Block[]): DisplayBlock[] {
  const out: DisplayBlock[] = [];
  let prev: Spot | null = null;
  for (const b of blocks) {
    if (b.type === 'spot') {
      if (prev) {
        const move: MoveBlock = {
          type: 'move',
          key: `${b.id}-move`,
          from: prev,
          to: b.spot,
          mode: b.transportMode ?? DEFAULT_TRANSPORT,
          targetBlockId: b.id,
        };
        out.push(move);
      }
      prev = b.spot;
    }
    out.push(b);
  }
  return out;
}

// 作成画面のブロックを表示用の Block に変換する（key を id として使う）
export function editorBlocksToBlocks(blocks: EditorBlock[]): Block[] {
  return blocks.map((b) =>
    b.type === 'spot'
      ? {
          id: b.key,
          type: 'spot',
          spot: b.spot,
          transportMode: b.transportMode,
          imagePath: b.imagePath,
          imageUrl: b.imageUrl,
        }
      : { id: b.key, type: 'comment', body: b.body },
  );
}

// ---- BR-06、10.6 ----

// 10.6 の順番（save_plan も同じ順番で最初のコードを返す）
const ORDER: ValidationCode[] = [
  'TITLE_REQUIRED',
  'TITLE_TOO_LONG',
  'SPOTS_TOO_FEW',
  'TAGS_REQUIRED',
  'BLOCKS_TOO_MANY',
  'COMMENT_TOO_LONG',
  'SAME_SPOT_ADJACENT',
  'TRANSPORT_INVALID',
];

export function validatePlan(input: SavePlanInput, mode: 'draft' | 'publish'): ValidationIssue[] {
  const found = new Set<ValidationCode>();
  const publish = mode === 'publish';
  const title = input.title.trim();
  const spots = input.blocks.filter((b) => b.type === 'spot');

  if (publish && title.length === 0) found.add('TITLE_REQUIRED');
  if (charLength(title) > MAX_TITLE) found.add('TITLE_TOO_LONG');
  if (publish && spots.length < 2) found.add('SPOTS_TOO_FEW');
  if (publish && input.tagIds.length === 0) found.add('TAGS_REQUIRED');
  if (input.blocks.length > MAX_BLOCKS) found.add('BLOCKS_TOO_MANY');
  if (input.blocks.some((b) => b.type === 'comment' && charLength(b.body.trim()) > MAX_COMMENT)) {
    found.add('COMMENT_TOO_LONG');
  }
  // BR-03：コメントを除いて隣り合う位置に同じスポットは置けない
  for (let i = 1; i < spots.length; i++) {
    const a = spots[i - 1];
    const b = spots[i];
    if (a.type === 'spot' && b.type === 'spot' && a.spotId === b.spotId) {
      found.add('SAME_SPOT_ADJACENT');
      break;
    }
  }
  // BR-04：最初のスポットは空、2つ目以降は必ず値を持つ
  spots.forEach((b, i) => {
    if (b.type !== 'spot') return;
    if ((i === 0) !== (b.transportMode === null)) found.add('TRANSPORT_INVALID');
  });

  return ORDER.filter((c) => found.has(c)).map(toValidationIssue);
}

// ---- 変換 ----

let keySeq = 0;
export function newBlockKey(): string {
  keySeq += 1;
  return `k-${Date.now().toString(36)}-${keySeq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyEditorState(): EditorState {
  return {
    version: 1,
    planId: null,
    originalStatus: null,
    sourcePlan: null,
    title: '',
    tagIds: [],
    blocks: [],
    dirty: false,
    savedAt: null,
  };
}

// 詳細データを編集用に変換する。コピー時は BR-07 のとおり、タイトルと写真を引き継がない
export function planToEditorState(plan: PlanDetail, { copy }: { copy: boolean }): EditorState {
  const blocks: EditorBlock[] = plan.blocks.map((b) =>
    b.type === 'spot'
      ? {
          key: copy ? newBlockKey() : b.id,
          type: 'spot',
          spot: b.spot,
          transportMode: b.transportMode,
          imagePath: copy ? null : b.imagePath,
          imageUrl: copy ? null : b.imageUrl,
        }
      : { key: copy ? newBlockKey() : b.id, type: 'comment', body: b.body },
  );
  return {
    version: 1,
    planId: copy ? null : plan.id,
    originalStatus: copy ? null : plan.status,
    sourcePlan: copy
      ? { id: plan.id, authorName: plan.author.displayName, title: plan.title }
      : plan.sourcePlan
        ? { id: plan.sourcePlan.id, authorName: plan.sourcePlan.authorName, title: '' }
        : null,
    title: copy ? '' : plan.title,
    tagIds: plan.tags.map((t) => t.id),
    blocks: normalizeBlocks(blocks),
    dirty: false,
    savedAt: null,
  };
}

// 保存用の入力を作る。タイトルの前後の空白と空のコメントを取り除き、BR-04 で整える（BR-05）
export function toSavePlanInput(state: EditorState, status: PlanStatus): SavePlanInput {
  const blocks = normalizeBlocks(
    state.blocks.filter((b) => b.type !== 'comment' || b.body.trim().length > 0),
  );
  return {
    id: state.planId,
    title: state.title.trim(),
    status,
    sourcePlanId: state.sourcePlan?.id ?? null,
    tagIds: [...state.tagIds].sort((a, b) => a - b),
    blocks: blocks.map((b) =>
      b.type === 'spot'
        ? {
            type: 'spot',
            spotId: b.spot.id,
            transportMode: b.transportMode,
            imagePath: b.imagePath,
          }
        : { type: 'comment', body: b.body.trim() },
    ),
  };
}
