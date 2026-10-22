import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/useToast';
import { Messages } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { UNAUTHORIZED_EVENT } from '@/lib/queryClient';

// すべての画面の外側。スクロール位置の扱い（11.5）と、ログイン切れの処理（11.3）
export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();

  useEffect(() => {
    // BR-14：api が UNAUTHORIZED を返したら、トーストを出して S-12 へ移る
    const onUnauthorized = () => {
      if (location.pathname === '/login') return;
      toast.show({ type: 'error', message: Messages.sessionExpired });
      setUser(null);
      queryClient.clear();
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?redirect=${redirect}`, { replace: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [location, navigate, toast, queryClient, setUser]);

  return (
    <>
      {/* 画面が変わったら一番上へ。ブラウザの戻るでは元の位置に戻す */}
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
