// Supabase への接続（設計書 v3 2.1）
// 画面からは直接使わず、必ず src/api/ の関数を通す（5.1）。
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が設定されていません。.env.example をコピーして .env.local を作ってください。',
  );
}

// TODO(C): supabase gen types typescript で src/types/database.ts を作ったら
// createClient<Database>(...) にして型を付ける
export const supabase = createClient(url, anonKey);
