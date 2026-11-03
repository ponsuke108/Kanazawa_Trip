import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'src/types/database.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // 要件定義書 12.1：@supabase/supabase-js は lib/supabase.ts と api/ からだけ使う
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Supabase は src/lib/supabase.ts と src/api/ からだけ使ってください（要件定義書 12.1）。',
            },
          ],
          // （v11）maplibre-gl は src/components/map/ の中だけで使う（要件定義書 8.1、11.1）。
          // MapView を直接読み込むと地図を使わない画面にも maplibre-gl が入るので、画面からは LazyMapView を使う
          patterns: [
            {
              group: ['maplibre-gl', 'maplibre-gl/*'],
              message:
                'maplibre-gl は src/components/map/ の中だけで使ってください（要件定義書 8.1）。',
            },
            {
              group: ['@/components/map/MapView'],
              message:
                '地図は @/components/map/LazyMapView を使ってください（BR-24：地図を使う画面だけで読み込む）。',
            },
          ],
        },
      ],
    },
  },
  {
    // （v11）地図の部品の中だけは maplibre-gl を使える。Supabase の制限はそのまま
    files: ['src/components/map/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Supabase は src/lib/supabase.ts と src/api/ からだけ使ってください（要件定義書 12.1）。',
            },
          ],
        },
      ],
    },
  },
  {
    // 要件定義書 12.1：export default を使わない（設定ファイルは除く）
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'export default は使わず、名前付きで書き出してください（要件定義書 12.1）。',
        },
      ],
    },
  },
  {
    files: ['src/lib/supabase.ts', 'src/api/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
]);
