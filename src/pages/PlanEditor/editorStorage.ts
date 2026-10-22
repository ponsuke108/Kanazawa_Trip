// 作成画面の一時保存（要件定義書 BR-15、11.4）
// キーは travel-note:editor:{planId または new}。version が違えば捨てる
import type { EditorState } from '@/lib/blocks';

export function storageKey(planId: string | null): string {
  return `travel-note:editor:${planId ?? 'new'}`;
}

export function loadDraft(key: string): EditorState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.blocks)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed as EditorState;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, state: EditorState): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
  } catch {
    // 保存できない環境では何もしない
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 何もしない
  }
}
