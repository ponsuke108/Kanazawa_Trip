/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
  readonly VITE_USE_MOCK: string | undefined;
  readonly VITE_PLACE_SEARCH_ENABLED: string | undefined;
  readonly VITE_SHOW_DEV_PAGES: string | undefined; // 確認用の仮の画面（Preview だけ。I-30 で消す）
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
