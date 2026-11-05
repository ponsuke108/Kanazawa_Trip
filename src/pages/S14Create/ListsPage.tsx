import { AppLayout } from '@/components/common/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { ListsSection } from '@/pages/S14Create/ListsSection';
import styles from './CreatePage.module.css';

// /lists：S-14 の「リストから作る」の部分だけを大きく出す。S-15 から戻る先（6.2）
export function ListsPage() {
  return (
    <AppLayout showTabBar>
      <PageHeader title="リスト" backTo="/create" />
      <main className={styles.main}>
        <ListsSection />
      </main>
    </AppLayout>
  );
}
