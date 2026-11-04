import { Link, useNavigate } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { ActionIcons } from '@/lib/icons';
import styles from './CreatePage.module.css';

// S-14 作る（6.4、BR-18、K31）。下部タブ「作る」の画面。
// 「リストから作る」（リストのカード、新しいリスト）は I-31 で足す
export function CreatePage() {
  const navigate = useNavigate();
  return (
    <AppLayout showTabBar>
      <PageHeader title="作る" showSiteName />
      <main className={styles.main}>
        <section className={styles.newPlan} aria-label="新しく作る">
          <Button
            icon={ActionIcons.create}
            fullWidth
            className={styles.big}
            onClick={() => navigate('/plans/new')}
          >
            新しくプランを作る
          </Button>
          <p className={styles.note}>
            地図にあるすべてのスポットから選んで作ります。リストに保存した場所は上に出ます
          </p>
        </section>

        <ul className={styles.others}>
          <li>
            <Link to="/search">プランを探してコピーする</Link>
          </li>
          <li>
            <Link to="/mypage?tab=mine">下書きの続きを書く</Link>
          </li>
        </ul>
      </main>
    </AppLayout>
  );
}
