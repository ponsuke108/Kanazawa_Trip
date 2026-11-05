import { useEffect, useMemo, useState, type Dispatch } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { BlockList } from '@/components/blocks/BlockList';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { UiMessages } from '@/constants/messages';
import { editorBlocksToBlocks, MAX_BLOCKS, type EditorState } from '@/lib/blocks';
import { ActionIcons, StateIcons } from '@/lib/icons';
import { lastSpotId, newBlockKey, type EditorAction } from '@/pages/PlanEditor/editorReducer';
import { RoutePanel } from '@/pages/PlanEditor/RoutePanel';
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
  const blocks = useMemo(() => editorBlocksToBlocks(state.blocks), [state.blocks]);
  const hasSpot = state.blocks.some((b) => b.type === 'spot');
  // （v11）リストから作るときは「リスト『〇〇』から作成中」（6.4 S-06）
  const list = useQuery({
    queryKey: queryKeys.lists.detail(state.listId ?? ''),
    queryFn: () => getList(state.listId ?? ''),
    enabled: state.listId !== null && state.planId === null,
  });

  // 経路順の地図のピンを押したら、そのスポットブロックまでスクロールし、少しの間目立たせる（6.4 S-06）
  const focusStop = (blockId: string) => {
    const el = document.getElementById(`block-${blockId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.animate(
      [
        { outline: '3px solid var(--color-route-line)', outlineOffset: '2px' },
        { outline: '3px solid transparent', outlineOffset: '2px' },
      ],
      { duration: 1600, easing: 'ease-out' },
    );
  };

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
    <div className={styles.blocksLayout}>
      {/* 経路順の地図（BR-22）。ブロックが0個なら出さない */}
      {hasSpot && (
        <div className={styles.routeCol}>
          <RoutePanel blocks={blocks} onSelectStop={(stop) => focusStop(stop.blockIds[0] ?? '')} />
        </div>
      )}
      <div className={styles.blocksCol}>
        {list.data && <p className={styles.copyNote}>リスト「{list.data.name}」から作成中</p>}
        {state.sourcePlan && state.planId === null && (
          <p className={styles.copyNote}>{state.sourcePlan.authorName}さんのプランをもとに作成中</p>
        )}

        {state.blocks.length === 0 ? (
          <EmptyState icon={StateIcons.spot} title={UiMessages.emptyBlocks} />
        ) : (
          <BlockList
            blocks={blocks}
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
      </div>

      <SpotPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabledSpotId={lastSpotId(state.blocks)}
        initialListId={state.listId}
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
    </div>
  );
}
