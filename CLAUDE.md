# 旅ノート金沢（Kanazawa_Trip）

金沢の観光プランを、スポット・移動手段・コメントのブロックで組み立てて共有するスマホ向けWebアプリ（MVP）。
チーム CCCA305A-1 の3人（A・B・C）で開発している。

## 最初に読むもの

- `docs/機能要件_画面遷移_MVP.md`：機能ID（F-xx）と画面ID（S-xx）
- `docs/技術選定_API設計_v3.md`：DB、RLS、API関数、型、URL、UIデザインルール

仕様に迷ったら推測で作らず、設計書の該当箇所を確認する。設計書にないことは作業者に確認する。

## コマンド

- `npm run dev`：開発サーバー（`.env.local` が必要。`.env.example` をコピーして作る）
- `npm run typecheck`：型チェック
- `npm run lint`：ESLint
- `npm run format`：Prettier で整形
- `npm run build`：本番ビルド

プルリクエストを出す前に `npm run typecheck && npm run lint && npm run format:check && npm run build` が通ること。

## 技術

TypeScript（strict）、React + Vite、React Router、CSS Modules、dnd-kit、lucide-react、Supabase（Database・Auth・Storage）、Vercel。
独自のサーバーは作らない。Next.js の書き方（サーバーコンポーネント、`'use server'` など）は使わない。

## コードのルール

- 画面のコードから Supabase を直接呼ばない。必ず `src/api/` の関数を通す（ESLintで禁止している）
- 画面と `src/api/` の間のデータは `src/types/models.ts` の型を使う。型は勝手に変えない（変更はCに依頼）
- DBの列名（snake_case）と画面の名前（camelCase）の変換は `src/api/` の中で行う
- 管理者用キー（service_role / secret key）はどこにも書かない。使ってよいのは公開用キーだけ
- `.env.local` はコミットしない
- 編集画面のブロック操作は `useReducer` で1か所にまとめて管理する
- 画面の文字は日本語。利用者に見せるメッセージは短く具体的に

## UIのルール

- 絵文字は画面・データ・メッセージ・コメントのどこにも使わない
- アイコンは lucide-react だけを使う。意味との対応は `src/lib/icons.ts` を使い、新しく対応を増やすときは icons.ts に追加する
- カードの左側だけに色線を引くデザイン（border-left による強調）は使わない。上側だけの色線や box-shadow での代用もしない
- カードは四辺同じ1pxの枠線と角丸12px。種類の区別はアイコンのバッジと文字で行う
- 色・余白・文字サイズは `src/styles/variables.css` の変数だけを使う。色コードを直接書かない
- `--color-accent`（金）は白い背景の上の小さい文字に使わない（コントラスト不足）
- スマホ前提：幅375pxを基準に、360〜430pxで崩れないこと。押せる場所は44px以上（`--tap-min`）
- アイコンの大きさは本文中20px、下部タブ24px。色は `currentColor`
- アイコンだけのボタンには `aria-label`、文字と並ぶ飾りのアイコンには `aria-hidden="true"`

## フォルダと担当

| 場所                                                                                | 持ち主                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `src/pages/S02〜S04`                                                                | A（検索・閲覧）                           |
| `src/pages/S06・S08`、`src/components/blocks/`、`src/lib/blocks.ts`                 | B（作成・投稿）                           |
| `src/pages/S10〜S12`、`src/api/`、`src/types/`、`supabase/`                         | C（ランキング・マイページ・ログイン・DB） |
| `src/App.tsx`、`src/lib/`（blocks.ts以外）、`src/components/common/`、`src/styles/` | 共通（変更は相談してから）                |

- 自分の担当外のファイルを変える必要が出たら、そのファイルの持ち主に相談する
- `src/App.tsx` には全画面のルートが登録済み。各担当は `src/pages/` の中身だけを書き換える
- ライブラリを追加するときはチームに一言伝える

## Gitのルール

- main に直接 push しない。ブランチを作ってプルリクエストで取り込む
- ブランチ名は `担当/内容`（例：`b/block-editor`、`c/save-plan-rpc`）
- プルリクエストは1画面か1機能ずつ、小さく出す
- DBの構造の変更は C だけが行う。`supabase/migrations/` のファイルとして残し、一度適用したファイルは書き換えない
