// エラーの決まり（要件定義書 10.2）
import { ValidationMessages } from '@/constants/messages';
import type { ValidationCode, ValidationIssue } from '@/types/models';

export type ErrorCode =
  | 'NETWORK' // 通信できない
  | 'UNAUTHORIZED' // ログインしていない、ログインが切れた
  | 'FORBIDDEN' // 権限がない（RLSで拒否）
  | 'NOT_FOUND' // 対象がない
  | 'VALIDATION' // 入力の確認で失敗（issues に詳細）
  | 'AUTH_INVALID_CREDENTIALS' // メールアドレスかパスワードが違う
  | 'AUTH_EMAIL_TAKEN' // 登録済みのメールアドレス
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ErrorCode;
  issues: ValidationIssue[]; // VALIDATION のときだけ中身がある

  constructor(code: ErrorCode, message?: string, issues: ValidationIssue[] = []) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.issues = issues;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const VALIDATION_CODES = Object.keys(ValidationMessages) as ValidationCode[];

export function isValidationCode(s: string): s is ValidationCode {
  return (VALIDATION_CODES as string[]).includes(s);
}

export function toValidationIssue(code: ValidationCode): ValidationIssue {
  const { message, step } = ValidationMessages[code];
  return { code, message, step };
}

type ErrorLike = {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

function asErrorLike(e: unknown): ErrorLike {
  return typeof e === 'object' && e !== null ? (e as ErrorLike) : {};
}

// Supabase などの元のエラーを ApiError に変換する（10.2 の表）
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const err = asErrorLike(e);
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message : '';
  const status = typeof err.status === 'number' ? err.status : 0;

  // 通信できない（fetch の失敗、オフライン）
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    (e instanceof TypeError && /fetch|network|load failed/i.test(message)) ||
    err.name === 'AuthRetryableFetchError'
  ) {
    return new ApiError('NETWORK', message);
  }

  // Supabase Auth のエラー（code で判定する）
  if (code === 'invalid_credentials') return new ApiError('AUTH_INVALID_CREDENTIALS', message);
  if (code === 'user_already_exists' || code === 'email_exists') {
    return new ApiError('AUTH_EMAIL_TAKEN', message);
  }

  // RPC の例外（errcode P0001）は、メッセージに検証コードやエラーコードが入っている
  if (code === 'P0001') {
    const key = message.trim();
    if (isValidationCode(key)) return new ApiError('VALIDATION', key, [toValidationIssue(key)]);
    if (key === 'UNAUTHORIZED' || key === 'FORBIDDEN' || key === 'NOT_FOUND') {
      return new ApiError(key, key);
    }
  }

  // 認証エラー（401、JWT の期限切れ）
  if (
    status === 401 ||
    code === 'PGRST301' ||
    code === 'PGRST303' ||
    code === 'session_not_found' ||
    code === 'bad_jwt' ||
    /jwt expired/i.test(message)
  ) {
    return new ApiError('UNAUTHORIZED', message);
  }

  // RLS 違反
  if (code === '42501' || status === 403) return new ApiError('FORBIDDEN', message);

  return new ApiError('UNKNOWN', message);
}
