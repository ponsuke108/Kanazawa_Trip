// Supabase への接続（要件定義書 8.2、8.3）。画面からは直接使わず、src/api/ の関数を通す（10.1）
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

// モックで動かすときは呼ばれないので、使うときに初めて作る
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が設定されていません。.env.example をコピーして .env.local を作ってください。',
    );
  }
  // ログイン状態はブラウザに保持され、閉じても続く（BR-14）
  client = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export const PLAN_IMAGES_BUCKET = 'plan-images';
