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

// （v11 第3段階）お店の申請・お店の管理（6.6 S-19・S-20、BR-26〜BR-28）
export const ShopMessages = {
  applyLead:
    '金沢市内のお店・施設の方は、申請して承認されると、キャンペーンを載せられます。審査は金沢市の担当者（管理者）が行います',
  contactNotice: 'ほかの利用者には表示しません',
  agreeNoRequest: '投稿の内容への頼み（良いことを書いてなど）をしない',
  agreeImage: '画像は権利を持つものだけを使い、生成AIで作った画像を使わない',
  applyConfirm: 'この内容で申請します。審査の結果はマイページに表示されます。',
  applied: '申請しました',
  pending: '審査中です',
  pendingLead: '審査の結果はマイページに表示されます。しばらくお待ちください',
  rejected: (reason: string | null) => `申請が却下されました${reason ? `（${reason}）` : ''}`,
  spotTaken: 'このスポットには、すでにお店があります。別のスポットを選んでください',
  imageNotice:
    '画像は、お店が撮ったもの・権利を持つものだけを使ってください。生成AIで作った画像は使えません',
  noContentRequest:
    '特典は投稿の内容（良い・悪い）にかかわらず出ます。「良いことを書いてください」などの、投稿の内容への頼みは書かないでください',
  suspended: '管理者がお店を停止しました。キャンペーンは表示されていません',
  stopped: '管理者が停止しました。直しても再開できません（管理者が再開します）',
  spotPositionNotice:
    '特典の対象は、お店のスポットから100m以内で投稿した人です。スポットの位置が違うときは管理者に連絡してください',
  endConfirm: 'このキャンペーンを終えます。終えたキャンペーンは再開できません。',
  campaignSaved: 'キャンペーンを保存しました',
  campaignEnded: 'キャンペーンを終えました',
  shopSaved: 'お店の情報を変えました',
  oneCampaign: 'キャンペーンは同時に1つまでです。今のキャンペーンを終えてから作ってください',
  noShop: 'お店が見つかりません',
} as const;

// （v11 第3段階）S-17 の位置の確認と S-23 の特典（6.4 S-17、6.6 S-23、BR-28）
export const RewardMessages = {
  campaignShop: 'キャンペーン中のお店です。お店の近くにいれば特典を受けられます',
  locationUse: 'お店の近くにいるかを確かめるために現在地を使います。位置は保存しません',
  checkButton: '現在地で確かめる',
  checking: '現在地を確かめています',
  eligible: '特典の対象です',
  far: (m: number) => `お店から離れているため、特典の対象になりません（約${m}m）`,
  inaccurate: (m: number) =>
    `位置の誤差が大きいため（約${m}m）、確かめられませんでした。屋外や窓の近くでもう一度お試しください`,
  already: 'このキャンペーンの特典は、すでに受け取っています',
  noCampaign: 'このキャンペーンは終わりました',
  denied: '位置の利用が許可されていないため、確かめられませんでした。ふつうの投稿はできます',
  unavailable: '現在地を取れませんでした。ふつうの投稿はできます',
  showToShop: '投稿すると特典の画面が出ます。お店の人に見せてください',
  labelNotice: 'この投稿は「キャンペーン参加」と表示されます',
  ownShop: '自分のお店のスポットには投稿できません',
  validToday: '本日 23:59 まで有効',
  useButton: 'お店の人が押してください：使用済みにする',
  useConfirm: '使用済みにすると戻せません。お店の人が押してください。',
  used: (at: string) => `使用済み（${at}）`,
  expired: 'この特典の有効期限が切れました',
  notViewable: 'この特典は見られません',
  viewReward: '特典を見る',
} as const;

// （v11 第3段階）管理者の画面・申請の審査（6.6 S-21・S-22、BR-26、BR-29）
export const AdminMessages = {
  reasonOptional: '理由（任意。200文字まで）',
  reasonRequired: '却下の理由（必須。200文字まで）。申請した人のマイページに表示されます',
  approved: '承認しました',
  rejected: '却下しました',
  done: '変更しました',
  noApplications: '申請はありません',
  noShops: 'お店はありません',
  noPosts: '投稿はありません',
  deactivateConfirm:
    'このスポットを使用中止にします。地図や検索に出なくなり、投稿もできなくなります。元に戻せません。',
  deactivated: 'スポットを使用中止にしました',
  applicationNotFound: 'この申請は見つかりません',
  reviewed: (status: 'approved' | 'rejected') =>
    status === 'approved' ? 'この申請は承認済みです' : 'この申請は却下済みです',
  status: { active: '営業中', suspended: '停止中' },
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
