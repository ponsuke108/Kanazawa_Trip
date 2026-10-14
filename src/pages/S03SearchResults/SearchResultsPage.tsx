import { Link, useNavigate, useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { searchPlans } from '@/api/plans';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getTags } from '@/api/tags';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCard } from '@/components/common/PlanCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { TagChip } from '@/components/common/TagChip';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { StateIcons } from '@/lib/icons';
import { parseTagIds, tagsQuery } from '@/lib/tagParams';
import styles from './SearchResultsPage.module.css';

// S-03 検索結果一覧（6.4、F-03、F-04、BR-01）
export function SearchResultsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tagIds = parseTagIds(params.get('tags'));
  const backTo = `/search${tagsQuery(tagIds)}`;

  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
  });
  // BR-01：20件ずつ。「もっと見る」で次の20件
  const result = useInfiniteQuery({
    queryKey: queryKeys.plans.search(tagIds),
    queryFn: ({ pageParam }) => searchPlans({ tagIds, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
  });

  const selectedTags = (tags.data ?? []).filter((t) => tagIds.includes(t.id));
  const items = result.data?.pages.flatMap((p) => p.items) ?? [];
  const total = result.data?.pages[0]?.totalCount ?? 0;

  return (
    <AppLayout showTabBar>
      <PageHeader title="検索結果" backTo={backTo} />
      <main className={styles.main}>
        <section className={styles.condition} aria-label="検索の条件">
          <div className={styles.chips}>
            {tagIds.length === 0 ? (
              <span className={styles.all}>すべてのプラン</span>
            ) : (
              selectedTags.map((t) => <TagChip key={t.id} tag={t} />)
            )}
          </div>
          <Link to={backTo} className={styles.change}>
            条件を変える
          </Link>
        </section>

        {result.isPending ? (
          <PlanCardSkeletonList count={5} />
        ) : result.isError ? (
          <ErrorState message={errorMessage(result.error)} onRetry={() => result.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={StateIcons.noResults}
            title={UiMessages.noSearchResults}
            action={
              <Button variant="secondary" onClick={() => navigate(backTo)}>
                条件を変える
              </Button>
            }
          />
        ) : (
          <>
            <p className={styles.count}>{total}件のプラン</p>
            <ol className={styles.list}>
              {items.map((plan) => (
                <li key={plan.id}>
                  <PlanCard plan={plan} />
                </li>
              ))}
            </ol>
            {result.hasNextPage && (
              <Button
                variant="secondary"
                fullWidth
                loading={result.isFetchingNextPage}
                onClick={() => result.fetchNextPage()}
              >
                もっと見る
              </Button>
            )}
          </>
        )}
      </main>
    </AppLayout>
  );
}
