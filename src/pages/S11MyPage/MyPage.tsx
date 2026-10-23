import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut } from '@/api/auth';
import { unlikePlan } from '@/api/likes';
import { deletePlan, getLikedPlans, getMyPlans, unpublishPlan } from '@/api/plans';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getTags } from '@/api/tags';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu, type MenuItem } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useToast } from '@/components/common/useToast';
import { Messages, Toasts, UiMessages } from '@/constants/messages';
import { useAuth, useCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, renderTagIcon, StateIcons } from '@/lib/icons';
import { tagsQuery } from '@/lib/tagParams';
import type { PlanSummary } from '@/types/models';
import { PlanTile } from './PlanTile';
import { SnowScene } from '@/components/common/SnowScene';
import styles from './MyPage.module.css';

type Tab = 'mine' | 'liked';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'mine', label: '自分のプラン' },
  { value: 'liked', label: 'いいねしたプラン' },
];

// 時間に合わせたあいさつ
function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'おはようございます';
  if (hour >= 11 && hour < 17) return 'こんにちは';
  return 'こんばんは';
}

type Confirm = { kind: 'unpublish' | 'delete'; plan: PlanSummary } | null;

// S-11 マイページ（6.4、F-24、F-32、BR-09、BR-10）。見た目は雪の茶屋街（7.7、I-22）
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
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
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
  const foodTag = tags.data?.find((t) => t.slug === 'food');
  const Search = ActionIcons.search;
  const Create = ActionIcons.create;
  const initial = Array.from(user.displayName)[0] ?? '';
  // 下書きは編集画面へ、公開中は詳細へ（6.4 S-11）
  const hrefOf = (plan: PlanSummary) =>
    tab === 'mine' && plan.status === 'draft'
      ? `/plans/${plan.id}/edit?step=blocks`
      : `/plans/${plan.id}`;
  const actionOf = (plan: PlanSummary) =>
    tab === 'mine' ? (
      <DropdownMenu items={menuFor(plan)} />
    ) : (
      <IconButton
        icon={ActionIcons.like}
        label="いいねを取り消す"
        filled
        className={styles.liked}
        disabled={unlike.isPending}
        onClick={() => unlike.mutate(plan.id)}
      />
    );

  return (
    <div className={styles.theme}>
      <SnowScene />
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
          <section className={styles.profile} aria-labelledby="mypage-name">
            <span className={styles.avatar} aria-hidden="true">
              {initial}
            </span>
            <h1 id="mypage-name" className={styles.name}>
              {user.displayName}さん
            </h1>
            <span className={styles.bubble}>{greeting(new Date().getHours())}</span>
          </section>

          <button type="button" className={styles.search} onClick={() => navigate('/search')}>
            <Search size={20} aria-hidden="true" />
            探す
          </button>

          {/* 切り替えは共通部品（7.6 SegmentedControl）。見た目だけ MyPage.module.css で整える */}
          <div className={styles.tabs}>
            <SegmentedControl
              options={TABS}
              value={tab}
              onChange={(t) =>
                setParams(
                  (prev) => {
                    prev.set('tab', t);
                    return prev;
                  },
                  { replace: true },
                )
              }
              label="表示するプラン"
            />
          </div>

          {current.isPending ? (
            <div className={styles.grid} aria-busy="true" aria-label="読み込み中">
              <span className={`${styles.skeleton} ${styles.wide}`} />
              <span className={styles.skeleton} />
              <span className={styles.skeleton} />
            </div>
          ) : current.isError ? (
            <div className={styles.glass}>
              <ErrorState message={errorMessage(current.error)} onRetry={() => current.refetch()} />
            </div>
          ) : current.data.length === 0 ? (
            // 6.4 S-11 の0件の表示（共通部品 EmptyState）を、すりガラスの箱に入れる
            <div className={styles.glass}>
              {tab === 'mine' ? (
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
              )}
            </div>
          ) : (
            <ol className={styles.grid}>
              {current.data.map((plan, i) => {
                // 1枚目は大きく。残りが奇数のときは、最後の1枚も横いっぱいにする
                const wide =
                  i === 0 || (i === current.data.length - 1 && current.data.length % 2 === 0);
                return (
                  <li key={plan.id} className={wide ? styles.wide : undefined}>
                    <PlanTile
                      plan={plan}
                      to={hrefOf(plan)}
                      size={wide ? 'large' : 'small'}
                      status={tab === 'mine'}
                      action={actionOf(plan)}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </main>

        <div className={styles.floating}>
          <button type="button" className={styles.create} onClick={() => navigate('/plans/new')}>
            <Create size={22} aria-hidden="true" />
            プランを作る
          </button>
          {foodTag && (
            <Link className={styles.sticker} to={`/search/results${tagsQuery([foodTag.id])}`}>
              {renderTagIcon('food', { size: 22, 'aria-hidden': true })}
              食べ歩き
            </Link>
          )}
        </div>
      </AppLayout>

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
    </div>
  );
}
