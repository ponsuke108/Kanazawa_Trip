import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut } from '@/api/auth';
import { unlikePlan } from '@/api/likes';
import { deletePlan, getLikedPlans, getMyPlans, unpublishPlan } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu, type MenuItem } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useToast } from '@/components/common/useToast';
import { Messages, Toasts, UiMessages } from '@/constants/messages';
import { useAuth, useCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import type { PlanSummary } from '@/types/models';
import styles from './MyPage.module.css';

type Tab = 'mine' | 'liked';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'mine', label: '自分のプラン' },
  { value: 'liked', label: 'いいねしたプラン' },
];

type Confirm = { kind: 'unpublish' | 'delete'; plan: PlanSummary } | null;

// S-11 マイページ（6.4、F-24、F-32、BR-09、BR-10）
export function MyPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'liked' ? 'liked' : 'mine';
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const mine = useQuery({
    queryKey: queryKeys.plans.mine,
    queryFn: getMyPlans,
    enabled: tab === 'mine',
  });
  const liked = useQuery({
    queryKey: queryKeys.plans.liked,
    queryFn: getLikedPlans,
    enabled: tab === 'liked',
  });

  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
  const onError = (err: unknown) => toast.show({ type: 'error', message: errorMessage(err) });

  const unpublish = useMutation({
    mutationFn: (planId: string) => unpublishPlan(planId),
    onSuccess: async () => {
      setConfirm(null);
      toast.show({ type: 'success', message: Toasts.unpublished });
      await invalidatePlans();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: async () => {
      setConfirm(null);
      toast.show({ type: 'success', message: Toasts.deleted });
      await invalidatePlans();
    },
    onError,
  });

  const unlike = useMutation({
    mutationFn: (planId: string) => unlikePlan(planId),
    onSuccess: async (_data, planId) => {
      await invalidatePlans();
      await queryClient.invalidateQueries({ queryKey: queryKeys.likes.has(planId) });
    },
    onError,
  });

  const logout = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
      setUser(null);
    },
    onError,
  });

  const menuFor = (plan: PlanSummary): MenuItem[] => {
    const items: MenuItem[] = [
      {
        label: '編集',
        icon: ActionIcons.edit,
        onSelect: () => navigate(`/plans/${plan.id}/edit?step=blocks`),
      },
    ];
    if (plan.status === 'published') {
      items.push({
        label: '非公開に戻す',
        icon: ActionIcons.unpublish,
        onSelect: () => setConfirm({ kind: 'unpublish', plan }),
      });
    }
    items.push({
      label: '削除',
      icon: ActionIcons.delete,
      danger: true,
      onSelect: () => setConfirm({ kind: 'delete', plan }),
    });
    return items;
  };

  const current = tab === 'mine' ? mine : liked;

  return (
    <AppLayout showTabBar>
      <PageHeader
        title="マイページ"
        showSiteName
        right={
          <Button
            variant="ghost"
            icon={ActionIcons.logout}
            loading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            ログアウト
          </Button>
        }
      />
      <main className={styles.main}>
        <p className={styles.user}>{user.displayName}さん</p>
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          label="表示するプラン"
        />

        {current.isPending ? (
          <PlanCardSkeletonList count={3} />
        ) : current.isError ? (
          <ErrorState message={errorMessage(current.error)} onRetry={() => current.refetch()} />
        ) : current.data.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState
              icon={StateIcons.empty}
              title={UiMessages.noPlans}
              action={
                <Button icon={ActionIcons.create} onClick={() => navigate('/plans/new')}>
                  プランを作る
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={StateIcons.heart}
              title={UiMessages.noLikedPlans}
              action={
                <Button icon={ActionIcons.search} onClick={() => navigate('/search')}>
                  プランを探す
                </Button>
              }
            />
          )
        ) : (
          <ol className={styles.list}>
            {current.data.map((plan) => (
              <li key={plan.id}>
                {tab === 'mine' ? (
                  <PlanCard
                    plan={plan}
                    showStatus
                    // 下書きは編集画面へ、公開中は詳細へ（6.4 S-11）
                    to={plan.status === 'draft' ? `/plans/${plan.id}/edit?step=blocks` : undefined}
                    menu={<DropdownMenu items={menuFor(plan)} />}
                  />
                ) : (
                  <PlanCard
                    plan={plan}
                    trailing={
                      <IconButton
                        icon={ActionIcons.like}
                        label="いいねを取り消す"
                        filled
                        className={styles.liked}
                        disabled={unlike.isPending}
                        onClick={() => unlike.mutate(plan.id)}
                      />
                    }
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </main>

      <ConfirmDialog
        open={confirm?.kind === 'unpublish'}
        title="非公開に戻す"
        message={Messages.unpublishConfirm}
        confirmLabel="非公開に戻す"
        loading={unpublish.isPending}
        onConfirm={() => confirm && unpublish.mutate(confirm.plan.id)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        title="削除"
        message={Messages.deleteConfirm}
        confirmLabel="削除する"
        danger
        loading={remove.isPending}
        onConfirm={() => confirm && remove.mutate(confirm.plan.id)}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  );
}
