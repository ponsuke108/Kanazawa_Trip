import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getPlansBySpot } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { getSpotPosts } from '@/api/spotPosts';
import { getSpot } from '@/api/spots';
import { AddToListSheet } from '@/components/common/AddToListSheet';
import { AppLayout } from '@/components/common/AppLayout';
import { CampaignPanel } from '@/components/common/CampaignPanel';
import { Button } from '@/components/common/Button';
import { DropdownMenu } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SpotPostCard } from '@/components/common/SpotPostCard';
import { LazyMapView } from '@/components/map/LazyMapView';
import { MapAttribution } from '@/components/map/MapAttribution';
import { UiMessages } from '@/constants/messages';
import { isDemoSpot, SpotTypeLabels } from '@/constants/spots';
import { useCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ListIcons, PostIcons, ShopIcons, StateIcons } from '@/lib/icons';
import type { SpotDetail } from '@/types/models';
import styles from './SpotPage.module.css';

const MAP_HEIGHT = '160px'; // 6.4 S-05：小さな地図の高さ

// S-05 スポット詳細（6.4、F-41、BR-21、K37）。
// キャンペーンの表示は I-37 で足す
export function SpotPage() {
  const { spotId: raw = '' } = useParams();
  const spotId = Number(raw);
  const navigate = useNavigate();

  const spot = useQuery({
    queryKey: queryKeys.spot.detail(spotId),
    queryFn: () => getSpot(spotId),
  });
  const data = spot.data;

  return (
    <AppLayout showTabBar>
      <PageHeader title={data?.name ?? 'スポット'} />
      <main className={styles.main}>
        {spot.isPending ? (
          <PlanCardSkeletonList count={2} />
        ) : spot.isError ? (
          <ErrorState message={errorMessage(spot.error)} onRetry={() => spot.refetch()} />
        ) : !data ? (
          <EmptyState
            icon={StateIcons.noResults}
            title={UiMessages.spotNotFound}
            action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
          />
        ) : (
          <SpotDetailView spot={data} />
        )}
      </main>
    </AppLayout>
  );
}

function SpotDetailView({ spot }: { spot: SpotDetail }) {
  const navigate = useNavigate();
  const PostIcon = PostIcons.post;
  const Ticket = ShopIcons.campaign;
  const [listOpen, setListOpen] = useState(false);

  return (
    <>
      {!spot.isActive && (
        <p className={styles.inactive} role="note">
          {UiMessages.spotInactive}
        </p>
      )}

      <section className={styles.info} aria-label="スポットの情報">
        <div className={styles.labels}>
          <span className={styles.label}>{SpotTypeLabels[spot.spotType]}</span>
          {isDemoSpot(spot.id) && <span className={styles.label}>デモ</span>}
          {spot.campaign && (
            <span className={`${styles.label} ${styles.campaignLabel}`}>
              <Ticket size={14} aria-hidden="true" />
              {UiMessages.campaignActive}
            </span>
          )}
        </div>
        {/* 押すと地図（S-13）でこのスポットを選んだ状態で開く */}
        <Link
          to={`/map?spot=${spot.id}`}
          className={styles.mapLink}
          aria-label={`${spot.name}を地図で見る`}
        >
          <LazyMapView spots={[spot]} interactive={false} fitToSpots height={MAP_HEIGHT} />
        </Link>
        {spot.description && <p className={styles.description}>{spot.description}</p>}
        {spot.address && <p className={styles.sub}>{spot.address}</p>}
        {spot.area && <p className={styles.sub}>エリア：{spot.area}</p>}
      </section>

      {/* （v11）キャンペーン中なら、そのキャンペーン（K47、BR-27、BR-28） */}
      {spot.campaign && (
        <CampaignPanel campaign={spot.campaign}>
          <p className={styles.campaignNote}>{UiMessages.campaignHowTo}</p>
        </CampaignPanel>
      )}

      <div className={styles.actions}>
        <Button
          variant="secondary"
          icon={ListIcons.add}
          fullWidth
          disabled={!spot.isActive}
          onClick={() => setListOpen(true)}
        >
          リストに追加
        </Button>
        <Button
          icon={PostIcon}
          fullWidth
          disabled={!spot.isActive}
          onClick={() => navigate(`/posts/new?spot=${spot.id}`)}
        >
          ここに投稿
        </Button>
      </div>

      <SpotPosts spotId={spot.id} />
      <SpotPlans spotId={spot.id} />

      {/* 利用者のスポットは OpenStreetMap の場所の情報を使っている（BR-19） */}
      {spot.source === 'user' && <MapAttribution />}
      <AddToListSheet
        spot={{ kind: 'spot', spot }}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />
    </>
  );
}

// 投稿を新しい順に20件ずつ（BR-21）
function SpotPosts({ spotId }: { spotId: number }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const posts = useInfiniteQuery({
    queryKey: queryKeys.spot.posts(spotId),
    queryFn: ({ pageParam }) => getSpotPosts({ spotId, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
  });
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className={styles.section} aria-labelledby="spot-posts">
      <h2 id="spot-posts" className={styles.heading}>
        投稿
      </h2>
      {posts.isPending ? (
        <PlanCardSkeletonList count={2} />
      ) : posts.isError ? (
        <ErrorState message={errorMessage(posts.error)} onRetry={() => posts.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={PostIcons.post} title={UiMessages.noSpotPosts} />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((post) => (
              <li key={post.id}>
                <SpotPostCard
                  post={post}
                  menu={
                    post.author.id === user.id ? (
                      <DropdownMenu
                        items={[
                          {
                            label: '編集',
                            icon: ActionIcons.edit,
                            onSelect: () => navigate(`/posts/${post.id}/edit`),
                          },
                        ]}
                      />
                    ) : undefined
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
              onClick={() => posts.fetchNextPage()}
            >
              もっと見る
            </Button>
          )}
        </>
      )}
    </section>
  );
}

// このスポットを含む公開中のプラン（いいね数の多い順に最大5件）
function SpotPlans({ spotId }: { spotId: number }) {
  const plans = useQuery({
    queryKey: queryKeys.plans.bySpot(spotId),
    queryFn: () => getPlansBySpot(spotId),
  });
  return (
    <section className={styles.section} aria-labelledby="spot-plans">
      <h2 id="spot-plans" className={styles.heading}>
        このスポットを含むプラン
      </h2>
      {plans.isPending ? (
        <PlanCardSkeletonList count={2} />
      ) : plans.isError ? (
        <ErrorState message={errorMessage(plans.error)} onRetry={() => plans.refetch()} />
      ) : plans.data.length === 0 ? (
        <EmptyState icon={StateIcons.empty} title={UiMessages.noPlans} />
      ) : (
        <ol className={styles.planList}>
          {plans.data.map((p) => (
            <li key={p.id}>
              <PlanCard plan={p} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
