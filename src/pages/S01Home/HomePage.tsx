import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SceneryShow } from '@/components/common/SceneryShow';
import { SectionHeading } from '@/components/common/SectionHeading';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, MapIcons, StateIcons, type LucideIcon } from '@/lib/icons';
import styles from './HomePage.module.css';

const TOP = 3; // BR-11：ホームには定番以外ランキングの上位3件

// ひとことを「、」のあとで分ける
const LEAD_LINES = UiMessages.homeLead.split(/(?<=、)/);

// 3つの入口（6.4 S-01）。行き先は変えず、ひとことの説明を添える（v23）
const ENTRIES: { to: string; label: string; note: string; icon: LucideIcon }[] = [
  {
    to: '/map',
    label: '地図で探す',
    note: '写真のピンから、気になる場所を見つける',
    icon: MapIcons.map,
  },
  {
    to: '/search',
    label: 'プランを探す',
    note: 'タグや天気から、みんなの旅のプランを選ぶ',
    icon: ActionIcons.search,
  },
  {
    to: '/create',
    label: 'プランを作る',
    note: '行きたい場所を並べて、自分の旅程にする',
    icon: ActionIcons.create,
  },
];

// S-01 ホーム（6.4）。下部タブは出さない。
// （v23）サイトの入口として、名所の写真の大きな見出し、3つの入口、ランキング、フッター（出典）を並べる
export function HomePage() {
  const navigate = useNavigate();
  const ranking = useQuery({
    queryKey: queryKeys.plans.ranking('minor', TOP),
    queryFn: () => getRanking({ type: 'minor', limit: TOP }),
  });
  const Arrow = ActionIcons.forward;

  return (
    <AppLayout
      showTabBar={false}
      siteHeaderOnPhone
      siteHeaderRight={
        <IconButton
          icon={ActionIcons.mypage}
          label="マイページ"
          onClick={() => navigate('/mypage')}
        />
      }
      footerSources
      wide
    >
      <main className={styles.main}>
        <section className={styles.hero} aria-label="旅ノート金沢について">
          <div className={styles.heroText}>
            <span className={styles.heroLatin} aria-hidden="true">
              KANAZAWA
            </span>
            {/* 「、」で区切って、PC の縦書きでは行を分ける */}
            <p className={styles.lead}>
              {LEAD_LINES.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
          <div className={styles.heroPhoto}>
            <SceneryShow />
          </div>
        </section>

        <nav className={styles.entries} aria-label="このサイトでできること">
          {ENTRIES.map(({ to, label, note, icon: Icon }) => (
            <Link key={to} to={to} className={styles.entry}>
              <span className={styles.entryIcon}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className={styles.entryWords}>
                <span className={styles.entryLabel}>{label}</span>
                <span className={styles.entryNote}>{note}</span>
              </span>
              <Arrow size={20} aria-hidden="true" className={styles.entryArrow} />
            </Link>
          ))}
        </nav>

        <section className={styles.ranking} aria-labelledby="home-ranking">
          <SectionHeading
            id="home-ranking"
            title="定番以外ランキング"
            latin="RANKING"
            action={
              <Link to="/ranking?type=minor" className={styles.more}>
                もっと見る
                <Arrow size={16} aria-hidden="true" />
              </Link>
            }
          />
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
    </AppLayout>
  );
}
