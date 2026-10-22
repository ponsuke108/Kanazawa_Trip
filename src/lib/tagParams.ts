// URL の tags の扱い（要件定義書 6.2）：数字以外を無視し、小さい順に並べる
export function parseTagIds(value: string | null): number[] {
  if (!value) return [];
  const ids = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map(Number);
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function tagsQuery(tagIds: number[]): string {
  return tagIds.length > 0 ? `?tags=${[...tagIds].sort((a, b) => a - b).join(',')}` : '';
}
