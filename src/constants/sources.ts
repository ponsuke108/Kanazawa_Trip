// スポットデータの出典（要件定義書 9.6、K21）。ホームの一番下に表示する。
// オープンデータを取り込んだら（P-03、P-04）、その名前と提供元をここに追加する
export const DataSources: Array<{ label: string; name: string; url?: string }> = [
  {
    label: 'スポットの位置・定番スポットの基準',
    name: '金沢市観光公式サイト「金沢旅物語」（金沢市観光協会）',
    url: 'https://www.kanazawa-kankoukyoukai.or.jp/',
  },
];
