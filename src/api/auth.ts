import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { mockApi } from '@/api/mock/mockApi';
import { call, maybeOne } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { AuthUser } from '@/types/models';

// 表示名は profiles から読む（登録時にトリガーで作られる、9.2）
async function toAuthUser(id: string, email: string | undefined): Promise<AuthUser> {
  const profile = await maybeOne(
    getSupabase().from('profiles').select('display_name').eq('id', id).maybeSingle(),
  );
  return { id, email: email ?? '', displayName: profile?.display_name ?? '' };
}

// BR-14：登録するとすぐにログイン状態になる（メール確認はオフ）
export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  if (USE_MOCK) return mockApi.signUp(input);
  const {
    data: { user, session },
  } = await call(
    getSupabase().auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    }),
  );
  // メール確認がオンのまま登録済みのメールアドレスで登録すると、identities が空で返る
  if (!user || (user.identities && user.identities.length === 0))
    throw new ApiError('AUTH_EMAIL_TAKEN');
  if (!session)
    throw new ApiError('UNKNOWN', 'Supabase のメール確認（Confirm email）をオフにしてください');
  return toAuthUser(user.id, user.email);
}

export async function signIn(input: { email: string; password: string }): Promise<AuthUser> {
  if (USE_MOCK) return mockApi.signIn(input);
  const { data } = await call(getSupabase().auth.signInWithPassword(input));
  if (!data.user) throw new ApiError('AUTH_INVALID_CREDENTIALS');
  return toAuthUser(data.user.id, data.user.email);
}

export async function signOut(): Promise<void> {
  if (USE_MOCK) return mockApi.signOut();
  await call(getSupabase().auth.signOut());
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (USE_MOCK) return mockApi.getCurrentUser();
  const { data } = await call(getSupabase().auth.getSession());
  const user = data.session?.user;
  if (!user) return null;
  return toAuthUser(user.id, user.email);
}

// ログアウトやログインの期限切れを画面に知らせる。ログインは画面側で状態を入れる
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (USE_MOCK) return () => {};
  const { data } = getSupabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') callback(null);
  });
  return () => data.subscription.unsubscribe();
}
