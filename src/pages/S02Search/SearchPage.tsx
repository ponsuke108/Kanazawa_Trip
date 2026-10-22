import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getTags } from '@/api/tags';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { TagSelector } from '@/components/common/TagSelector';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons } from '@/lib/icons';
import { parseTagIds, tagsQuery } from '@/lib/tagParams';
import styles from './SearchPage.module.css';

// S-02 検索条件（6.4、F-01）
export function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = parseTagIds(params.get('tags'));
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: getTags,
    staleTime: STALE_TIME.never,
  });

  // 選択状態は URL の tags に持つ（S-03 の「条件を変える」から戻ったときに復元するため）
  const setSelected = (ids: number[]) => {
    const p = new URLSearchParams(params);
    if (ids.length > 0) p.set('tags', ids.join(','));
    else p.delete('tags');
    setParams(p, { replace: true });
  };

  return (
    <AppLayout showTabBar bottomBar>
      <PageHeader title="プランを探す" showSiteName />
      <main className={styles.main}>
        {tags.isPending ? (
          <FullScreenLoading />
        ) : tags.isError ? (
          <ErrorState message={errorMessage(tags.error)} onRetry={() => tags.refetch()} />
        ) : (
          <>
            <div className={styles.lead}>
              <p>気になるタグを選んでください。どれか1つでも合うプランが見つかります。</p>
              {selected.length > 0 && (
                <Button variant="ghost" onClick={() => setSelected([])}>
                  選択をクリア
                </Button>
              )}
            </div>
            <TagSelector tags={tags.data} selectedIds={selected} onChange={setSelected} />
          </>
        )}
      </main>
      <BottomActionBar aboveTabBar>
        <Button
          icon={ActionIcons.search}
          onClick={() => navigate(`/search/results${tagsQuery(selected)}`)}
        >
          この条件で探す{selected.length > 0 ? `（${selected.length}件選択中）` : ''}
        </Button>
      </BottomActionBar>
    </AppLayout>
  );
}
