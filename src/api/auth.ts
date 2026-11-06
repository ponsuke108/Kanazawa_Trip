import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { mockApi } from '@/api/mock/mockApi';
import { call, maybeOne } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { AuthUser, UserRole } from '@/types/models';

// このタブが知っている利用者の id。undefined はまだ読んでいないとき。
// Supabase のログインは同じブラウザの全タブで共有されるので、別のタブで別の人がログインしたことを見分けるのに使う
let knownUserId: string | null | undefined;
// このタブの signIn、signUp の途中か。その間の SIGNED_IN は、画面側（S-12）が結果を受け取って反映する
let ownSignIns = 0;

async function asOwnSignIn<T>(run: () => Promise<T>): Promise<T> {
  ownSignIns += 1;
  try {
    return await run();
  } finally {
    ownSignIns -= 1;
  }
}

// 表示名は profiles から読む（登録時にトリガーで作られる、9.2）
async function toAuthUser(id: string, email: string | undefined): Promise<AuthUser> {
  const profile = await maybeOne(
    getSupabase().from('profiles').select('display_name, role').eq('id', id).maybeSingle(),
  );
  // 利用者の種類（BR-25）。画面の出し分けに使う。守るのはデータベースの RLS と RPC
  return {
    id,
    email: email ?? '',
    displayName: profile?.display_name ?? '',
    role: toRole(profile?.role),
  };
}

function toRole(value: string | undefined): UserRole {
  return value === 'official' || value === 'admin' ? value : 'user';
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
  } = await asOwnSignIn(() =>
    call(
      getSupabase().auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { display_name: input.displayName } },
      }),
    ),
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
  const { data } = await asOwnSignIn(() => call(getSupabase().auth.signInWithPassword(input)));
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
  knownUserId = user?.id ?? null;
  if (!user) return null;
  return toAuthUser(user.id, user.email);
}

// ログアウトやログインの期限切れ、別のタブで別の人がログインしたことを画面に知らせる。
// このタブでのログインは画面側で状態を入れるので、知らせない
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (USE_MOCK) return () => {};
  let latest = 0; // 続けて入れ替わったときは、最後の結果だけを使う
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      latest += 1;
      knownUserId = null;
      callback(null);
      return;
    }
    if (event !== 'SIGNED_IN' || !session) return;
    const id = session.user.id;
    if (ownSignIns > 0) {
      knownUserId = id;
      return;
    }
    // タブに戻っただけでも SIGNED_IN が来るので、id が変わったときだけ読み直す。
    // 最初の読み込みの途中（undefined）なら、そちらが新しい利用者を読む
    if (knownUserId === undefined || knownUserId === id) return;
    knownUserId = id;
    latest += 1;
    const current = latest;
    // このコールバックの中で Supabase の呼び出しを待つと止まることがあるので、抜けてから読む
    setTimeout(() => {
      getCurrentUser()
        .then((user) => {
          if (current === latest) callback(user);
        })
        .catch(() => {
          if (current !== latest) return;
          // 誰の情報か分からないまま古い利用者を出し続けない。次の SIGNED_IN で読み直す
          knownUserId = null;
          callback(null);
        });
    }, 0);
  });
  return () => {
    latest += 1;
    data.subscription.unsubscribe();
  };
}
