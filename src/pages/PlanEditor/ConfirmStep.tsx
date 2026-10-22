import type { EditorState } from '@/lib/blocks';
import type { ValidationIssue } from '@/types/models';
import type { Step } from '@/pages/PlanEditor/PlanEditorPage';

type Props = {
  state: EditorState;
  serverIssues: ValidationIssue[];
  published: boolean;
  saving: boolean;
  onGoStep: (step: Step) => void;
  onPublish: () => void;
};

// S-09 投稿確認（I-14 で作る）
export function ConfirmStep(props: Props) {
  void props;
  return null;
}
