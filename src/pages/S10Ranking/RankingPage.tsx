import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-10 ランキング（I-06 の時点では空の画面）
export function RankingPage() {
  return (
    <AppLayout showTabBar={true}>
      <PageHeader title="ランキング" showSiteName />
    </AppLayout>
  );
}
