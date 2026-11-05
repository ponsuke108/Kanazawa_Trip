// 画面をまたいで使う文言（要件定義書 6.5、6.4、10.6）。各画面で書き換えない
import type { TransportMode, ValidationCode } from '@/types/models';

// 6.5 共通のメッセージ
export const Messages = {
  network: '通信に失敗しました。電波の良いところでもう一度お試しください',
  unknown: 'エラーが発生しました。時間をおいてもう一度お試しください',
  sessionExpired: 'ログインの有効期限が切れました。もう一度ログインしてください',
  forbidden: 'この操作はできません',
  retry: 'もう一度読み込む',
  unsavedConfirm: '編集内容が保存されていません。移動しますか？',
  restoreConfirm: '前回の編集内容を復元しますか？',
  unpublishConfirm: 'このプランを非公開にします。検索やランキングに表示されなくなります。',
  deleteConfirm: 'このプランを削除します。元に戻せません。',
  // （v11）
  listDeleteConfirm: 'このリストを削除します。このリストから作ったプランは残ります。',
  postDeleteConfirm: 'この投稿を削除します。元に戻せません。',
  alreadyInList: 'リストに入っています',
  placeSearchDisabled: '現在、場所の検索は利用できません',
  placeSearchFailed: '場所の検索に失敗しました。時間をおいてもう一度お試しください',
  outOfArea: '金沢市の中の場所だけ登録できます',
  notViewable: 'このページは見られません',
  photoNotice:
    '人の顔がはっきり写った写真や、他の人が撮った写真は載せないでください。生成AIで作った画像は載せないでください',
  straightDistance: '直線距離です。実際の道のりは「経路を見る」で確かめてください',
  straightDistanceDetail:
    '直線距離です。実際の道のりや時間は、各区間の「経路を見る」で確かめてください', // 6.4 S-06 の i ボタン
} as const;

// （v11）S-18 全体のナビ（6.4、BR-23）
export const NaviMessages = {
  appNotice:
    'スマホではGoogleマップのアプリで開いてください（ブラウザでは経由地が3か所までしか出ません）',
  busNotice: 'バスは区間ごとに開いてください',
  needTwoSpots: 'スポットが2つ以上のプランで使えます',
  openWhole: '全体をGoogleマップで開く',
  openRange: (from: number, to: number) => `${from}〜${to}番目を開く`,
} as const;

// （v11）プランの共有（6.4 S-04・S-24、BR-30）
export const ShareMessages = {
  sheetTitle: 'プランを共有',
  lead: '共有リンクを知っている人は、ログインしなくてもこのプランを見られます（見るだけ）。下書きのプランも共有できます',
  stopLead:
    '「共有を止める」と、これまでのリンクは見られなくなります。もう一度作ると別のリンクになります',
  shareTitle: (title: string) => `旅ノート金沢のプラン「${title}」`,
  notShared: 'このプランは共有されていません',
  guestLead: '旅ノート金沢に登録すると、このプランをコピーして自分のプランを作れます',
} as const;

// （v11）S-16 場所を探す（6.4）
export const PlaceSearchMessages = {
  placeholder: 'スポット名を入力',
  emptyInput: 'スポット名を入れてください（例：にし茶屋街、鈴木大拙館）',
  noSiteSpots: 'このサイトには見つかりませんでした',
  searchLead: '見つからないときは：',
  searchButton: 'OpenStreetMap で探す',
  searching: 'OpenStreetMap で探しています',
  noCandidates:
    '見つかりませんでした。名前を変えて探してください。見つからない場所は、チームに連絡してください',
  nearbyTitle: (name: string) => `近くに${name}があります。同じ場所ならこちらを選んでください`,
  chooseNearby: (name: string) => `${name}を選ぶ`,
  chooseCandidate: '別の場所なので、この候補を選ぶ',
  siteSpots: 'このサイトのスポット',
  candidates: 'OpenStreetMap の場所',
} as const;

// （v11）リストに入れたとき（6.5）
export function addedToListMessage(listName: string): string {
  return `リスト「${listName}」に入れました`;
}

// （v11）S-04 の「スポットをリストに保存」のあと（6.4 S-04）
export function savedToListMessage(listName: string): string {
  return `リスト「${listName}」に保存しました`;
}

// 6.4 のトースト
export const Toasts = {
  draftSaved: '下書きを保存しました',
  published: '公開しました',
  updated: '更新しました',
  unpublished: '非公開にしました',
  deleted: '削除しました',
  loggedIn: 'ログインしました',
  signedUp: '登録しました',
  posted: '投稿しました', // （v11）S-17
  removedFromList: '外しました', // （v11）S-15
  renamed: '名前を変えました', // （v11）S-15
  linkCopied: 'リンクをコピーしました', // （v11）S-04 の共有
  shareStopped: '共有を止めました', // （v11）S-04 の共有
} as const;

// 6.4 S-12 の失敗と入力の誤り（BR-05）
export const AuthMessages = {
  invalidCredentials: 'メールアドレスまたはパスワードが違います',
  emailTaken: 'このメールアドレスはすでに登録されています',
  passwordTooShort: 'パスワードは8文字以上で入力してください',
  passwordTooLong: 'パスワードは72文字以内で入力してください',
  emailInvalid: 'メールアドレスの形式で入力してください',
  displayNameRequired: '表示名を入力してください',
  displayNameTooLong: '表示名は20文字以内で入力してください',
  forgotPassword: 'パスワードを忘れた場合は、チームに連絡してください',
} as const;

// 6.4 のその他の文言
export const UiMessages = {
  notFound: 'ページが見つかりません',
  planNotFound: 'このプランは見つかりません',
  planNotEditable: 'このプランは編集できません',
  noPlans: 'まだプランがありません',
  noSearchResults: '条件に合うプランが見つかりませんでした',
  noRanking: 'まだランキングに入るプランがありません',
  noLikedPlans: 'いいねしたプランはまだありません',
  emptyBlocks: 'スポットを追加して旅の流れを作りましょう',
  blocksLimit: 'ブロックは30個までです',
  sameSpotAdjacent: '直前と同じスポットは続けて追加できません',
  imageUnreadable: 'この画像は読み込めません', // BR-13
  untitledPlan: '無題のプラン', // BR-12
  // （v11）S-05、S-17、S-11
  spotNotFound: 'このスポットは見つかりません',
  spotInactive: 'このスポットは使用中止です',
  cannotPostSpot: 'このスポットには投稿できません',
  postNotEditable: 'この投稿は編集できません',
  noSpotPosts: 'まだ投稿がありません。行ったら最初の投稿をしてみませんか',
  noMyPosts: 'まだ投稿がありません',
  postHidden: '管理者が非表示にしました',
  campaignJoined: 'キャンペーン参加',
  campaignActive: 'キャンペーン中', // （v11）K47：ピン・S-05・S-07・スポットブロック
  campaignHowTo: 'お店の近くからこのスポットに投稿すると受けられます', // （v11）S-05（BR-28）
  photoShownOnMap: '写真は地図のピンやスポット詳細に表示されます', // BR-21
  // （v11）リスト（BR-18、S-14、S-15）
  listNotFound: 'このリストは見つかりません',
  noListSpots: 'スポットがありません',
  noLists: '行きたい場所をリストに保存すると、ここからプランを作れます',
  listLimit: 'リストは20個まで作れます。使わないリストを削除してください',
  listSpotLimit: '1つのリストに入れられるスポットは30か所までです',
  listNameRule: '1〜30文字で入力してください',
  needTwoSpots: '1つでも作れますが、公開にはスポットが2つ必要です',
  inactiveSpot: '使用中止',
  homeLead: 'みんなの旅ノートから、金沢の旅を組み立てよう',
  minorRankingLead: '定番スポット以外を含むプランのランキングです',
} as const;

// 10.6 検証コードのメッセージと直すステップ
export const ValidationMessages: Record<
  ValidationCode,
  { message: string; step: 'blocks' | 'info' }
> = {
  TITLE_REQUIRED: { message: 'タイトルを入力してください', step: 'info' },
  TITLE_TOO_LONG: { message: 'タイトルは50文字以内で入力してください', step: 'info' },
  SPOTS_TOO_FEW: { message: 'スポットを2つ以上追加してください', step: 'blocks' },
  TAGS_REQUIRED: { message: 'タグを1つ以上選んでください', step: 'info' },
  BLOCKS_TOO_MANY: { message: 'ブロックは30個までです', step: 'blocks' },
  COMMENT_TOO_LONG: { message: 'コメントは500文字以内で入力してください', step: 'blocks' },
  SAME_SPOT_ADJACENT: { message: '同じスポットが続いています', step: 'blocks' },
  TRANSPORT_INVALID: { message: '移動手段の設定に誤りがあります', step: 'blocks' },
};

// 移動手段の表示名
export const TransportLabels: Record<TransportMode, string> = {
  walk: '徒歩',
  bus: 'バス',
  bicycle: '自転車',
  car: '車',
};

// （v11）地図（BR-24、6.4 S-13）
export const MapMessages = {
  loadError: '地図を読み込めませんでした',
  loading: '地図を読み込み中',
  attribution: '場所の情報：© OpenStreetMap contributors',
  mapAttribution: '© OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
  outsideKanazawa: '現在地が金沢市の外です',
  locationUnavailable: '現在地を使えませんでした。端末の位置情報の設定を確かめてください',
  minorOnly: '定番以外だけ',
  searchSpots: 'スポットを探す',
} as const;
