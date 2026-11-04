import { useState, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { RedirectIfAuthed, RequireAuth } from '@/components/common/RequireAuth';
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
import { DevMapPage } from '@/pages/DevMap/DevMapPage';
import { SpotPage } from '@/pages/S05Spot/SpotPage';
import { SpotPostPage } from '@/pages/S17SpotPost/SpotPostPage';

const SHOW_DEV_PAGES = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_PAGES === 'true';

const auth = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

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
      { path: '/', element: auth(<HomePage />) },
      { path: '/search', element: auth(<SearchPage />) },
      { path: '/search/results', element: auth(<SearchResultsPage />) },
      { path: '/plans/new', element: auth(<PlanEditorPage />) },
      { path: '/plans/:planId', element: auth(<PlanDetailPage />) },
      { path: '/plans/:planId/edit', element: auth(<PlanEditorPage />) },
      { path: '/ranking', element: auth(<RankingPage />) },
      { path: '/mypage', element: auth(<MyPage />) },
      // （v11）
      { path: '/spots/:spotId', element: auth(<SpotPage />) },
      { path: '/posts/new', element: auth(<SpotPostPage />) },
      { path: '/posts/:postId/edit', element: auth(<SpotPostPage />) },
      // I-25・I-28 の確認用。開発のときと、Vercel の Preview で VITE_SHOW_DEV_PAGES=true のときだけ。
      // 本番（Production）にはこの変数を入れない。I-30（S-13 地図）で消す
      ...(SHOW_DEV_PAGES ? [{ path: '/dev/map', element: auth(<DevMapPage />) }] : []),
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
