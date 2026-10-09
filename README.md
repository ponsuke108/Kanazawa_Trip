# 旅ノート金沢（Kanazawa_Trip）

金沢の観光プランをブロックで組み立てて共有する、スマホ向けWebアプリ（MVP）。

- 仕様：[`docs/機能要件_画面遷移_MVP.md`](docs/機能要件_画面遷移_MVP.md)
- 設計：[`docs/技術選定_API設計_v3.md`](docs/技術選定_API設計_v3.md)
- AI（Claude）向けのルール：[`CLAUDE.md`](CLAUDE.md)

## 自分のパソコンで動かす

Node.js 22 以上が必要です。

```bash
git clone https://github.com/ponsuke108/Kanazawa_Trip.git
cd Kanazawa_Trip
npm install
cp .env.example .env.local   # 中身に Supabase の URL と公開用キーを書く
npm run dev
```

`.env.local` はコミットしないでください（`.gitignore` 済み）。

## 作業の流れ

1. `git switch main && git pull` で最新にする
2. `git switch -c 担当/内容` でブランチを作る（例：`a/search-page`）
3. 作業してコミットし、`git push -u origin ブランチ名`
4. GitHub でプルリクエストを作る。自動チェック（CI）が通り、1人が承認したら main に取り込む
5. main に取り込まれると Vercel が自動で本番に公開する

プルリクエストを出す前に、手元でも次が通ることを確認してください。

```bash
npm run typecheck && npm run lint && npm run format:check && npm run build
```
