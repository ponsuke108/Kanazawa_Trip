# 旅ノート金沢（Kanazawa_Trip）

金沢の観光プランを、スポット・移動手段・コメントのブロックで組み立てて共有する、スマホ向けのWebアプリ（MVP）。

- 要件定義書：[`docs/requirements.md`](docs/requirements.md)（要件の唯一の正）
- 実装引き継ぎ：[`docs/handoff.md`](docs/handoff.md)
- AI 向けのルール：[`CLAUDE.md`](CLAUDE.md)

## 起動方法

Node.js（`.nvmrc` のバージョン）と npm が必要です。

```bash
git clone https://github.com/ponsuke108/Kanazawa_Trip.git
cd Kanazawa_Trip
npm install
cp .env.example .env.local   # Windows の PowerShell では Copy-Item .env.example .env.local
npm run dev
```

表示された `http://localhost:5173` をブラウザで開きます。

## 環境変数

`.env.local` に書きます（コミットしない）。Vercel では管理画面の Settings → Environment Variables に登録します。

| 変数                     | 内容                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase の Project URL                                       |
| `VITE_SUPABASE_ANON_KEY` | Supabase の公開用キー（publishable key / anon key）           |
| `VITE_USE_MOCK`          | `true` ならモックのデータで動く。`false` なら Supabase を使う |

管理者用のキー（secret key / service_role）はどこにも書かないでください。

## モックと本物の切り替え

- `VITE_USE_MOCK=true`：Supabase に接続せず、`src/api/mock/` のデータ（要件定義書 9.7）で動きます。どのメールアドレスとパスワードでも「テスト太郎」としてログインします。保存した内容は再読み込みすると消えます。
- `VITE_USE_MOCK=false`：Supabase の本物のデータで動きます。`VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` が必要です。

値を変えたら、開発サーバーを再起動してください（Vercel では再デプロイ）。

## コマンド

| コマンド               | 内容                                       |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | 開発サーバー                               |
| `npm run build`        | 本番ビルド                                 |
| `npm run lint`         | ESLint                                     |
| `npm run typecheck`    | 型チェック                                 |
| `npm test`             | テスト（Vitest）                           |
| `npm run format`       | Prettier で整形                            |
| `npm run import-spots` | スポットCSVからSQLを作る（要件定義書 9.6） |
