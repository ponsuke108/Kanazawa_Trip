import { Outlet } from 'react-router-dom';
import BottomTabs from './BottomTabs';
import styles from './AppLayout.module.css';

// 全画面の共通の枠。スマホ幅の列＋画面下部の固定タブ（設計書 v3 8章）
export default function AppLayout() {
  return (
    <div className={styles.column}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
