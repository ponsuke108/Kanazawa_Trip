# このリポジトリのルール

## 最初に読むもの
- docs/requirements.md（要件定義書。要件の唯一の正）と docs/handoff.md（進め方）
- 画面ID（S-）、機能ID（F-）、業務ルール（BR-）、Issue（I-）で範囲を確認する

## 変更してよい範囲
- docs/ は変更しない。要件と違う動きにしたいときや、要件の誤りに気づいたときは、作業者に伝える
- 新しいライブラリを追加しない。使う技術は要件定義書 8.1 のとおり
- models.ts、api の関数の形、共通部品の引数、variables.css を要件定義書と違う形にしない
- 頼まれていない整形、名前の変更、リファクタリングをしない

## 書き方
- TypeScript strict。any を使わない。export default を使わない。import は @/ から
- データの取得は src/api の関数と src/api/queryKeys.ts のキーで TanStack Query（v5）を使う
- 画面の切り替えは react-router の createBrowserRouter。loader/action と framework モードは使わない
- @supabase/supabase-js を画面のコードから直接使わない
- スタイルは CSS Modules。色・余白・文字サイズは src/styles/variables.css の変数だけ
- 業務ルールに関わる処理には BR 番号のコメントを付ける

## UIのルール
- 絵文字は画面・データ・メッセージ・コメントのどこにも使わない
- アイコンは lucide-react だけ。対応は src/lib/icons.ts を使う
- 生成AIで作った画像をアプリに載せない
- カードの左側だけに色線を引くデザイン（border-left による強調）は使わない。上側だけの色線や box-shadow での代用もしない
- カードは四辺同じ1pxの枠線と角丸12px。種類の区別はアイコンのバッジと文字で行う
- ボタン、カード、タグなどは src/components/common の部品を使う
- 読み込み中、0件、エラーの3つの状態を必ず作る

## コンフリクトを直すとき
- docs/ と package-lock.json は main の内容を採用する（package-lock.json は npm install で作り直す）

## 終わる前に
- npm run lint、npm run typecheck、npm test、npm run build がすべて通ることを確認する
- プルリクエストの本文に、変更の要約と確認してほしい点を書く
- プルリクエストを自分で取り込まない（取り込みは確認した別の人が行う）
