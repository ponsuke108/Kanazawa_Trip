import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: string, session: { user: { id: string } } | null) => void;
const fake = vi.hoisted(() => ({
  listeners: [] as Array<(event: string, session: { user: { id: string } } | null) => void>,
  sessionUserId: null as string | null,
  getSessionCalls: 0,
  profileError: false,
}));

function sessionOf(id: string | null) {
  return id ? { user: { id, email: `${id}@example.com` } } : null;
}

function fire(event: string, id: string | null) {
  fake.sessionUserId = event === 'SIGNED_OUT' ? null : id;
  for (const l of fake.listeners) (l as Listener)(event, sessionOf(id));
}

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => {
        fake.getSessionCalls += 1;
        return { data: { session: sessionOf(fake.sessionUserId) }, error: null };
      },
      signInWithPassword: async (input: { email: string }) => {
        const id = input.email.split('@')[0] ?? '';
        // 本物と同じく、結果を返す前に SIGNED_IN を知らせる
        fire('SIGNED_IN', id);
        return { data: sessionOf(id), error: null };
      },
      onAuthStateChange: (listener: Listener) => {
        fake.listeners.push(listener);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                fake.listeners = fake.listeners.filter((l) => l !== listener);
              },
            },
          },
        };
      },
    },
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () =>
            fake.profileError
              ? { data: null, error: { message: 'failed' } }
              : {
                  data: { display_name: `${id}の名前`, role: id === 'admin' ? 'admin' : 'user' },
                  error: null,
                },
        }),
      }),
    }),
  }),
}));

async function setup(startUserId: string | null) {
  vi.stubEnv('VITE_USE_MOCK', 'false');
  vi.resetModules();
  fake.listeners = [];
  fake.sessionUserId = startUserId;
  fake.getSessionCalls = 0;
  fake.profileError = false;
  const auth = await import('@/api/auth');
  await auth.getCurrentUser();
  const changes: Array<{ id: string; role: string; displayName: string } | null> = [];
  const unsubscribe = auth.onAuthChange((u) => changes.push(u));
  return { auth, changes, unsubscribe };
}

// setTimeout(0) のあとの読み直しが終わるまで進める
const settle = () => vi.advanceTimersByTimeAsync(1);

describe('onAuthChange（別のタブで別の人がログインしたとき）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('id が変わったら、利用者の情報を読み直して知らせる', async () => {
    const { changes } = await setup('taro');
    fire('SIGNED_IN', 'admin');
    await settle();
    expect(changes).toEqual([
      expect.objectContaining({ id: 'admin', role: 'admin', displayName: 'adminの名前' }),
    ]);
  });

  it('Supabase のコールバックの中では読み直さない（止まることがあるため）', async () => {
    await setup('taro');
    const before = fake.getSessionCalls;
    fire('SIGNED_IN', 'admin');
    expect(fake.getSessionCalls).toBe(before);
    await settle();
    expect(fake.getSessionCalls).toBe(before + 1);
  });

  it('タブに戻っただけの同じ人の SIGNED_IN や、トークンの更新では何もしない', async () => {
    const { changes } = await setup('taro');
    fire('SIGNED_IN', 'taro');
    fire('TOKEN_REFRESHED', 'taro');
    await settle();
    expect(changes).toEqual([]);
  });

  it('このタブのログインは知らせない（S-12 が結果を受け取って反映する）。そのあと戻っても同じ', async () => {
    const { auth, changes } = await setup(null);
    await auth.signIn({ email: 'taro@example.com', password: 'password1' });
    fire('SIGNED_IN', 'taro');
    await settle();
    expect(changes).toEqual([]);
  });

  it('ログアウトしたタブでも、別のタブのログインを知らせる', async () => {
    const { changes } = await setup('taro');
    fire('SIGNED_OUT', null);
    fire('SIGNED_IN', 'admin');
    await settle();
    expect(changes).toEqual([null, expect.objectContaining({ id: 'admin' })]);
  });

  it('続けて入れ替わったら、最後の人だけを知らせる', async () => {
    const { changes } = await setup('taro');
    fire('SIGNED_IN', 'admin');
    fire('SIGNED_IN', 'hanako');
    await settle();
    expect(changes).toEqual([expect.objectContaining({ id: 'hanako' })]);
  });

  it('読み直しに失敗したら、古い人のままにせず null を知らせ、次の SIGNED_IN で読み直す', async () => {
    const { changes } = await setup('taro');
    fake.profileError = true;
    fire('SIGNED_IN', 'admin');
    await settle();
    expect(changes).toEqual([null]);
    fake.profileError = false;
    fire('SIGNED_IN', 'admin');
    await settle();
    expect(changes).toEqual([null, expect.objectContaining({ id: 'admin' })]);
  });

  it('やめたあとは知らせない', async () => {
    const { changes, unsubscribe } = await setup('taro');
    fire('SIGNED_IN', 'admin');
    unsubscribe();
    await settle();
    expect(changes).toEqual([]);
  });
});
