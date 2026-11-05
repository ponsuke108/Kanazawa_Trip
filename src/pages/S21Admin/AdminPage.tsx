import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllSpotPosts,
  getApplications,
  getShops,
  setCampaignStatus,
  setShopStatus,
  setSpotPostHidden,
} from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { DropdownMenu, type MenuItem } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { SpotPostCard } from '@/components/common/SpotPostCard';
import { useToast } from '@/components/common/useToast';
import { AdminMessages } from '@/constants/messages';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ShopIcons, StateIcons } from '@/lib/icons';
import { ReasonDialog } from '@/pages/S21Admin/ReasonDialog';
import type { ShopDetail, SpotPost } from '@/types/models';
import styles from './AdminPage.module.css';

type Tab = 'applications' | 'shops' | 'posts';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'applications', label: '申請' },
  { value: 'shops', label: 'お店' },
  { value: 'posts', label: '投稿' },
];

function toTab(v: string | null): Tab {
  return v === 'shops' || v === 'posts' ? v : 'applications';
}

// S-21 管理者の画面（6.6、F-66、BR-29）。管理者だけ（RequireRole admin）。
// どの操作も RPC が admin_actions に記録する
export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = toTab(params.get('tab'));
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="管理者の画面" />
      <main className={styles.main}>
        <SegmentedControl
          label="表示するもの"
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
        />
        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'shops' && <ShopsTab />}
        {tab === 'posts' && <PostsTab />}
      </main>
    </AppLayout>
  );
}

// 第3段階の操作のあとは spots、shop、applications、admin 全体を読み直す（11.2）
function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [queryKeys.spots, queryKeys.shop.all, queryKeys.applications.all, queryKeys.admin.all].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

const STATUS_LABELS = { pending: '審査中', approved: '承認', rejected: '却下' } as const;

function ApplicationsTab() {
  const list = useQuery({ queryKey: queryKeys.admin.applications, queryFn: getApplications });
  if (list.isPending) return <PlanCardSkeletonList count={3} />;
  if (list.isError) {
    return <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />;
  }
  if (list.data.length === 0) {
    return <EmptyState icon={StateIcons.empty} title={AdminMessages.noApplications} />;
  }
  return (
    <ul className={styles.list}>
      {list.data.map((a) => (
        <li key={a.id}>
          <Link to={`/admin/applications/${a.id}`} className={styles.row}>
            <span className={styles.badge}>
              <ShopIcons.shop size={16} aria-hidden="true" />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{a.shopName}</span>
              <span className={styles.rowSub}>
                {a.spot.name}・{formatDate(a.createdAt)}
              </span>
            </span>
            <span className={`${styles.status} ${a.status === 'pending' ? styles.pending : ''}`}>
              {STATUS_LABELS[a.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type ShopAction =
  | { kind: 'shop'; shop: ShopDetail; value: 'active' | 'suspended' }
  | { kind: 'campaign'; shop: ShopDetail; value: 'active' | 'stopped' };

function ShopsTab() {
  const toast = useToast();
  const refresh = useRefresh();
  const shops = useQuery({ queryKey: queryKeys.admin.shops, queryFn: getShops });
  const [action, setAction] = useState<ShopAction | null>(null);

  const run = useMutation({
    mutationFn: ({ a, reason }: { a: ShopAction; reason: string }) =>
      a.kind === 'shop'
        ? setShopStatus(a.shop.id, a.value, reason)
        : setCampaignStatus(a.shop.campaign?.id ?? '', a.value, reason),
    onSuccess: async () => {
      setAction(null);
      toast.show({ type: 'success', message: AdminMessages.done });
      await refresh();
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  if (shops.isPending) return <PlanCardSkeletonList count={3} />;
  if (shops.isError) {
    return <ErrorState message={errorMessage(shops.error)} onRetry={() => shops.refetch()} />;
  }
  if (shops.data.length === 0) {
    return <EmptyState icon={StateIcons.empty} title={AdminMessages.noShops} />;
  }

  const menuOf = (shop: ShopDetail): MenuItem[] => {
    const items: MenuItem[] = [
      shop.status === 'active'
        ? {
            label: 'お店を停止',
            icon: ShopIcons.shop,
            danger: true,
            onSelect: () => setAction({ kind: 'shop', shop, value: 'suspended' }),
          }
        : {
            label: 'お店を再開',
            icon: ShopIcons.approve,
            onSelect: () => setAction({ kind: 'shop', shop, value: 'active' }),
          },
    ];
    if (shop.campaign?.status === 'active') {
      items.push({
        label: 'キャンペーンを停止',
        icon: ShopIcons.campaign,
        danger: true,
        onSelect: () => setAction({ kind: 'campaign', shop, value: 'stopped' }),
      });
    } else if (shop.campaign?.status === 'stopped') {
      items.push({
        label: 'キャンペーンを再開',
        icon: ShopIcons.approve,
        onSelect: () => setAction({ kind: 'campaign', shop, value: 'active' }),
      });
    }
    return items;
  };

  return (
    <>
      <ul className={styles.list}>
        {shops.data.map((shop) => (
          <li key={shop.id} className={styles.row}>
            <span className={styles.badge}>
              <ShopIcons.shop size={16} aria-hidden="true" />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{shop.name}</span>
              <Link to={`/spots/${shop.spot.id}`} className={styles.rowSub}>
                {shop.spot.name}
              </Link>
              <span className={styles.rowSub}>
                キャンペーン：
                {shop.campaign
                  ? `${shop.campaign.title}${shop.campaign.status === 'stopped' ? '（停止中）' : ''}`
                  : 'なし'}
              </span>
            </span>
            <span
              className={`${styles.status} ${shop.status === 'suspended' ? styles.danger : ''}`}
            >
              {AdminMessages.status[shop.status]}
            </span>
            <DropdownMenu items={menuOf(shop)} label={`${shop.name}の操作`} />
          </li>
        ))}
      </ul>
      <ReasonDialog
        open={action !== null}
        title={action ? actionTitle(action) : ''}
        confirmLabel={action ? actionTitle(action) : ''}
        danger={action?.value === 'suspended' || action?.value === 'stopped'}
        loading={run.isPending}
        onConfirm={(reason) => action && run.mutate({ a: action, reason })}
        onCancel={() => setAction(null)}
      />
    </>
  );
}

function actionTitle(a: ShopAction): string {
  if (a.kind === 'shop') return a.value === 'suspended' ? 'お店を停止' : 'お店を再開';
  return a.value === 'stopped' ? 'キャンペーンを停止' : 'キャンペーンを再開';
}

function PostsTab() {
  const toast = useToast();
  const refresh = useRefresh();
  const posts = useInfiniteQuery({
    queryKey: queryKeys.admin.posts,
    queryFn: ({ pageParam }) => getAllSpotPosts({ page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
  });
  const [target, setTarget] = useState<SpotPost | null>(null);

  const run = useMutation({
    mutationFn: ({ post, reason }: { post: SpotPost; reason: string }) =>
      setSpotPostHidden(post.id, !post.isHidden, reason),
    onSuccess: async () => {
      setTarget(null);
      toast.show({ type: 'success', message: AdminMessages.done });
      await refresh();
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  if (posts.isPending) return <PlanCardSkeletonList count={3} />;
  if (posts.isError) {
    return <ErrorState message={errorMessage(posts.error)} onRetry={() => posts.refetch()} />;
  }
  const items = posts.data.pages.flatMap((p) => p.items);
  if (items.length === 0) {
    return <EmptyState icon={StateIcons.empty} title={AdminMessages.noPosts} />;
  }
  return (
    <>
      <ul className={styles.posts}>
        {items.map((post) => (
          <li key={post.id} className={styles.post}>
            {/* スポット名を押すと S-05。使用中止は S-05 のメニューから */}
            <Link to={`/spots/${post.spot.id}`} className={styles.spotLink}>
              {post.spot.name}
            </Link>
            <SpotPostCard
              post={post}
              menu={
                <DropdownMenu
                  label="投稿の操作"
                  items={[
                    post.isHidden
                      ? {
                          label: '再表示する',
                          icon: ShopIcons.approve,
                          onSelect: () => setTarget(post),
                        }
                      : {
                          label: '非表示にする',
                          icon: ActionIcons.unpublish,
                          danger: true,
                          onSelect: () => setTarget(post),
                        },
                  ]}
                />
              }
            />
          </li>
        ))}
      </ul>
      {posts.hasNextPage && (
        <Button
          variant="secondary"
          fullWidth
          loading={posts.isFetchingNextPage}
          onClick={() => void posts.fetchNextPage()}
        >
          もっと見る
        </Button>
      )}
      <ReasonDialog
        open={target !== null}
        title={target?.isHidden ? '再表示する' : '非表示にする'}
        confirmLabel={target?.isHidden ? '再表示する' : '非表示にする'}
        danger={!target?.isHidden}
        loading={run.isPending}
        onConfirm={(reason) => target && run.mutate({ post: target, reason })}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
