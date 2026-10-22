// Supabase の呼び出しの共通処理：失敗したら ApiError を投げる（要件定義書 10.1、10.2）
import { ApiError, toApiError } from '@/api/errors';
import { getSupabase, PLAN_IMAGES_BUCKET } from '@/lib/supabase';

type Response = { error: unknown; status?: number };

// 失敗していれば ApiError を投げ、レスポンスをそのまま返す
export async function call<R extends Response>(request: PromiseLike<R>): Promise<R> {
  let res: R;
  try {
    res = await request;
  } catch (e) {
    throw toApiError(e);
  }
  if (res.error) {
    const err = res.error as Record<string, unknown>;
    throw toApiError({ ...err, status: err.status ?? res.status });
  }
  return res;
}

type WithData = Response & { data: unknown };

// 一覧を返す問い合わせ
export async function rows<R extends WithData>(
  request: PromiseLike<R>,
): Promise<NonNullable<R['data']>> {
  const data = (await call(request)).data;
  return (data ?? []) as NonNullable<R['data']>;
}

// 1件か null を返す問い合わせ（maybeSingle）
export async function maybeOne<R extends WithData>(
  request: PromiseLike<R>,
): Promise<NonNullable<R['data']> | null> {
  const data = (await call(request)).data;
  return (data ?? null) as NonNullable<R['data']> | null;
}

// 値を必ず返す問い合わせ（RPC など）
export async function one<R extends WithData>(
  request: PromiseLike<R>,
): Promise<NonNullable<R['data']>> {
  const data = (await call(request)).data;
  if (data === null || data === undefined) throw new ApiError('UNKNOWN', '結果が空です');
  return data as NonNullable<R['data']>;
}

// ログイン中の利用者ID。ログインしていなければ UNAUTHORIZED
export async function currentUserId(): Promise<string> {
  const { data } = await call(getSupabase().auth.getSession());
  const id = data.session?.user.id;
  if (!id) throw new ApiError('UNAUTHORIZED');
  return id;
}

// 写真のパスを公開URLにする（10.1）
export function imageUrlOf(path: string): string {
  return getSupabase().storage.from(PLAN_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

// uuid の形でないID（存在しないURL）は問い合わせずに「見つからない」とする
export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
