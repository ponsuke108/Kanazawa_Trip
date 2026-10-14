import { describe, expect, it } from 'vitest';
import { mockSpots } from '@/api/mock/data';
import { editorReducer, initialEditorState, lastSpotId } from '@/pages/PlanEditor/editorReducer';

const spot = (id: number) => mockSpots.find((s) => s.id === id)!;

describe('editorReducer（11.4、BR-04）', () => {
  it('スポット3つとコメント1つを追加して並べ替えても BR-04 が守られる', () => {
    let s = initialEditorState;
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(1), key: 'a' });
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(2), key: 'b' });
    s = editorReducer(s, { type: 'ADD_COMMENT', key: 'c' });
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(3), key: 'd' });
    s = editorReducer(s, { type: 'SET_TRANSPORT', key: 'b', mode: 'bus' });
    expect(s.blocks.map((b) => b.key)).toEqual(['a', 'b', 'c', 'd']);
    // 3つ目のスポットを先頭へ
    s = editorReducer(s, { type: 'MOVE_BLOCK', from: 3, to: 0 });
    expect(s.blocks.map((b) => b.key)).toEqual(['d', 'a', 'b', 'c']);
    expect(s.blocks.map((b) => (b.type === 'spot' ? b.transportMode : '-'))).toEqual([
      null,
      'walk',
      'bus',
      '-',
    ]);
    expect(s.dirty).toBe(true);
  });

  it('先頭のスポットを削除すると、次のスポットの移動手段が空になる', () => {
    let s = initialEditorState;
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(1), key: 'a' });
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(2), key: 'b' });
    s = editorReducer(s, { type: 'REMOVE_BLOCK', key: 'a' });
    expect(s.blocks.map((b) => (b.type === 'spot' ? b.transportMode : '-'))).toEqual([null]);
  });

  it('30個に達したら追加しない（BR-03）', () => {
    let s = initialEditorState;
    for (let i = 0; i < 31; i++) s = editorReducer(s, { type: 'ADD_COMMENT', key: `c${i}` });
    expect(s.blocks).toHaveLength(30);
  });

  it('直前のスポットはコメントを飛ばして探す', () => {
    let s = initialEditorState;
    s = editorReducer(s, { type: 'ADD_SPOT', spot: spot(5), key: 'a' });
    s = editorReducer(s, { type: 'ADD_COMMENT', key: 'c' });
    expect(lastSpotId(s.blocks)).toBe(5);
  });
});
