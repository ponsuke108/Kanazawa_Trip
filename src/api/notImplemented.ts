import { ApiError } from '@/api/errors';

// 本物の API は I-19 で実装する。それまでは「未実装」のエラーを投げる
export function notImplemented(name: string): never {
  throw new ApiError(
    'UNKNOWN',
    `${name} は未実装です（I-19）。VITE_USE_MOCK=true で動かしてください`,
  );
}
