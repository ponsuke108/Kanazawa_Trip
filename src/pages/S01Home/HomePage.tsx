import { AppLayout } from '@/components/common/AppLayout';
import { Logo } from '@/components/common/Logo';

// S-01 ホーム（I-06 の時点では空の画面）。下部タブは出さない（6.1）
export function HomePage() {
  return (
    <AppLayout showTabBar={false}>
      <Logo size="lg" />
    </AppLayout>
  );
}
