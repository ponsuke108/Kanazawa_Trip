import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking, type RankingType } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { StateIcons } from '@/lib/icons';
import styles from './RankingPage.module.css';

const LIMIT = 20; // BR-11：上位20件

const TYPES: Array<{ value: RankingType; label: string }> = [
  { value: 'overall', label: '総合' },
  { value: 'minor', label: '定番以外' },
];

// S-10 ランキング（6.4、F-21、F-22、BR-11）
export function RankingPage() {
  const [params, setParams] = useSearchParams();
  const type: RankingType = params.get('type') === 'minor' ? 'minor' : 'overall';
  const ranking = useQuery({
    queryKey: queryKeys.plans.ranking(type, LIMIT),
    queryFn: () => getRanking({ type, limit: LIMIT }),
  });

  return (
    <AppLayout showTabBar>
      <PageHeader title="ランキング" showSiteName />
      <main className={styles.main}>
        <SegmentedControl
          options={TYPES}
          value={type}
          onChange={(v) => setParams({ type: v }, { replace: true })}
          label="ランキングの種類"
        />
        {type === 'minor' && <p className={styles.lead}>{UiMessages.minorRankingLead}</p>}
        {ranking.isPending ? (
          <PlanCardSkeletonList count={5} />
        ) : ranking.isError ? (
          <ErrorState message={errorMessage(ranking.error)} onRetry={() => ranking.refetch()} />
        ) : ranking.data.length === 0 ? (
          <EmptyState icon={StateIcons.trophy} title={UiMessages.noRanking} />
        ) : (
          <ol className={styles.list}>
            {ranking.data.map((plan, i) => (
              <li key={plan.id}>
                <PlanCard plan={plan} rank={i + 1} />
              </li>
            ))}
          </ol>
        )}
      </main>
    </AppLayout>
  );
}
