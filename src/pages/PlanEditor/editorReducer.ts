// 作成画面の状態（要件定義書 11.4）。ブロックの並びを変える操作のあとは必ず normalizeBlocks を通す
import {
  emptyEditorState,
  MAX_BLOCKS,
  newBlockKey,
  normalizeBlocks,
  type EditorBlock,
  type EditorState,
} from '@/lib/blocks';
import type { Spot, TransportMode } from '@/types/models';

export type EditorAction =
  | { type: 'LOAD'; state: EditorState }
  | { type: 'ADD_SPOT'; spot: Spot; key: string }
  | { type: 'ADD_COMMENT'; key: string }
  | { type: 'UPDATE_COMMENT'; key: string; body: string }
  | { type: 'MOVE_BLOCK'; from: number; to: number }
  | { type: 'REMOVE_BLOCK'; key: string }
  | { type: 'SET_TRANSPORT'; key: string; mode: TransportMode }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'TOGGLE_TAG'; tagId: number }
  | { type: 'SET_TAGS'; tagIds: number[] }
  | { type: 'SET_IMAGE'; key: string; path: string; url: string }
  | { type: 'REMOVE_IMAGE'; key: string }
  | { type: 'MARK_SAVED'; planId: string };

export const initialEditorState: EditorState = emptyEditorState();

export { newBlockKey };

function changed(state: EditorState, patch: Partial<EditorState>): EditorState {
  return { ...state, ...patch, dirty: true };
}

function withBlocks(state: EditorState, blocks: EditorBlock[]): EditorState {
  return changed(state, { blocks: normalizeBlocks(blocks) }); // BR-04
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD':
      return { ...action.state, blocks: normalizeBlocks(action.state.blocks) };

    case 'ADD_SPOT': {
      if (state.blocks.length >= MAX_BLOCKS) return state; // BR-03
      const block: EditorBlock = {
        key: action.key,
        type: 'spot',
        spot: action.spot,
        transportMode: 'walk', // BR-04：新しく追加したスポットは「徒歩」
        imagePath: null,
        imageUrl: null,
      };
      return withBlocks(state, [...state.blocks, block]);
    }

    case 'ADD_COMMENT': {
      if (state.blocks.length >= MAX_BLOCKS) return state;
      // BR-03：コメントは末尾に追加し、並べ替えで動かす
      return withBlocks(state, [...state.blocks, { key: action.key, type: 'comment', body: '' }]);
    }

    case 'UPDATE_COMMENT':
      return changed(state, {
        blocks: state.blocks.map((b) =>
          b.key === action.key && b.type === 'comment' ? { ...b, body: action.body } : b,
        ),
      });

    case 'MOVE_BLOCK': {
      const { from, to } = action;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.blocks.length ||
        to >= state.blocks.length
      ) {
        return state;
      }
      const blocks = [...state.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return withBlocks(state, blocks);
    }

    case 'REMOVE_BLOCK':
      return withBlocks(
        state,
        state.blocks.filter((b) => b.key !== action.key),
      );

    case 'SET_TRANSPORT':
      return withBlocks(
        state,
        state.blocks.map((b) =>
          b.key === action.key && b.type === 'spot' ? { ...b, transportMode: action.mode } : b,
        ),
      );

    case 'SET_TITLE':
      return changed(state, { title: action.title });

    case 'TOGGLE_TAG': {
      const tagIds = state.tagIds.includes(action.tagId)
        ? state.tagIds.filter((id) => id !== action.tagId)
        : [...state.tagIds, action.tagId];
      return changed(state, { tagIds: tagIds.sort((a, b) => a - b) });
    }

    case 'SET_TAGS':
      return changed(state, { tagIds: [...action.tagIds].sort((a, b) => a - b) });

    case 'SET_IMAGE':
      return changed(state, {
        blocks: state.blocks.map((b) =>
          b.key === action.key && b.type === 'spot'
            ? { ...b, imagePath: action.path, imageUrl: action.url }
            : b,
        ),
      });

    case 'REMOVE_IMAGE':
      return changed(state, {
        blocks: state.blocks.map((b) =>
          b.key === action.key && b.type === 'spot' ? { ...b, imagePath: null, imageUrl: null } : b,
        ),
      });

    case 'MARK_SAVED':
      return { ...state, planId: action.planId, dirty: false };
  }
}

// 直前のスポット（末尾に追加するときに、同じスポットを続けて追加できないようにする。BR-03）
export function lastSpotId(blocks: EditorBlock[]): number | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.type === 'spot') return b.spot.id;
  }
  return null;
}
