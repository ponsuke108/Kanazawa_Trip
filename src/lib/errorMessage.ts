// ErrorCode ごとに 6.5 の文言を返す（要件定義書 10.2）
import { isApiError } from '@/api/errors';
import { AuthMessages, Messages } from '@/constants/messages';

export function errorMessage(e: unknown): string {
  if (!isApiError(e)) return Messages.unknown;
  switch (e.code) {
    case 'NETWORK':
      return Messages.network;
    case 'UNAUTHORIZED':
      return Messages.sessionExpired;
    case 'FORBIDDEN':
      return Messages.forbidden;
    case 'AUTH_INVALID_CREDENTIALS':
      return AuthMessages.invalidCredentials;
    case 'AUTH_EMAIL_TAKEN':
      return AuthMessages.emailTaken;
    case 'VALIDATION':
      return e.issues[0]?.message ?? Messages.unknown;
    default:
      return Messages.unknown;
  }
}
