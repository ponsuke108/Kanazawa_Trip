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

// 6.4 のトースト
export const Toasts = {
  draftSaved: '下書きを保存しました',
  published: '公開しました',
  updated: '更新しました',
  unpublished: '非公開にしました',
  deleted: '削除しました',
  loggedIn: 'ログインしました',
  signedUp: '登録しました',
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
} as const;
