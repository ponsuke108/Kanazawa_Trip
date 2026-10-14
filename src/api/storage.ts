import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { mockApi } from '@/api/mock/mockApi';
import { call, currentUserId, imageUrlOf } from '@/api/supabaseCall';
import { getSupabase, PLAN_IMAGES_BUCKET } from '@/lib/supabase';

const MAX_SIDE = 1280; // BR-13：長辺1280px以下
const QUALITY = 0.8; // BR-13：JPEG の品質

// 画像を長辺1280px以下に縮め、JPEG にする（BR-13）。読み込めない画像は VALIDATION
export async function resizeToJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ApiError('VALIDATION', 'IMAGE_UNREADABLE');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ApiError('VALIDATION', 'IMAGE_UNREADABLE');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new ApiError('VALIDATION', 'IMAGE_UNREADABLE');
  return blob;
}

// BR-13：縮小・変換して plan-images/{ユーザーID}/{ランダムなID}.jpg へアップロードする
export async function uploadPlanImage(file: File): Promise<{ path: string; url: string }> {
  if (USE_MOCK) return mockApi.uploadPlanImage(file);
  const userId = await currentUserId();
  const blob = await resizeToJpeg(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  await call(
    getSupabase()
      .storage.from(PLAN_IMAGES_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false }),
  );
  return { path, url: imageUrlOf(path) };
}
