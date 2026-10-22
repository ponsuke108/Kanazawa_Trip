import type { Dispatch } from 'react';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import type { EditorState } from '@/lib/blocks';
import { ActionIcons } from '@/lib/icons';
import type { EditorAction } from '@/pages/PlanEditor/editorReducer';

type Props = {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  showDraftSave: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onNext: () => void;
};

// S-08 投稿情報入力（I-14 で作る）
export function InfoStep({ showDraftSave, saving, onSaveDraft, onNext }: Props) {
  return (
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
      <Button onClick={onNext}>確認へ</Button>
    </BottomActionBar>
  );
}
