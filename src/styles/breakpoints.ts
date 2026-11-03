// 画面の幅の区切り（要件定義書 7.8）。幅の区切りはこのファイルだけで決める。
//
// - スマホ：767px まで（基準は375px）。CSS は今のまま、@media を付けずに書く
// - タブレット：768〜1023px。CSS では @media (min-width: 768px) { ... }
// - PC：1024px 以上。CSS では @media (min-width: 1024px) { ... }
//
// CSS の変数は @media の中で使えないため、各画面の CSS Modules では上の2つの書き方を
// そのまま使う（7.1 の「数値を直接書かない」の例外はこの2つだけ）。
// ほかの数値の @media が増えていないことは breakpoints.test.ts で確かめる。
export const Breakpoints = {
  tablet: 768,
  pc: 1024,
} as const;

// PC の左の縦のメニューの幅（7.8）。トーストや下部の固定ボタンをずらすときもこの幅を使う
export const SideMenuWidth = 220;

// 画面の幅に合わせた、内容の最大幅（7.8）
export const ContentMaxWidth = {
  phone: 480,
  tablet: 720,
  pc: 1200,
  form: 640, // PC の入力の画面（S-08、S-09、S-12 など）
} as const;
