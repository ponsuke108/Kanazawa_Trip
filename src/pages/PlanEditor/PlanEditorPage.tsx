import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { Messages, UiMessages } from '@/constants/messages';
import { MAX_BLOCKS } from '@/lib/blocks';
import { StateIcons } from '@/lib/icons';
import { BlocksStep } from '@/pages/PlanEditor/BlocksStep';
import { ConfirmStep } from '@/pages/PlanEditor/ConfirmStep';
import { InfoStep } from '@/pages/PlanEditor/InfoStep';
import { useEditorSession } from '@/pages/PlanEditor/useEditorSession';
import styles from './PlanEditorPage.module.css';

export type Step = 'blocks' | 'info' | 'confirm';

function parseStep(value: string | null): Step {
  return value === 'info' || value === 'confirm' ? value : 'blocks';
}

const TITLES: Record<Step, string | null> = {
  blocks: null,
  info: '投稿情報',
  confirm: '投稿内容の確認',
};
const PREV: Record<Step, Step | null> = { blocks: null, info: 'blocks', confirm: 'info' };

// 作成画面（S-06〜S-09）。/plans/new と /plans/:planId/edit の1つの画面で、step で切り替える（11.4）
export function PlanEditorPage() {
  const { planId = null } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const step = parseStep(params.get('step'));
  const fromId = planId === null ? params.get('from') : null;

  const session = useEditorSession({ planId, fromId });
  const { state, dispatch, phase, save } = session;
  const published = state.originalStatus === 'published';
  // 公開中のプランの編集では「下書き保存」を出さない（BR-09、11.4）
  const showDraftSave = !published;

  const goStep = (next: Step) => {
    const p = new URLSearchParams(params);
    p.set('step', next);
    setParams(p);
  };

  const onBack = () => {
    const prev = PREV[step];
    if (prev) return goStep(prev);
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  const title = TITLES[step] ?? (session.isEdit ? 'プランを編集' : 'プランを作成');
  const counter =
    step === 'blocks' && phase === 'ready' ? (
      <span className={styles.counter}>
        ブロック {state.blocks.length}/{MAX_BLOCKS}
      </span>
    ) : undefined;

  let body;
  if (phase === 'loading' || phase === 'restore') {
    body = <PlanCardSkeletonList count={3} />;
  } else if (phase === 'error') {
    body = <ErrorState onRetry={session.retry} />;
  } else if (phase === 'notEditable') {
    body = (
      <EmptyState
        icon={StateIcons.noResults}
        title={UiMessages.planNotEditable}
        action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
      />
    );
  } else if (step === 'blocks') {
    body = (
      <BlocksStep
        state={state}
        dispatch={dispatch}
        showDraftSave={showDraftSave}
        saving={save.isPending}
        onSaveDraft={() => save.mutate('draft')}
        onNext={() => goStep('info')}
      />
    );
  } else if (step === 'info') {
    body = (
      <InfoStep
        state={state}
        dispatch={dispatch}
        showDraftSave={showDraftSave}
        saving={save.isPending}
        onSaveDraft={() => save.mutate('draft')}
        onNext={() => goStep('confirm')}
      />
    );
  } else {
    body = (
      <ConfirmStep
        state={state}
        serverIssues={session.serverIssues}
        published={published}
        saving={save.isPending}
        onGoStep={goStep}
        onPublish={() => save.mutate('published')}
      />
    );
  }

  return (
    <AppLayout showTabBar={false} bottomBar={phase === 'ready'}>
      <PageHeader title={title} onBack={onBack} right={counter} />
      <main className={styles.main}>{body}</main>

      <ConfirmDialog
        open={phase === 'restore'}
        title="一時保存"
        message={Messages.restoreConfirm}
        confirmLabel="復元する"
        onConfirm={() => session.answerRestore(true)}
        onCancel={() => session.answerRestore(false)}
      />
      <ConfirmDialog
        open={session.blocker.state === 'blocked'}
        title="未保存の変更"
        message={Messages.unsavedConfirm}
        confirmLabel="移動する"
        danger
        onConfirm={() => session.blocker.proceed?.()}
        onCancel={() => session.blocker.reset?.()}
      />
    </AppLayout>
  );
}
