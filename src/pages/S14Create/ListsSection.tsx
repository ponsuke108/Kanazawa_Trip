import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getLists } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListCard } from '@/components/common/ListCard';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { ListIcons, MapIcons } from '@/lib/icons';
import { ListNameSheet } from '@/pages/S15List/ListNameSheet';
import styles from './ListsSection.module.css';

// S-14 の「リストから作る」（6.4 S-14、BR-18）。/lists でも同じ内容を出す（6.2）
export function ListsSection({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const navigate = useNavigate();
  const lists = useQuery({ queryKey: queryKeys.lists.all, queryFn: getLists });
  const [naming, setNaming] = useState(false);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <section className={styles.section} aria-labelledby="lists-heading">
      <div className={styles.head}>
        <Heading id="lists-heading" className={styles.heading}>
          リストから作る
        </Heading>
        <Button variant="ghost" icon={ListIcons.newList} onClick={() => setNaming(true)}>
          新しいリスト
        </Button>
      </div>
      {lists.isPending ? (
        <PlanCardSkeletonList count={3} />
      ) : lists.isError ? (
        <ErrorState message={errorMessage(lists.error)} onRetry={() => lists.refetch()} />
      ) : lists.data.length === 0 ? (
        <EmptyState
          icon={ListIcons.list}
          title={UiMessages.noLists}
          action={
            <Button icon={MapIcons.map} onClick={() => navigate('/map')}>
              地図で探す
            </Button>
          }
        />
      ) : (
        <ul className={styles.list}>
          {lists.data.map((l) => (
            <li key={l.id}>
              <ListCard list={l} />
            </li>
          ))}
        </ul>
      )}
      <ListNameSheet
        open={naming}
        mode="create"
        onClose={() => setNaming(false)}
        onDone={(id) => navigate(`/lists/${id}`)}
      />
    </section>
  );
}
