import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-04 プラン詳細（I-06 の時点では空の画面）
export function PlanDetailPage() {
  return (
    <AppLayout showTabBar={true}>
      <PageHeader title="プラン" />
    </AppLayout>
  );
}
