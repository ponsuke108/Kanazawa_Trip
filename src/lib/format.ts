// 表示の形式（要件定義書 BR-12）。日付とルートの要約は各画面で独自に書かない
import { UiMessages } from '@/constants/messages';

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// BR-12：日本時間で YYYY/MM/DD
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// BR-12：最初の3スポットを「→」でつなぎ、残りは「ほかN件」
export function formatRoute(spotNames: string[]): string {
  const head = spotNames.slice(0, 3).join(' → ');
  const rest = spotNames.length - 3;
  return rest > 0 ? `${head} ほか${rest}件` : head;
}

// BR-12：タイトルのない下書きは「無題のプラン」
export function formatTitle(title: string): string {
  return title.trim() === '' ? UiMessages.untitledPlan : title;
}

// BR-12：「〇〇さんのプラン」
export function formatAuthor(displayName: string): string {
  return `${displayName}さんのプラン`;
}
