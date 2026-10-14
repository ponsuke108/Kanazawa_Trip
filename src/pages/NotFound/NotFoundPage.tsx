import { useNavigate } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { UiMessages } from '@/constants/messages';
import { StateIcons } from '@/lib/icons';

// 存在しないURL（6.1）
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title={UiMessages.notFound} backTo="/" />
      <EmptyState
        icon={StateIcons.noResults}
        title={UiMessages.notFound}
        action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
      />
    </AppLayout>
  );
}
