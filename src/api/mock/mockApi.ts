// メモリ上で動くモック（要件定義書 9.6、9.7）。本物の api と同じ名前・同じ戻り値の形にする
// 保存した内容は画面を再読み込みするまで覚えておく。ログイン状態だけは localStorage に保つ
import { areaIndex } from '@/constants/areas';
import { ApiError } from '@/api/errors';
import {
  MOCK_TARO,
  mockLikes,
  mockPlans,
  mockSpots,
  mockTags,
  mockUsers,
  type MockPlanSeed,
} from '@/api/mock/data';
import type {
  AuthUser,
  Block,
  PlanDetail,
  PlanSummary,
  SavePlanInput,
  SearchResult,
  Spot,
  Tag,
  TransportMode,
} from '@/types/models';

const SESSION_KEY = 'travel-note:mock-session';
const PAGE_SIZE = 20;

// ---- 状態 ----

type StoredBlock =
  | {
      id: string;
      type: 'spot';
      spotId: number;
      transportMode: TransportMode | null;
      imagePath: string | null;
    }
  | { id: string; type: 'comment'; body: string };

type StoredPlan = Omit<MockPlanSeed, 'blocks'> & { blocks: StoredBlock[] };

type StoredLike = { userId: string; planId: string; createdAt: string };

let seq = 0;
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function seedPlans(): StoredPlan[] {
  return mockPlans.map((p) => ({
    ...p,
    tagIds: [...p.tagIds],
    blocks: p.blocks.map((b, i) =>
      b.type === 'spot'
        ? {
            id: `${p.id}-b${i}`,
            type: 'spot',
            spotId: b.spotId,
            transportMode: b.transportMode,
            imagePath: null,
          }
        : { id: `${p.id}-b${i}`, type: 'comment', body: b.body },
    ),
  }));
}

const state = {
  plans: seedPlans(),
  likes: mockLikes.map((l) => ({ ...l })) as StoredLike[],
  // 写真のパスと、ブラウザ内の一時URLの対応
  images: new Map<string, string>(),
  session: null as AuthUser | null,
  sessionLoaded: false,
};

// テスト用：状態を初期値に戻す
export function resetMockState(): void {
  state.plans = seedPlans();
  state.likes = mockLikes.map((l) => ({ ...l }));
  state.images.clear();
  state.session = null;
  state.sessionLoaded = true;
  writeSession(null);
}

// ---- 共通 ----

// 読み込み中の表示を確認できるように少し待つ（テストでは待たない）
function delay(): Promise<void> {
  if (import.meta.env.MODE === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, 300));
}

function readSession(): AuthUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser | null): void {
  try {
    if (user) globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(user));
    else globalThis.localStorage?.removeItem(SESSION_KEY);
  } catch {
    // localStorage が使えない環境ではメモリだけで保つ
  }
}

function currentUser(): AuthUser | null {
  if (!state.sessionLoaded) {
    state.session = readSession();
    state.sessionLoaded = true;
  }
  return state.session;
}

function requireUser(): AuthUser {
  const user = currentUser();
  if (!user) throw new ApiError('UNAUTHORIZED');
  return user;
}

function spotById(id: number): Spot {
  const spot = mockSpots.find((s) => s.id === id);
  if (!spot) throw new ApiError('NOT_FOUND', `spot ${id}`);
  return spot;
}

function displayName(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.displayName ?? '利用者';
}

// RLS と同じ：公開中は誰でも、それ以外は本人だけが読める
function canRead(plan: StoredPlan, user: AuthUser): boolean {
  return plan.status === 'published' || plan.userId === user.id;
}

function likeCount(plan: StoredPlan): number {
  return plan.otherLikes + state.likes.filter((l) => l.planId === plan.id).length;
}

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  return state.images.get(path) ?? null;
}

function spotBlocks(plan: StoredPlan) {
  return plan.blocks.filter((b): b is Extract<StoredBlock, { type: 'spot' }> => b.type === 'spot');
}

// BR-02：定番以外（minor）のスポットが1つ以上あれば true。起点（hub）は数えない
function hasMinorSpot(plan: StoredPlan): boolean {
  return spotBlocks(plan).some((b) => spotById(b.spotId).spotType === 'minor');
}

function toSummary(plan: StoredPlan): PlanSummary {
  const spots = spotBlocks(plan);
  const cover = spots.find((b) => b.imagePath)?.imagePath ?? null;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    authorId: plan.userId,
    authorName: displayName(plan.userId),
    likeCount: likeCount(plan),
    spotCount: spots.length,
    spotNames: spots.map((b) => spotById(b.spotId).name),
    tagIds: [...plan.tagIds],
    hasMinorSpot: hasMinorSpot(plan),
    coverImageUrl: imageUrl(cover),
    publishedAt: plan.publishedAt,
    updatedAt: plan.updatedAt,
  };
}

function toDetail(plan: StoredPlan): PlanDetail {
  // BR-07：コピー元が削除・非公開なら表示しない
  const source = plan.sourcePlanId
    ? state.plans.find((p) => p.id === plan.sourcePlanId)
    : undefined;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    author: { id: plan.userId, displayName: displayName(plan.userId) },
    sourcePlan:
      source && source.status === 'published'
        ? { id: source.id, authorName: displayName(source.userId) }
        : null,
    tags: plan.tagIds
      .map((id) => mockTags.find((t) => t.id === id))
      .filter((t): t is Tag => t !== undefined)
      .sort((a, b) => a.id - b.id),
    likeCount: likeCount(plan),
    publishedAt: plan.publishedAt,
    updatedAt: plan.updatedAt,
    blocks: plan.blocks.map((b): Block =>
      b.type === 'spot'
        ? {
            id: b.id,
            type: 'spot',
            spot: spotById(b.spotId),
            transportMode: b.transportMode,
            imagePath: b.imagePath,
            imageUrl: imageUrl(b.imagePath),
          }
        : { id: b.id, type: 'comment', body: b.body },
    ),
  };
}

function published(): StoredPlan[] {
  return state.plans.filter((p) => p.status === 'published');
}

function byTimeDesc(a: string | null, b: string | null): number {
  return (b ?? '').localeCompare(a ?? '');
}

function ownPlan(planId: string, user: AuthUser): StoredPlan {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) throw new ApiError('NOT_FOUND');
  if (plan.userId !== user.id) throw new ApiError('FORBIDDEN');
  return plan;
}

// 保存前の確認。I-08 で validatePlan を使うように差し替える
let validateBeforeSave: (input: SavePlanInput) => void = () => {};
export function setMockValidator(fn: (input: SavePlanInput) => void): void {
  validateBeforeSave = fn;
}

// ---- 関数（10.3） ----

export const mockApi = {
  async getTags(): Promise<Tag[]> {
    await delay();
    requireUser();
    return mockTags.map((t) => ({ ...t }));
  },

  async getSpots(): Promise<Spot[]> {
    await delay();
    requireUser();
    return mockSpots
      .filter((s) => s.isActive)
      .sort((a, b) => areaIndex(a.area) - areaIndex(b.area) || a.id - b.id)
      .map((s) => ({ ...s }));
  },

  // BR-01
  async searchPlans({ tagIds, page }: { tagIds: number[]; page: number }): Promise<SearchResult> {
    await delay();
    requireUser();
    const rows = published()
      .map((plan) => ({
        plan,
        match: plan.tagIds.filter((id) => tagIds.includes(id)).length,
        summary: toSummary(plan),
      }))
      .filter((r) => tagIds.length === 0 || r.match > 0)
      .sort(
        (a, b) =>
          b.match - a.match ||
          Number(b.summary.hasMinorSpot) - Number(a.summary.hasMinorSpot) ||
          b.summary.likeCount - a.summary.likeCount ||
          byTimeDesc(a.plan.publishedAt, b.plan.publishedAt) ||
          a.plan.id.localeCompare(b.plan.id),
      );
    const items = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r) => r.summary);
    return {
      items,
      totalCount: rows.length,
      hasMore: (page + 1) * PAGE_SIZE < rows.length,
    };
  },

  // BR-11
  async getRanking({
    type,
    limit,
  }: {
    type: 'overall' | 'minor';
    limit: number;
  }): Promise<PlanSummary[]> {
    await delay();
    requireUser();
    return published()
      .map(toSummary)
      .filter((s) => type === 'overall' || s.hasMinorSpot)
      .sort(
        (a, b) =>
          b.likeCount - a.likeCount ||
          byTimeDesc(a.publishedAt, b.publishedAt) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, limit);
  },

  async getPlan(planId: string): Promise<PlanDetail | null> {
    await delay();
    const user = requireUser();
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan || !canRead(plan, user)) return null;
    return toDetail(plan);
  },

  async savePlan(input: SavePlanInput): Promise<{ id: string }> {
    await delay();
    const user = requireUser();
    validateBeforeSave(input);
    const now = new Date().toISOString();
    const blocks: StoredBlock[] = input.blocks.map((b) =>
      b.type === 'spot'
        ? {
            id: newId('block'),
            type: 'spot',
            spotId: spotById(b.spotId).id,
            transportMode: b.transportMode,
            imagePath: b.imagePath,
          }
        : { id: newId('block'), type: 'comment', body: b.body },
    );

    if (input.id === null) {
      const plan: StoredPlan = {
        id: newId('mock-plan'),
        title: input.title,
        userId: user.id,
        status: input.status,
        tagIds: [...input.tagIds],
        sourcePlanId: input.sourcePlanId,
        // BR-09：公開したときに公開日時を入れる
        publishedAt: input.status === 'published' ? now : null,
        updatedAt: now,
        createdAt: now,
        otherLikes: 0,
        blocks,
      };
      state.plans.push(plan);
      return { id: plan.id };
    }

    const plan = ownPlan(input.id, user);
    // BR-09：下書きから公開にしたときだけ公開日時を現在時刻にする。公開中の更新では変えない
    if (input.status === 'published') {
      plan.publishedAt = plan.status === 'published' ? plan.publishedAt : now;
    } else {
      plan.publishedAt = null;
    }
    plan.status = input.status;
    plan.title = input.title;
    plan.tagIds = [...input.tagIds];
    plan.blocks = blocks;
    plan.updatedAt = now;
    return { id: plan.id };
  },

  // BR-09
  async unpublishPlan(planId: string): Promise<void> {
    await delay();
    const user = requireUser();
    const plan = ownPlan(planId, user);
    plan.status = 'draft';
    plan.publishedAt = null;
    plan.updatedAt = new Date().toISOString();
  },

  // BR-10
  async deletePlan(planId: string): Promise<void> {
    await delay();
    const user = requireUser();
    ownPlan(planId, user);
    state.plans = state.plans.filter((p) => p.id !== planId);
    state.likes = state.likes.filter((l) => l.planId !== planId);
    for (const p of state.plans) {
      if (p.sourcePlanId === planId) p.sourcePlanId = null;
    }
  },

  // BR-13：モックではブラウザ内の一時URLを返す
  async uploadPlanImage(file: File): Promise<{ path: string; url: string }> {
    await delay();
    const user = requireUser();
    if (!file.type.startsWith('image/')) throw new ApiError('VALIDATION', 'IMAGE_UNREADABLE');
    const path = `${user.id}/${newId('img')}.jpg`;
    const url = URL.createObjectURL(file);
    state.images.set(path, url);
    return { path, url };
  },

  // BR-08
  async likePlan(planId: string): Promise<void> {
    await delay();
    const user = requireUser();
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan || plan.status !== 'published') throw new ApiError('NOT_FOUND');
    if (plan.userId === user.id) throw new ApiError('FORBIDDEN');
    if (state.likes.some((l) => l.planId === planId && l.userId === user.id)) return;
    state.likes.push({ userId: user.id, planId, createdAt: new Date().toISOString() });
  },

  async unlikePlan(planId: string): Promise<void> {
    await delay();
    const user = requireUser();
    state.likes = state.likes.filter((l) => !(l.planId === planId && l.userId === user.id));
  },

  async hasLiked(planId: string): Promise<boolean> {
    await delay();
    const user = requireUser();
    return state.likes.some((l) => l.planId === planId && l.userId === user.id);
  },

  async getMyPlans(): Promise<PlanSummary[]> {
    await delay();
    const user = requireUser();
    return state.plans
      .filter((p) => p.userId === user.id)
      .sort((a, b) => byTimeDesc(a.updatedAt, b.updatedAt))
      .map(toSummary);
  },

  // BR-09：非公開のプランは他の人の「いいねしたプラン」に出ない
  async getLikedPlans(): Promise<PlanSummary[]> {
    await delay();
    const user = requireUser();
    return state.likes
      .filter((l) => l.userId === user.id)
      .sort((a, b) => byTimeDesc(a.createdAt, b.createdAt))
      .map((l) => state.plans.find((p) => p.id === l.planId))
      .filter((p): p is StoredPlan => p !== undefined && canRead(p, user))
      .map(toSummary);
  },

  // モックでは、どのメールアドレスとパスワードでもテスト太郎としてログインする（9.6）
  async signUp(input: { email: string; password: string; displayName: string }): Promise<AuthUser> {
    await delay();
    void input;
    return mockApi.signInAsTaro();
  },

  async signIn(input: { email: string; password: string }): Promise<AuthUser> {
    await delay();
    void input;
    return mockApi.signInAsTaro();
  },

  signInAsTaro(): AuthUser {
    const user: AuthUser = {
      id: MOCK_TARO.id,
      email: MOCK_TARO.email,
      displayName: MOCK_TARO.displayName,
    };
    state.session = user;
    state.sessionLoaded = true;
    writeSession(user);
    return user;
  },

  async signOut(): Promise<void> {
    await delay();
    state.session = null;
    state.sessionLoaded = true;
    writeSession(null);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    return currentUser();
  },
};
