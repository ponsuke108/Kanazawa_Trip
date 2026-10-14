import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';
import type { AuthUser } from '@/types/models';

export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  if (USE_MOCK) return mockApi.signUp(input);
  return notImplemented('signUp');
}

export async function signIn(input: { email: string; password: string }): Promise<AuthUser> {
  if (USE_MOCK) return mockApi.signIn(input);
  return notImplemented('signIn');
}

export async function signOut(): Promise<void> {
  if (USE_MOCK) return mockApi.signOut();
  return notImplemented('signOut');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (USE_MOCK) return mockApi.getCurrentUser();
  return notImplemented('getCurrentUser');
}

// ログイン状態の変化を知らせる（本物は I-19 で Supabase の onAuthStateChange につなぐ）
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  void callback;
  return () => {};
}
