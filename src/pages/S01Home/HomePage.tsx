import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { Logo } from '@/components/common/Logo';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { UiMessages } from '@/constants/messages';
import { DataSources } from '@/constants/sources';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import styles from './HomePage.module.css';

const TOP = 3; // BR-11：ホームには定番以外ランキングの上位3件

// S-01 ホーム（6.4）。下部タブは出さない
export function HomePage() {
  const navigate = useNavigate();
  const ranking = useQuery({
    queryKey: queryKeys.plans.ranking('minor', TOP),
    queryFn: () => getRanking({ type: 'minor', limit: TOP }),
  });

  return (
    <AppLayout showTabBar={false}>
      <header className={styles.header}>
        <Logo size="lg" />
        <IconButton
          icon={ActionIcons.mypage}
          label="マイページ"
          onClick={() => navigate('/mypage')}
        />
      </header>
      <main className={styles.main}>
        <p className={styles.lead}>{UiMessages.homeLead}</p>
        <div className={styles.entries}>
          <Button icon={ActionIcons.search} fullWidth onClick={() => navigate('/search')}>
            プランを探す
          </Button>
          <Button
            variant="secondary"
            icon={ActionIcons.create}
            fullWidth
            onClick={() => navigate('/plans/new')}
          >
            プランを作る
          </Button>
        </div>

        <section className={styles.ranking} aria-labelledby="home-ranking">
          <div className={styles.sectionHead}>
            <h2 id="home-ranking" className={styles.heading}>
              定番以外ランキング
            </h2>
            <Link to="/ranking?type=minor" className={styles.more}>
              もっと見る
            </Link>
          </div>
          {ranking.isPending ? (
            <PlanCardSkeletonList count={TOP} />
          ) : ranking.isError ? (
            <ErrorState message={errorMessage(ranking.error)} onRetry={() => ranking.refetch()} />
          ) : ranking.data.length === 0 ? (
            <EmptyState icon={StateIcons.trophy} title={UiMessages.noPlans} />
          ) : (
            <ol className={styles.list}>
              {ranking.data.map((plan, i) => (
                <li key={plan.id}>
                  <PlanCard plan={plan} rank={i + 1} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className={styles.sources}>
        <p className={styles.sourcesTitle}>出典</p>
        <ul>
          {DataSources.map((s) => (
            <li key={s.name}>
              {s.label}：
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </li>
          ))}
        </ul>
      </footer>
    </AppLayout>
  );
}
