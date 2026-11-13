import { Link, useNavigate } from 'react-router';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { SceneryShow } from '@/components/common/SceneryShow';
import { ActionIcons, StatusIcons } from '@/lib/icons';
import { ListsSection } from '@/pages/S14Create/ListsSection';
import { TeaHero } from '@/pages/S14Create/TeaHero';
import styles from './CreatePage.module.css';

// S-14 作る（6.4、BR-18、K31）。下部タブ「作る」の画面。
export function CreatePage() {
  const navigate = useNavigate();
  const Copy = ActionIcons.copy;
  const Draft = StatusIcons.draft;
  return (
    <AppLayout showTabBar shiori>
      <PageHeader title="作る" showSiteName />
      <main className={styles.main}>
        {/* （v20）PC だけ、上に名所の写真の帯（7.9） */}
        <SceneryShow variant="banner" />

        {/* PC は左に「新しく作る」、右に「リストから作る」と「ほかの始め方」の2列（v20、7.8） */}
        <div className={styles.columns}>
          <div className={styles.start}>
            <TeaHero />

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
          </div>

          <div className={styles.rest}>
            <ListsSection />

            {/* （v18）ほかの始め方：細い線で区切った行（7.9） */}
            <section className={styles.othersSection} aria-labelledby="others-heading">
              <h2 id="others-heading" className={styles.othersHeading}>
                ほかの始め方
              </h2>
              <ul className={styles.others}>
                <li>
                  <Link to="/search">
                    <Copy size={20} aria-hidden="true" />
                    プランを探してコピーする
                  </Link>
                </li>
                <li>
                  <Link to="/mypage?tab=mine">
                    <Draft size={20} aria-hidden="true" />
                    下書きの続きを書く
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
