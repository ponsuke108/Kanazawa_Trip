// BR-14：戻り先は「/」で始まるサイト内のURLだけを受け付ける（「//」で始まるものは不可）
export function safeRedirect(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}
