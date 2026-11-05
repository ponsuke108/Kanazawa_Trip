import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getSharedPlan } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { BlockList } from '@/components/blocks/BlockList';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { PlanHeading } from '@/components/common/PlanHeading';
import { LazyRouteMap } from '@/components/map/LazyMapView';
import { ShareMessages } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import { formatKm, routeDistanceKm, toRouteStops } from '@/lib/route';
import { WholeNavi } from '@/pages/S18Navi/WholeNavi';
import styles from './SharedPlanPage.module.css';

// 共有ページは検索エンジンに載せない（BR-30）。vercel.json の X-Robots-Tag と合わせて、meta でも伝える
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

// S-24 共有されたプラン（6.4、F-45、BR-30）。ログインしていなくても見られる（RequireAuth の外）。
// getSharedPlan だけを使い、いいね・コピー・編集は出さない（8.3）
export function SharedPlanPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  useNoIndex();

  const plan = useQuery({
    queryKey: queryKeys.shared(token),
    queryFn: () => getSharedPlan(token),
  });
  const data = plan.data;
  const stops = useMemo(() => toRouteStops(data?.blocks ?? []), [data?.blocks]);
  const loginUrl = `/login?redirect=${encodeURIComponent(`/shared/${token}`)}`;

  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="共有されたプラン" showSiteName backTo={null} />
      <main className={styles.main}>
        {plan.isPending ? (
          <PlanCardSkeletonList count={3} />
        ) : plan.isError ? (
          <ErrorState message={errorMessage(plan.error)} onRetry={() => plan.refetch()} />
        ) : data === null || data === undefined ? (
          <EmptyState icon={StateIcons.noResults} title={ShareMessages.notShared} />
        ) : (
          <>
            <PlanHeading plan={data} />
            {!user && (
              <div className={styles.guest}>
                <p>{ShareMessages.guestLead}</p>
                <Button icon={ActionIcons.login} onClick={() => navigate(loginUrl)}>
                  ログイン・登録
                </Button>
              </div>
            )}
            {stops.length > 0 && (
              <section className={styles.route} aria-label="経路順の地図">
                {stops.length > 1 && (
                  <p className={styles.distance}>直線 約{formatKm(routeDistanceKm(stops))}</p>
                )}
                <div className={styles.map}>
                  <LazyRouteMap stops={stops} />
                </div>
              </section>
            )}
            <BlockList blocks={data.blocks} mode="view" />
            <section className={styles.navi} aria-labelledby="shared-navi-title">
              <h2 id="shared-navi-title" className={styles.naviTitle}>
                全体のナビ
              </h2>
              <WholeNavi blocks={data.blocks} />
            </section>
          </>
        )}
      </main>
    </AppLayout>
  );
}
