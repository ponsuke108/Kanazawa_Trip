import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-06〜S-09 作成画面（I-06 の時点では空の画面）
export function PlanEditorPage() {
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="プランを作成" />
    </AppLayout>
  );
}
