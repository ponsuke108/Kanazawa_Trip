import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';

// S-12 ログイン・登録（I-06 の時点では空の画面）
export function LoginPage() {
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="ログイン" backTo={null} />
    </AppLayout>
  );
}
