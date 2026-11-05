import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Messages } from '@/constants/messages';
import { useCurrentUser } from '@/hooks/useAuth';
import { StateIcons } from '@/lib/icons';
import type { UserRole } from '@/types/models';

type Props = {
  role: UserRole | UserRole[]; // 開ける利用者の種類
  children: ReactNode;
};

// 利用者の種類で開ける画面を分ける（11.5、6.2、BR-25）。RequireAuth の中で使う。
// 画面の出し分けだけで、守るのはデータベースの RLS と RPC
export function RequireRole({ role, children }: Props) {
  const user = useCurrentUser();
  const roles = Array.isArray(role) ? role : [role];
  if (roles.includes(user.role)) return <>{children}</>;
  return <NotViewable />;
}

// 「このページは見られません」とホームへのボタン（6.2）
function NotViewable() {
  const navigate = useNavigate();
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title={Messages.notViewable} backTo="/" />
      <EmptyState
        icon={StateIcons.alert}
        title={Messages.notViewable}
        action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
      />
    </AppLayout>
  );
}
