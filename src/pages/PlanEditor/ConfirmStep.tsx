import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getTags } from '@/api/tags';
import { BlockList } from '@/components/blocks/BlockList';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { useCurrentUser } from '@/hooks/useAuth';
import {
  editorBlocksToBlocks,
  toSavePlanInput,
  validatePlan,
  type EditorState,
} from '@/lib/blocks';
import { ActionIcons, StateIcons } from '@/lib/icons';
import type { Step } from '@/pages/PlanEditor/PlanEditorPage';
import { PlanHeading } from '@/components/common/PlanHeading';
import type { ValidationIssue } from '@/types/models';
import styles from './ConfirmStep.module.css';

type Props = {
  state: EditorState;
  serverIssues: ValidationIssue[];
  published: boolean; // 公開中のプランの編集なら「更新する」
  saving: boolean;
  onGoStep: (step: Step) => void;
  onPublish: () => void;
};

const STEP_LABELS: Record<ValidationIssue['step'], string> = {
  blocks: 'ブロック編集へ',
  info: '投稿情報へ',
};

// S-09 投稿確認（6.4、F-19、BR-06）
export function ConfirmStep({
  state,
  serverIssues,
  published,
  saving,
  onGoStep,
  onPublish,
}: Props) {
  const user = useCurrentUser();
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
  });
  const Alert = StateIcons.alert;

  // 公開条件（BR-06）。データベース側の確認で失敗した内容も合わせて出す
  const local = validatePlan(toSavePlanInput(state, 'published'), 'publish');
  const issues = [...local, ...serverIssues.filter((s) => !local.some((l) => l.code === s.code))];

  return (
    <>
      {issues.length > 0 && (
        <section className={styles.issues} aria-labelledby="confirm-issues">
          <h2 id="confirm-issues" className={styles.issuesTitle}>
            公開するには次を直してください
          </h2>
          <ul className={styles.issueList}>
            {issues.map((issue) => (
              <li key={issue.code} className={styles.issue}>
                <span className={styles.issueText}>
                  <Alert size={20} aria-hidden="true" className={styles.alert} />
                  {issue.message}
                </span>
                <Button variant="ghost" onClick={() => onGoStep(issue.step)}>
                  {STEP_LABELS[issue.step]}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.preview} aria-label="プレビュー">
        <PlanHeading
          plan={{
            title: state.title.trim(),
            status: 'published',
            author: { id: user.id, displayName: user.displayName },
            publishedAt: null,
            tags: (tags.data ?? []).filter((t) => state.tagIds.includes(t.id)),
          }}
        />
        <BlockList blocks={editorBlocksToBlocks(state.blocks)} mode="view" />
      </section>

      <BottomActionBar>
        <Button
          icon={ActionIcons.publish}
          loading={saving}
          disabled={issues.length > 0}
          onClick={onPublish}
        >
          {published ? '更新する' : '公開する'}
        </Button>
      </BottomActionBar>
    </>
  );
}
