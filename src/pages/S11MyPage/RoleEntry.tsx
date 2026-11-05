import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getMyApplication } from '@/api/shops';
import { ShopMessages } from '@/constants/messages';
import { ShopIcons } from '@/lib/icons';
import type { UserRole } from '@/types/models';
import styles from './MyPage.module.css';

// お店・管理者の入口（6.4 S-11、BR-26）。利用者の種類に合わせて1つ出す
export function RoleEntry({ role }: { role: UserRole }) {
  if (role === 'admin') {
    const Icon = ShopIcons.admin;
    return (
      <Link to="/admin" className={styles.search}>
        <Icon size={20} aria-hidden="true" />
        管理者の画面
      </Link>
    );
  }
  if (role === 'official') {
    const Icon = ShopIcons.shop;
    return (
      <Link to="/official" className={styles.search}>
        <Icon size={20} aria-hidden="true" />
        お店の管理
      </Link>
    );
  }
  return <ApplicationEntry />;
}

// 一般：「お店として申請する」。審査中・却下（理由）も出す
function ApplicationEntry() {
  const mine = useQuery({ queryKey: queryKeys.applications.mine, queryFn: getMyApplication });
  const Icon = ShopIcons.shop;
  const application = mine.data;
  if (application?.status === 'pending') {
    return (
      <p className={styles.search} role="status">
        <Icon size={20} aria-hidden="true" />
        申請を審査中です
      </p>
    );
  }
  if (application?.status === 'rejected') {
    return (
      <div className={styles.roleBox}>
        <p className={styles.roleRejected}>{ShopMessages.rejected(application.rejectReason)}</p>
        <Link to="/official/apply" className={styles.search}>
          <Icon size={20} aria-hidden="true" />
          申請し直す
        </Link>
      </div>
    );
  }
  return (
    <Link to="/official/apply" className={styles.search}>
      <Icon size={20} aria-hidden="true" />
      お店として申請する
    </Link>
  );
}
