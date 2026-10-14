import { useRef, useState, type ChangeEvent, type Dispatch } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { uploadPlanImage } from '@/api/storage';
import { getTags } from '@/api/tags';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { TagSelector } from '@/components/common/TagSelector';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { UiMessages } from '@/constants/messages';
import { charLength, MAX_TITLE, type EditorBlock, type EditorState } from '@/lib/blocks';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import type { EditorAction } from '@/pages/PlanEditor/editorReducer';
import styles from './InfoStep.module.css';

type Props = {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  showDraftSave: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onNext: () => void;
};

// S-08 投稿情報入力（6.4、F-18）。入力の確認はここでは行わず、S-09 でまとめて表示する
export function InfoStep({ state, dispatch, showDraftSave, saving, onSaveDraft, onNext }: Props) {
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
  });
  const spots = state.blocks.filter(
    (b): b is Extract<EditorBlock, { type: 'spot' }> => b.type === 'spot',
  );

  return (
    <>
      <TextField
        label="タイトル"
        value={state.title}
        onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
        counter={{ current: charLength(state.title), max: MAX_TITLE }}
        // BR-07：コピー時は元のタイトルを例文に表示する
        placeholder={state.sourcePlan?.title || '例：雨の日でも楽しめる金沢半日コース'}
      />

      <section className={styles.section} aria-labelledby="info-tags">
        <h2 id="info-tags" className={styles.heading}>
          タグ
        </h2>
        {tags.isPending ? (
          <p className={styles.sub}>読み込み中</p>
        ) : tags.isError ? (
          <ErrorState message={errorMessage(tags.error)} onRetry={() => tags.refetch()} />
        ) : (
          <TagSelector
            tags={tags.data}
            selectedIds={state.tagIds}
            onChange={(ids) => dispatch({ type: 'SET_TAGS', tagIds: ids })}
          />
        )}
      </section>

      <section className={styles.section} aria-labelledby="info-photos">
        <h2 id="info-photos" className={styles.heading}>
          写真
        </h2>
        <p className={styles.sub}>スポットごとに1枚まで追加できます（任意）</p>
        {spots.length === 0 ? (
          <p className={styles.sub}>スポットがありません</p>
        ) : (
          <ul className={styles.photos}>
            {spots.map((b) => (
              <PhotoRow key={b.key} block={b} dispatch={dispatch} />
            ))}
          </ul>
        )}
      </section>

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
          確認へ
        </Button>
      </BottomActionBar>
    </>
  );
}

// スポットごとの写真。選んだ時点で縮小してアップロードする（BR-13）
function PhotoRow({
  block,
  dispatch,
}: {
  block: Extract<EditorBlock, { type: 'spot' }>;
  dispatch: Dispatch<EditorAction>;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const NoImage = StateIcons.noImage;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { path, url } = await uploadPlanImage(file);
      dispatch({ type: 'SET_IMAGE', key: block.key, path, url });
    } catch (err) {
      const unreadable = isApiError(err) && err.code === 'VALIDATION';
      toast.show({
        type: 'error',
        message: unreadable ? UiMessages.imageUnreadable : errorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <li className={styles.photoRow}>
      <div className={styles.thumb}>
        {block.imageUrl ? (
          <img src={block.imageUrl} alt={`${block.spot.name}の写真`} className={styles.image} />
        ) : (
          <NoImage size={24} aria-hidden="true" />
        )}
      </div>
      <div className={styles.photoBody}>
        <p className={styles.spotName}>{block.spot.name}</p>
        <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
        <div className={styles.photoActions}>
          {block.imageUrl ? (
            <>
              <Button
                variant="secondary"
                loading={uploading}
                onClick={() => input.current?.click()}
              >
                変更
              </Button>
              <Button
                variant="ghost"
                disabled={uploading}
                onClick={() => dispatch({ type: 'REMOVE_IMAGE', key: block.key })}
              >
                削除
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              icon={ActionIcons.addImage}
              loading={uploading}
              onClick={() => input.current?.click()}
            >
              写真を追加
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
