import { useNavigate } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { YukitsuriArt } from '@/components/common/YukitsuriArt';
import { UiMessages } from '@/constants/messages';
import { StateIcons } from '@/lib/icons';
import styles from './NotFoundPage.module.css';

// 存在しないURL（6.1）
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title={UiMessages.notFound} backTo="/" />
      {/* 飾り：雪吊りの絵（7.11、K75） */}
      <YukitsuriArt className={styles.art} />
      <EmptyState
        icon={StateIcons.noResults}
        title={UiMessages.notFound}
        action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
      />
    </AppLayout>
  );
}
