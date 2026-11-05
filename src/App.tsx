import { useState, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { RedirectIfAuthed, RequireAuth } from '@/components/common/RequireAuth';
import { RequireRole } from '@/components/common/RequireRole';
import { RootLayout } from '@/components/common/RootLayout';
import { ToastProvider } from '@/components/common/ToastProvider';
import { AuthProvider } from '@/hooks/AuthProvider';
import { createQueryClient } from '@/lib/queryClient';
import { HomePage } from '@/pages/S01Home/HomePage';
import { SearchPage } from '@/pages/S02Search/SearchPage';
import { SearchResultsPage } from '@/pages/S03SearchResults/SearchResultsPage';
import { PlanDetailPage } from '@/pages/S04PlanDetail/PlanDetailPage';
import { PlanEditorPage } from '@/pages/PlanEditor/PlanEditorPage';
import { RankingPage } from '@/pages/S10Ranking/RankingPage';
import { MyPage } from '@/pages/S11MyPage/MyPage';
import { LoginPage } from '@/pages/S12Login/LoginPage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { SpotPage } from '@/pages/S05Spot/SpotPage';
import { MapPage } from '@/pages/S13Map/MapPage';
import { CreatePage } from '@/pages/S14Create/CreatePage';
import { ListsPage } from '@/pages/S14Create/ListsPage';
import { ListPage } from '@/pages/S15List/ListPage';
import { SpotPostPage } from '@/pages/S17SpotPost/SpotPostPage';
import { NaviPage } from '@/pages/S18Navi/NaviPage';
import { SharedPlanPage } from '@/pages/S24Shared/SharedPlanPage';
import { ApplyPage } from '@/pages/S19Apply/ApplyPage';
import { ShopPage } from '@/pages/S20Shop/ShopPage';
import { RewardPage } from '@/pages/S23Reward/RewardPage';
import type { UserRole } from '@/types/models';

const auth = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;
// （v11）利用者の種類で開ける画面（11.5、6.2）
const authRole = (role: UserRole, page: ReactNode) => (
  <RequireAuth>
    <RequireRole role={role}>{page}</RequireRole>
  </RequireAuth>
);

// URLと画面の対応（要件定義書 11.5）。/login 以外はすべてログイン必須（BR-14）
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: (
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        ),
      },
      // （v11）S-24 共有されたプラン：ログインしていなくても見られる（BR-30、8.3）
      { path: '/shared/:token', element: <SharedPlanPage /> },
      { path: '/', element: auth(<HomePage />) },
      { path: '/search', element: auth(<SearchPage />) },
      { path: '/search/results', element: auth(<SearchResultsPage />) },
      { path: '/plans/new', element: auth(<PlanEditorPage />) },
      { path: '/plans/:planId', element: auth(<PlanDetailPage />) },
      { path: '/plans/:planId/edit', element: auth(<PlanEditorPage />) },
      { path: '/plans/:planId/navi', element: auth(<NaviPage />) },
      { path: '/ranking', element: auth(<RankingPage />) },
      { path: '/mypage', element: auth(<MyPage />) },
      // （v11）
      { path: '/map', element: auth(<MapPage />) },
      { path: '/create', element: auth(<CreatePage />) },
      { path: '/lists', element: auth(<ListsPage />) },
      { path: '/lists/:listId', element: auth(<ListPage />) },
      { path: '/spots/:spotId', element: auth(<SpotPage />) },
      { path: '/posts/new', element: auth(<SpotPostPage />) },
      { path: '/posts/:postId/edit', element: auth(<SpotPostPage />) },
      // （v11 第3段階）S-19 は一般だけ、S-20 はお店だけ（6.2）
      { path: '/official/apply', element: authRole('user', <ApplyPage />) },
      { path: '/official', element: authRole('official', <ShopPage />) },
      { path: '/rewards/:rewardId', element: auth(<RewardPage />) },
      { path: '*', element: auth(<NotFoundPage />) },
    ],
  },
]);

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
