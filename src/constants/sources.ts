// スポットデータの出典（要件定義書 9.6、K21）。ホームの一番下に表示する。
// オープンデータを取り込んだら（P-03、P-04）、その名前と提供元をここに追加する
export const DataSources: Array<{ label: string; name: string; url?: string }> = [
  {
    label: 'スポットの位置',
    name: '金沢市観光公式サイト「金沢旅物語」（金沢市観光協会）',
    url: 'https://www.kanazawa-kankoukyoukai.or.jp/',
  },
  {
    // K60：数えた情報源は supabase/data/spot-sources.csv
    label: '定番スポットの基準',
    name: '金沢旅物語、ほっと石川旅ねっと、じゃらんnet、るるぶトラベル、楽天トラベル、JAL SKYWARD+ のおすすめの一覧（2026年11月に確認）',
  },
  {
    label: 'スポットの名称・位置（一部）',
    name: '金沢市オープンデータ「文化財一覧」「公園一覧」（金沢市、CC BY）を加工して作成',
    url: 'https://catalog-data.city.kanazawa.ishikawa.jp/',
  },
  {
    // （K65）作者とライセンスは、それぞれのスポットの画面に出す
    label: 'スポットの写真（一部）',
    name: 'Wikimedia Commons（金沢市のオープン画像データほか。縮小して使用。作者とライセンスは各スポットの画面に表示）',
    url: 'https://commons.wikimedia.org/wiki/Category:Open_Image_Data_of_Kanawaza_City',
  },
];
