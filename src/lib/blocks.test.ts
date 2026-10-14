import { describe, expect, it } from 'vitest';
import { mockSpots } from '@/api/mock/data';
import {
  normalizeBlocks,
  planToEditorState,
  toDisplayBlocks,
  toSavePlanInput,
  validatePlan,
} from '@/lib/blocks';
import type { Block, PlanDetail, SavePlanInput, Spot, TransportMode } from '@/types/models';

const spot = (id: number): Spot => mockSpots.find((s) => s.id === id)!;

function sb(id: string, spotId: number, mode: TransportMode | null): Block {
  return {
    id,
    type: 'spot',
    spot: spot(spotId),
    transportMode: mode,
    imagePath: null,
    imageUrl: null,
  };
}
function cb(id: string, body: string): Block {
  return { id, type: 'comment', body };
}
const modes = (blocks: Block[]) =>
  blocks.filter((b) => b.type === 'spot').map((b) => (b.type === 'spot' ? b.transportMode : null));

describe('normalizeBlocks（BR-04）', () => {
  it('先頭のスポットの移動手段が空になる', () => {
    expect(modes(normalizeBlocks([sb('a', 1, 'bus'), sb('b', 2, 'walk')]))).toEqual([null, 'walk']);
  });

  it('2つ目以降が空なら徒歩になる', () => {
    expect(modes(normalizeBlocks([sb('a', 1, null), sb('b', 2, null), sb('c', 3, 'car')]))).toEqual(
      [null, 'walk', 'car'],
    );
  });

  it('先頭がコメントでも、最初のスポットの移動手段が空になる', () => {
    expect(modes(normalizeBlocks([cb('c', 'メモ'), sb('a', 1, 'bus'), sb('b', 2, 'bus')]))).toEqual(
      [null, 'bus'],
    );
  });

  it('並べ替えで最初になったスポットは空、最初でなくなったスポットは徒歩になる', () => {
    const original = normalizeBlocks([sb('a', 1, null), sb('b', 2, 'bus'), sb('c', 3, 'car')]);
    const reordered = [original[1], original[0], original[2]];
    const result = normalizeBlocks(reordered);
    expect(result.map((b) => b.id)).toEqual(['b', 'a', 'c']);
    expect(modes(result)).toEqual([null, 'walk', 'car']);
  });

  it('元の配列を変更しない', () => {
    const input = [sb('a', 1, 'bus')];
    normalizeBlocks(input);
    expect(modes(input)).toEqual(['bus']);
  });
});

describe('toDisplayBlocks（BR-04）', () => {
  it('2つ目以降の各スポットの直前に移動手段ブロックが1つ入る', () => {
    const display = toDisplayBlocks([sb('a', 1, null), sb('b', 2, 'bus'), sb('c', 3, 'walk')]);
    expect(display.map((d) => d.type)).toEqual(['spot', 'move', 'spot', 'move', 'spot']);
    const moves = display.filter((d) => d.type === 'move');
    expect(
      moves.map((m) =>
        m.type === 'move' ? [m.from.id, m.to.id, m.mode, m.targetBlockId, m.key] : [],
      ),
    ).toEqual([
      [1, 2, 'bus', 'b', 'b-move'],
      [2, 3, 'walk', 'c', 'c-move'],
    ]);
  });

  it('間にコメントがある場合も、次のスポットの直前に入る', () => {
    const display = toDisplayBlocks([
      sb('a', 1, null),
      cb('x', 'メモ'),
      sb('b', 2, 'walk'),
      cb('y', '最後'),
    ]);
    expect(display.map((d) => d.type)).toEqual(['spot', 'comment', 'move', 'spot', 'comment']);
  });

  it('スポットが1つだけなら移動手段ブロックは入らない', () => {
    expect(toDisplayBlocks([cb('x', 'メモ'), sb('a', 1, null)]).map((d) => d.type)).toEqual([
      'comment',
      'spot',
    ]);
  });
});

describe('validatePlan（BR-06、10.6）', () => {
  const valid: SavePlanInput = {
    id: null,
    title: '金沢の旅',
    status: 'published',
    sourcePlanId: null,
    tagIds: [1],
    blocks: [
      { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
      { type: 'comment', body: 'メモ' },
      { type: 'spot', spotId: 2, transportMode: 'bus', imagePath: null },
    ],
  };
  const codes = (input: SavePlanInput, mode: 'draft' | 'publish') =>
    validatePlan(input, mode).map((i) => i.code);

  it('条件を満たせば問題なし', () => {
    expect(codes(valid, 'publish')).toEqual([]);
    expect(codes(valid, 'draft')).toEqual([]);
  });

  it('TITLE_REQUIRED は公開だけ', () => {
    const input = { ...valid, title: '  ' };
    expect(codes(input, 'publish')).toEqual(['TITLE_REQUIRED']);
    expect(codes(input, 'draft')).toEqual([]);
  });

  it('TITLE_TOO_LONG は下書きでも公開でも', () => {
    const input = { ...valid, title: 'あ'.repeat(51) };
    expect(codes(input, 'publish')).toEqual(['TITLE_TOO_LONG']);
    expect(codes(input, 'draft')).toEqual(['TITLE_TOO_LONG']);
    expect(codes({ ...valid, title: 'あ'.repeat(50) }, 'publish')).toEqual([]);
  });

  it('SPOTS_TOO_FEW は公開だけ', () => {
    const input = { ...valid, blocks: [valid.blocks[0]] };
    expect(codes(input, 'publish')).toEqual(['SPOTS_TOO_FEW']);
    expect(codes(input, 'draft')).toEqual([]);
  });

  it('TAGS_REQUIRED は公開だけ', () => {
    const input = { ...valid, tagIds: [] };
    expect(codes(input, 'publish')).toEqual(['TAGS_REQUIRED']);
    expect(codes(input, 'draft')).toEqual([]);
  });

  it('BLOCKS_TOO_MANY は下書きでも公開でも（30個まで）', () => {
    const comments = Array.from({ length: 29 }, () => ({ type: 'comment' as const, body: 'x' }));
    const ok = { ...valid, blocks: [valid.blocks[0], valid.blocks[2], ...comments.slice(0, 28)] };
    expect(codes(ok, 'draft')).toEqual([]);
    const ng = { ...valid, blocks: [valid.blocks[0], valid.blocks[2], ...comments] };
    expect(codes(ng, 'draft')).toEqual(['BLOCKS_TOO_MANY']);
    expect(codes(ng, 'publish')).toEqual(['BLOCKS_TOO_MANY']);
  });

  it('COMMENT_TOO_LONG は下書きでも公開でも', () => {
    const input = {
      ...valid,
      blocks: [...valid.blocks, { type: 'comment' as const, body: 'あ'.repeat(501) }],
    };
    expect(codes(input, 'draft')).toEqual(['COMMENT_TOO_LONG']);
    expect(codes(input, 'publish')).toEqual(['COMMENT_TOO_LONG']);
  });

  it('SAME_SPOT_ADJACENT はコメントを挟んでも隣り合う同じスポット', () => {
    const input: SavePlanInput = {
      ...valid,
      blocks: [
        { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
        { type: 'comment', body: 'メモ' },
        { type: 'spot', spotId: 1, transportMode: 'walk', imagePath: null },
      ],
    };
    expect(codes(input, 'draft')).toEqual(['SAME_SPOT_ADJACENT']);
    expect(codes(input, 'publish')).toEqual(['SAME_SPOT_ADJACENT']);
  });

  it('同じスポットでも隣り合わなければよい（金沢駅に戻る）', () => {
    const input: SavePlanInput = {
      ...valid,
      blocks: [
        { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
        { type: 'spot', spotId: 2, transportMode: 'bus', imagePath: null },
        { type: 'spot', spotId: 1, transportMode: 'bus', imagePath: null },
      ],
    };
    expect(codes(input, 'publish')).toEqual([]);
  });

  it('TRANSPORT_INVALID は移動手段が BR-04 に合わないとき', () => {
    const first: SavePlanInput = {
      ...valid,
      blocks: [
        { type: 'spot', spotId: 1, transportMode: 'bus', imagePath: null },
        { type: 'spot', spotId: 2, transportMode: 'bus', imagePath: null },
      ],
    };
    expect(codes(first, 'draft')).toEqual(['TRANSPORT_INVALID']);
    const second: SavePlanInput = {
      ...valid,
      blocks: [
        { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
        { type: 'spot', spotId: 2, transportMode: null, imagePath: null },
      ],
    };
    expect(codes(second, 'publish')).toEqual(['TRANSPORT_INVALID']);
  });

  it('メッセージと直すステップが 10.6 のとおり', () => {
    const issues = validatePlan({ ...valid, title: '', tagIds: [], blocks: [] }, 'publish');
    expect(issues).toEqual([
      { code: 'TITLE_REQUIRED', message: 'タイトルを入力してください', step: 'info' },
      { code: 'SPOTS_TOO_FEW', message: 'スポットを2つ以上追加してください', step: 'blocks' },
      { code: 'TAGS_REQUIRED', message: 'タグを1つ以上選んでください', step: 'info' },
    ]);
  });
});

describe('planToEditorState・toSavePlanInput（BR-07）', () => {
  const plan: PlanDetail = {
    id: 'p1',
    title: '元のタイトル',
    status: 'published',
    author: { id: 'u1', displayName: 'テスト花子' },
    sourcePlan: null,
    tags: [{ id: 3, name: '歴史', slug: 'history', group: 'theme' }],
    likeCount: 0,
    publishedAt: '2026-10-01T01:00:00Z',
    updatedAt: '2026-10-01T01:00:00Z',
    blocks: [
      {
        ...(sb('a', 1, null) as Extract<Block, { type: 'spot' }>),
        imagePath: 'u1/x.jpg',
        imageUrl: 'https://x/u1/x.jpg',
      },
      cb('c', 'メモ'),
      sb('b', 2, 'bus'),
    ],
  };

  it('コピーではタイトルと写真を引き継がず、ブロック・移動手段・タグを引き継ぐ', () => {
    const s = planToEditorState(plan, { copy: true });
    expect(s.planId).toBeNull();
    expect(s.originalStatus).toBeNull();
    expect(s.title).toBe('');
    expect(s.sourcePlan).toEqual({ id: 'p1', authorName: 'テスト花子', title: '元のタイトル' });
    expect(s.tagIds).toEqual([3]);
    expect(s.blocks.map((b) => b.type)).toEqual(['spot', 'comment', 'spot']);
    expect(
      s.blocks.every((b) => b.type !== 'spot' || (b.imagePath === null && b.imageUrl === null)),
    ).toBe(true);
    expect(s.blocks.map((b) => (b.type === 'spot' ? b.transportMode : 'c'))).toEqual([
      null,
      'c',
      'bus',
    ]);
  });

  it('編集ではタイトル・写真・状態を引き継ぐ', () => {
    const s = planToEditorState(plan, { copy: false });
    expect(s.planId).toBe('p1');
    expect(s.originalStatus).toBe('published');
    expect(s.title).toBe('元のタイトル');
    const first = s.blocks[0];
    expect(first.type === 'spot' && first.imagePath).toBe('u1/x.jpg');
  });

  it('保存用の入力では空のコメントを取り除き、タイトルの前後の空白を取る', () => {
    const s = planToEditorState(plan, { copy: true });
    s.title = '  新しいタイトル ';
    s.blocks.push({ key: 'empty', type: 'comment', body: '   ' });
    const input = toSavePlanInput(s, 'published');
    expect(input.title).toBe('新しいタイトル');
    expect(input.sourcePlanId).toBe('p1');
    expect(input.blocks).toEqual([
      { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
      { type: 'comment', body: 'メモ' },
      { type: 'spot', spotId: 2, transportMode: 'bus', imagePath: null },
    ]);
  });
});
