# このリポジトリのルール

## 最初に読むもの
- docs/requirements.md（要件定義書）。画面ID（S-）、機能ID（F-）、業務ルール（BR-）で範囲を確認する
- 初期実装（docs/handoff.md に基づく作業）では、ブランチ名を init/ で始め、全範囲を変更してよい
- 初期実装の後は、作業者から担当（担当1〜4）とブランチの接頭辞（base/ browse/ editor/ data/）を聞き、要件定義書 12.2 の範囲を確認する

## 触ってよい範囲
- 自分の担当の範囲（要件定義書 12.2）のファイルだけを変更する。範囲外のファイルは変更せず、必要なら変更案を作業者に伝える
- 契約にあたるファイル（models.ts、api の関数の形、共通部品の引数、variables.css、package.json など）は、contract/ ブランチ以外では変更しない
- 頼まれていない整形、名前の変更、リファクタリングをしない
- 新しいライブラリを追加しない。使う技術は要件定義書 8.1 のとおり

## 書き方
- TypeScript strict。any を使わない。export default を使わない。import は @/ から
- データの取得は src/api の関数と src/api/queryKeys.ts のキーで TanStack Query（v5）を使う
- 画面の切り替えは react-router の createBrowserRouter。loader/action と framework モードは使わない
- @supabase/supabase-js を画面のコードから直接使わない
- スタイルは CSS Modules。色・余白・文字サイズは src/styles/variables.css の変数だけ
- 業務ルールに関わる処理には BR 番号のコメントを付ける

## UIのルール
- 絵文字は画面・データ・メッセージのどこにも使わない
- アイコンは lucide-react だけ。対応は src/lib/icons.ts を使う
- カードの左側だけに色線を引くデザイン（border-left による強調）は使わない。上側だけの色線や box-shadow での代用もしない
- カードは四辺同じ1pxの枠線と角丸12px。種類の区別はアイコンのバッジと文字で行う
- ボタン、カード、タグなどは src/components/common の部品を使う
- 読み込み中、0件、エラーの3つの状態を必ず作る

## コンフリクトを直すとき
- 契約のファイルと他の担当のファイルは main の内容を採用する
- 直した後、git diff main で、範囲外のファイルに差分が残っていないことを確認する

## 終わる前に
- npm run lint、npm run typecheck、npm test、npm run build、node scripts/check-scope.mjs がすべて通ることを確認する
