import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/common/AppLayout';
import S01Home from './pages/S01Home';
import S02Search from './pages/S02Search';
import S03SearchResults from './pages/S03SearchResults';
import S04PlanDetail from './pages/S04PlanDetail';
import S06PlanEditor from './pages/S06PlanEditor';
import S08Publish from './pages/S08Publish';
import S10Ranking from './pages/S10Ranking';
import S11MyPage from './pages/S11MyPage';
import S12Login from './pages/S12Login';
import NotFound from './pages/NotFound';

// URLと画面の対応（設計書 v3 7章）
// 全画面のルートを最初に登録してある。各担当は pages/ の中身だけを書き換えればよく、
// このファイルは基本的に触らない（衝突を避けるため）。
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<S01Home />} />
          <Route path="/search" element={<S02Search />} />
          <Route path="/search/results" element={<S03SearchResults />} />
          {/* 新規 /plans/new、コピー時 /plans/new?from=:planId */}
          <Route path="/plans/new" element={<S06PlanEditor />} />
          <Route path="/plans/:planId" element={<S04PlanDetail />} />
          <Route path="/plans/:planId/edit" element={<S06PlanEditor />} />
          {/* S-08 と S-09 は同じURLのステップ */}
          <Route path="/plans/:planId/publish" element={<S08Publish />} />
          <Route path="/ranking" element={<S10Ranking />} />
          <Route path="/mypage" element={<S11MyPage />} />
          <Route path="/login" element={<S12Login />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
