import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GoldFlakes } from '@/components/common/GoldFlakes';
import { IconButton } from '@/components/common/IconButton';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { Reveal } from '@/components/common/Reveal';
import { SceneryShow } from '@/components/common/SceneryShow';
import { SectionHeading } from '@/components/common/SectionHeading';
import { YukitsuriArt } from '@/components/common/YukitsuriArt';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import {
  ActionIcons,
  BlockIcons,
  ListIcons,
  MapIcons,
  RouteIcons,
  StateIcons,
  type LucideIcon,
} from '@/lib/icons';
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

// 旅ノートの使い方（K75）。いまある機能を、旅の流れの順に紹介する。漢数字は飾り
const STEPS: { no: string; title: string; note: string; icon: LucideIcon }[] = [
  {
    no: '一',
    title: '見つける',
    note: '地図で、定番のその先の場所を見つける',
    icon: StateIcons.spot,
  },
  { no: '二', title: 'ためる', note: '気になる場所を、リストに保存しておく', icon: ListIcons.add },
  {
    no: '三',
    title: '組み立てる',
    note: 'リストからプランを作り、回る順を並べ替える',
    icon: RouteIcons.route,
  },
  {
    no: '四',
    title: '歩く',
    note: '全体のナビで、当日の道のりを開く',
    icon: BlockIcons.directions,
  },
];

// S-01 ホーム（6.4）。下部タブは出さない。
// サイトの入口として、名所の写真の大きな見出し、3つの入口、使い方、ランキング、フッター（出典）を並べる（7.11）
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
          <GoldFlakes />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.heroLatin} aria-hidden="true">
                KANAZAWA
              </span>
              {/* 縦書き（右から左へ読む）。「、」で行を分ける */}
              <p className={styles.lead}>
                {LEAD_LINES.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            </div>
            <div className={styles.heroPhoto}>
              <span className={styles.lattice} aria-hidden="true" />
              <YukitsuriArt className={styles.heroArt} />
              <div className={styles.frame}>
                <SceneryShow />
              </div>
            </div>
          </div>
        </section>

        <nav className={styles.entries} aria-label="このサイトでできること">
          {ENTRIES.map(({ to, label, note, icon: Icon }, i) => (
            <Reveal key={to} delay={i * 90} className={styles.entrySlot}>
              <Link to={to} className={styles.entry}>
                <span className={styles.entryIcon}>
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span className={styles.entryWords}>
                  <span className={styles.entryLabel}>{label}</span>
                  <span className={styles.entryNote}>{note}</span>
                </span>
                <Arrow size={20} aria-hidden="true" className={styles.entryArrow} />
              </Link>
            </Reveal>
          ))}
        </nav>

        <section className={styles.band} aria-labelledby="home-steps">
          <div className={styles.bandInner}>
            <Reveal>
              <SectionHeading id="home-steps" title="旅ノートの使い方" latin="HOW TO USE" />
            </Reveal>
            <ol className={styles.steps}>
              {STEPS.map(({ no, title, note, icon: Icon }, i) => (
                <li key={no} className={styles.stepSlot}>
                  <Reveal delay={i * 90} className={styles.step}>
                    <span className={styles.stepNo} aria-hidden="true">
                      {no}
                    </span>
                    <span className={styles.stepIcon}>
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3 className={styles.stepTitle}>{title}</h3>
                    <p className={styles.stepNote}>{note}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.ranking} aria-labelledby="home-ranking">
          <Reveal>
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
          </Reveal>
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
                  <Reveal delay={i * 90} className={styles.cardSlot}>
                    <PlanCard plan={plan} rank={i + 1} />
                  </Reveal>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </AppLayout>
  );
}
