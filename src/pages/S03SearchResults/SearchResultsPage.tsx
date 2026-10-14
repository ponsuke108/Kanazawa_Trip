import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-03 検索結果一覧（I-06 の時点では空の画面）
export function SearchResultsPage() {
  return (
    <AppLayout showTabBar={true}>
      <PageHeader title="検索結果" />
    </AppLayout>
  );
}
