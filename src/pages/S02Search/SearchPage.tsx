import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-02 検索条件（I-06 の時点では空の画面）
export function SearchPage() {
  return (
    <AppLayout showTabBar={true}>
      <PageHeader title="プランを探す" showSiteName />
    </AppLayout>
  );
}
