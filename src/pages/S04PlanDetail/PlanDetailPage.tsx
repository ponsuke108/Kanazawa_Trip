import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlan, unpublishPlan } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { BlockList } from '@/components/blocks/BlockList';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu, type MenuItem } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { useToast } from '@/components/common/useToast';
import { Messages, Toasts, UiMessages } from '@/constants/messages';
import { useCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import { LikeButton } from '@/pages/S04PlanDetail/LikeButton';
import { PlanHeading } from '@/components/common/PlanHeading';
import styles from './PlanDetailPage.module.css';

// S-04 プラン詳細（6.4、F-05、F-07、F-16、F-24、BR-07〜BR-09、BR-16）
export function PlanDetailPage() {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  const plan = useQuery({
    queryKey: queryKeys.plans.detail(planId),
    queryFn: () => getPlan(planId),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishPlan(planId),
    onSuccess: async () => {
      setConfirmUnpublish(false);
      toast.show({ type: 'success', message: Toasts.unpublished });
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const data = plan.data;
  const own = data ? data.author.id === user.id : false;

  const menu: MenuItem[] = [];
  if (data && own) {
    menu.push({
      label: '編集',
      icon: ActionIcons.edit,
      onSelect: () => navigate(`/plans/${data.id}/edit?step=blocks`),
    });
    if (data.status === 'published') {
      menu.push({
        label: '非公開に戻す',
        icon: ActionIcons.unpublish,
        onSelect: () => setConfirmUnpublish(true),
      });
    }
  }

  return (
    <AppLayout showTabBar>
      <PageHeader
        title="プラン"
        right={menu.length > 0 ? <DropdownMenu items={menu} /> : undefined}
      />
      <main className={styles.main}>
        {plan.isPending ? (
          <PlanCardSkeletonList count={3} />
        ) : plan.isError ? (
          <ErrorState message={errorMessage(plan.error)} onRetry={() => plan.refetch()} />
        ) : data === null || data === undefined ? (
          <EmptyState
            icon={StateIcons.noResults}
            title={UiMessages.planNotFound}
            action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
          />
        ) : (
          <>
            <PlanHeading plan={data} />
            <div className={styles.actions}>
              <LikeButton plan={data} own={own} />
              <Button
                variant="secondary"
                icon={ActionIcons.copy}
                onClick={() => navigate(`/plans/new?step=blocks&from=${data.id}`)}
              >
                コピーして編集
              </Button>
            </div>
            {data.sourcePlan && (
              <p className={styles.source}>
                <Link to={`/plans/${data.sourcePlan.id}`}>
                  {data.sourcePlan.authorName}さんのプラン
                </Link>
                をもとに作成
              </p>
            )}
            <BlockList blocks={data.blocks} mode="view" />
          </>
        )}
      </main>
      <ConfirmDialog
        open={confirmUnpublish}
        title="非公開に戻す"
        message={Messages.unpublishConfirm}
        confirmLabel="非公開に戻す"
        loading={unpublish.isPending}
        onConfirm={() => unpublish.mutate()}
        onCancel={() => setConfirmUnpublish(false)}
      />
    </AppLayout>
  );
}
