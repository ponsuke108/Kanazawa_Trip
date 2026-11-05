import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getPlan } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { LazyRouteMap } from '@/components/map/LazyMapView';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { formatTitle } from '@/lib/format';
import { StateIcons } from '@/lib/icons';
import { toRouteStops } from '@/lib/route';
import { WholeNavi } from '@/pages/S18Navi/WholeNavi';
import styles from './NaviPage.module.css';

// S-18 全体のナビ（6.4、F-08、BR-23）。下部タブは出さない（6.1）
export function NaviPage() {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const plan = useQuery({
    queryKey: queryKeys.plans.detail(planId),
    queryFn: () => getPlan(planId),
  });
  const data = plan.data;
  const stops = useMemo(() => toRouteStops(data?.blocks ?? []), [data?.blocks]);
  const spotCount = data ? data.blocks.filter((b) => b.type === 'spot').length : 0;

  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="全体のナビ" />
      <main className={styles.main}>
        {plan.isPending ? (
          <PlanCardSkeletonList count={2} />
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
            <div className={styles.planInfo}>
              <h1 className={styles.title}>{formatTitle(data.title)}</h1>
              <p className={styles.count}>スポット {spotCount}か所</p>
            </div>
            {stops.length > 0 && (
              <div className={styles.map}>
                <LazyRouteMap stops={stops} />
              </div>
            )}
            <div className={styles.navi}>
              <WholeNavi blocks={data.blocks} />
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
