// 画面をまたいで使う文言（要件定義書 6.5、6.4、10.6）。各画面で書き換えない
import type { ValidationCode } from '@/types/models';

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
} as const;

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
