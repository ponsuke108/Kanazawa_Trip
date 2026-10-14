// BR-05 の入力の制限（S-12）
import { AuthMessages } from '@/constants/messages';

export type AuthFields = { displayName: string; email: string; password: string };
export type AuthErrors = Partial<Record<keyof AuthFields, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(fields: AuthFields, mode: 'login' | 'signup'): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'signup') {
    const name = fields.displayName.trim();
    if (name.length === 0) errors.displayName = AuthMessages.displayNameRequired;
    else if ([...name].length > 20) errors.displayName = AuthMessages.displayNameTooLong;
  }
  if (!EMAIL.test(fields.email.trim())) errors.email = AuthMessages.emailInvalid;
  // パスワードは前後の空白を取り除かない
  if (fields.password.length < 8) errors.password = AuthMessages.passwordTooShort;
  else if (fields.password.length > 72) errors.password = AuthMessages.passwordTooLong;
  return errors;
}
