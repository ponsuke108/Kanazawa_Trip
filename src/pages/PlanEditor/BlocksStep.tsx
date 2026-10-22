import { useEffect, useState, type Dispatch } from 'react';
import { BlockList } from '@/components/blocks/BlockList';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { UiMessages } from '@/constants/messages';
import { editorBlocksToBlocks, MAX_BLOCKS, type EditorState } from '@/lib/blocks';
import { ActionIcons, StateIcons } from '@/lib/icons';
import { lastSpotId, newBlockKey, type EditorAction } from '@/pages/PlanEditor/editorReducer';
import { SpotPicker } from '@/pages/PlanEditor/SpotPicker';
import styles from './PlanEditorPage.module.css';

type Props = {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  showDraftSave: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onNext: () => void;
};

// S-06 ブロック編集（6.4、F-11〜F-15、BR-03、BR-04）
export function BlocksStep({ state, dispatch, showDraftSave, saving, onSaveDraft, onNext }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState<string | null>(null);
  const full = state.blocks.length >= MAX_BLOCKS;

  // 追加したスポットまでスクロールする（6.4 S-07）
  useEffect(() => {
    if (!scrollKey) return;
    document
      .getElementById(`block-${scrollKey}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [scrollKey]);

  const addComment = () => {
    const key = newBlockKey();
    dispatch({ type: 'ADD_COMMENT', key });
    setFocusKey(key);
  };

  return (
    <>
      {state.sourcePlan && state.planId === null && (
        <p className={styles.copyNote}>{state.sourcePlan.authorName}さんのプランをもとに作成中</p>
      )}

      {state.blocks.length === 0 ? (
        <EmptyState icon={StateIcons.spot} title={UiMessages.emptyBlocks} />
      ) : (
        <BlockList
          blocks={editorBlocksToBlocks(state.blocks)}
          mode="edit"
          focusBlockId={focusKey}
          onMove={(from, to) => dispatch({ type: 'MOVE_BLOCK', from, to })}
          onRemove={(key) => dispatch({ type: 'REMOVE_BLOCK', key })}
          onTransportChange={(key, mode) => dispatch({ type: 'SET_TRANSPORT', key, mode })}
          onCommentChange={(key, body) => dispatch({ type: 'UPDATE_COMMENT', key, body })}
        />
      )}

      <div className={styles.addButtons}>
        <Button
          variant="secondary"
          icon={ActionIcons.add}
          disabled={full}
          onClick={() => setPickerOpen(true)}
        >
          スポットを追加
        </Button>
        <Button variant="secondary" icon={ActionIcons.add} disabled={full} onClick={addComment}>
          コメントを追加
        </Button>
      </div>
      {full && <p className={styles.limit}>{UiMessages.blocksLimit}</p>}

      <SpotPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabledSpotId={lastSpotId(state.blocks)}
        onSelect={(spot) => {
          const key = newBlockKey();
          dispatch({ type: 'ADD_SPOT', spot, key });
          setPickerOpen(false);
          setScrollKey(key);
        }}
      />

      <BottomActionBar>
        {showDraftSave && (
          <Button
            variant="secondary"
            icon={ActionIcons.saveDraft}
            loading={saving}
            onClick={onSaveDraft}
          >
            下書き保存
          </Button>
        )}
        <Button icon={ActionIcons.next} onClick={onNext} disabled={saving}>
          次へ
        </Button>
      </BottomActionBar>
    </>
  );
}
