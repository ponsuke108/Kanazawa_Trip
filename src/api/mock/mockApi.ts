// メモリ上で動くモック（要件定義書 9.6、9.7）。本物の api と同じ名前・同じ戻り値の形にする
// 保存した内容は画面を再読み込みするまで覚えておく。ログイン状態だけは localStorage に保つ
import { areaIndex } from '@/constants/areas';
import { ApiError } from '@/api/errors';
import { validatePlan } from '@/lib/blocks';
import { distanceKm, isInKanazawa } from '@/lib/geo';
import {
  MOCK_SHOP,
  MOCK_TARO,
  mockApplications,
  mockCampaign,
  mockLikes,
  mockLists,
  mockOsmRefs,
  mockPlaceCandidates,
  mockPlans,
  mockSpotPosts,
  mockSpots,
  mockTags,
  mockUsers,
  type MockPlanSeed,
} from '@/api/mock/data';
import type {
  ApplicationInput,
  AuthUser,
  Block,
  Campaign,
  CampaignInput,
  CampaignReward,
  ListDetail,
  ListSummary,
  PlaceCandidate,
  PlanDetail,
  PlanSummary,
  SavePlanInput,
  SaveSpotPostInput,
  SearchResult,
  ShopApplication,
  ShopDetail,
  Spot,
  SpotDetail,
  SpotPost,
  Tag,
  TransportMode,
  UserRole,
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

// （v11）
type StoredList = {
  id: string;
  userId: string;
  name: string;
  updatedAt: string;
  spotIds: number[];
};
type StoredPost = {
  id: string;
  userId: string;
  spotId: number;
  body: string;
  imagePaths: string[];
  isHidden: boolean;
  campaignId: string | null; // （v11）キャンペーンで投稿したとき
  createdAt: string;
  updatedAt: string;
};

// （v11 第3段階）お店・キャンペーン・申請・特典（9.2）
type StoredShop = {
  id: string;
  spotId: number;
  ownerId: string;
  name: string;
  introduction: string;
  status: 'active' | 'suspended';
};
type StoredCampaign = Omit<Campaign, 'shopName' | 'imageUrl'> & { imagePath: string | null };
type StoredApplication = Omit<ShopApplication, 'spot'> & { userId: string; spotId: number };
type StoredReward = {
  id: string;
  campaignId: string;
  userId: string;
  postId: string | null;
  issuedAt: string;
  distanceM: number;
  usedAt: string | null;
};
type StoredAdminAction = {
  adminId: string;
  action: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
};

function seedShops(): StoredShop[] {
  return [{ ...MOCK_SHOP, status: 'active' }];
}

function seedCampaigns(): StoredCampaign[] {
  const { shopName, imageUrl, ...rest } = mockCampaign;
  void shopName;
  void imageUrl;
  return [{ ...rest, imagePath: null }];
}

function seedApplications(): StoredApplication[] {
  return mockApplications.map((a) => ({ ...a }));
}

function seedSpots(): Spot[] {
  return mockSpots.map((s) => ({ ...s }));
}

function seedLists(): StoredList[] {
  return mockLists.map((l) => ({ ...l, spotIds: [...l.spotIds] }));
}

function seedPosts(): StoredPost[] {
  return mockSpotPosts.map((p) => ({
    ...p,
    imagePaths: [],
    isHidden: false,
    campaignId: null,
    updatedAt: p.createdAt,
  }));
}

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
  // （v11）
  spots: seedSpots(),
  osmRefs: { ...mockOsmRefs } as Record<number, string>,
  nextUserSpotId: 100003,
  lists: seedLists(),
  posts: seedPosts(),
  shareTokens: new Map<string, string>(), // planId → 合言葉
  // （v11 第3段階）
  shops: seedShops(),
  campaigns: seedCampaigns(),
  applications: seedApplications(),
  rewards: [] as StoredReward[],
  adminActions: [] as StoredAdminAction[],
  roles: new Map<string, UserRole>(), // 承認で変わった利用者の種類
};

// テスト用：状態を初期値に戻す
export function resetMockState(): void {
  state.plans = seedPlans();
  state.likes = mockLikes.map((l) => ({ ...l }));
  state.images.clear();
  state.session = null;
  state.sessionLoaded = true;
  state.spots = seedSpots();
  state.osmRefs = { ...mockOsmRefs };
  state.nextUserSpotId = 100003;
  state.lists = seedLists();
  state.posts = seedPosts();
  state.shareTokens.clear();
  state.shops = seedShops();
  state.campaigns = seedCampaigns();
  state.applications = seedApplications();
  state.rewards = [];
  state.adminActions = [];
  state.roles.clear();
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

// （v11）キャンペーン中か（日本時間の今日が期間の中で、status が active。BR-27）
function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

// キャンペーンが active、お店が active、日本時間の今日が期間の中（I-36 の active_campaign_id と同じ）
function activeCampaignOf(spotId: number): Campaign | null {
  const shop = state.shops.find((sh) => sh.spotId === spotId && sh.status === 'active');
  if (!shop) return null;
  const today = todayJst();
  const c = state.campaigns.find(
    (x) =>
      x.shopId === shop.id && x.status === 'active' && x.startsOn <= today && today <= x.endsOn,
  );
  return c ? toCampaign(c) : null;
}

function toCampaign(c: StoredCampaign): Campaign {
  const { imagePath, ...rest } = c;
  return {
    ...rest,
    shopName: state.shops.find((sh) => sh.id === c.shopId)?.name ?? '',
    imageUrl: imageUrl(imagePath),
  };
}

function roleOf(userId: string): UserRole {
  return state.roles.get(userId) ?? mockUsers.find((u) => u.id === userId)?.role ?? 'user';
}

// 特典は受け取った日のうち（日本時間の23:59まで）有効（BR-28）
function rewardDateJst(issuedAt: string): string {
  return new Date(issuedAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

function isRewardValid(r: StoredReward): boolean {
  return r.usedAt === null && rewardDateJst(r.issuedAt) === todayJst();
}

function toReward(r: StoredReward): CampaignReward | null {
  const c = state.campaigns.find((x) => x.id === r.campaignId);
  if (!c) return null;
  return {
    id: r.id,
    campaign: toCampaign(c),
    issuedAt: r.issuedAt,
    expiresAt: `${rewardDateJst(r.issuedAt)}T23:59:59+09:00`,
    usedAt: r.usedAt,
  };
}

// check_campaign_eligibility と同じ判定（BR-28）
function eligibilityOf(
  userId: string,
  spotId: number,
  pos: { lat: number; lng: number; accuracy: number },
): { eligible: boolean; distanceM: number | null; campaign: Campaign | null } {
  const spot = state.spots.find((x) => x.id === spotId);
  if (!spot) return { eligible: false, distanceM: null, campaign: null };
  const distanceM = Math.round(distanceKm(pos, spot) * 1000);
  const campaign = activeCampaignOf(spotId);
  if (!campaign) return { eligible: false, distanceM, campaign: null };
  const shop = state.shops.find((sh) => sh.spotId === spotId);
  const eligible =
    distanceM <= 100 &&
    pos.accuracy <= 100 &&
    shop?.ownerId !== userId &&
    !state.rewards.some((r) => r.campaignId === campaign.id && r.userId === userId);
  return { eligible, distanceM, campaign };
}

function requireAdmin(): AuthUser {
  const user = requireUser();
  if (roleOf(user.id) !== 'admin') throw new ApiError('FORBIDDEN');
  return user;
}

function toApplication(a: StoredApplication): ShopApplication {
  const { userId, spotId, ...rest } = a;
  void userId;
  return { ...rest, spot: { id: spotId, name: spotById(spotId).name } };
}

function toShopDetail(shop: StoredShop, viewerId: string): ShopDetail {
  const campaigns = state.campaigns.filter((c) => c.shopId === shop.id && c.status !== 'ended');
  const current = campaigns.find((c) => c.status === 'active') ?? campaigns[0] ?? null;
  // 特典の数はお店の本人だけが読める（9.4 の RLS と同じ）
  const rewards =
    current && shop.ownerId === viewerId
      ? state.rewards.filter((r) => r.campaignId === current.id)
      : [];
  return {
    id: shop.id,
    spot: { id: shop.spotId, name: spotById(shop.spotId).name },
    name: shop.name,
    introduction: shop.introduction,
    status: shop.status,
    campaign: current ? toCampaign(current) : null,
    rewardCount: rewards.length,
    usedRewardCount: rewards.filter((r) => r.usedAt !== null).length,
  };
}

function recordAdmin(adminId: string, action: string, targetId: string, reason?: string | null) {
  state.adminActions.push({
    adminId,
    action,
    targetId,
    reason: reason?.trim() || null,
    createdAt: new Date().toISOString(),
  });
}

// 期間は最長90日（BR-27）。題名などの文字数も確かめる
function validCampaign(input: CampaignInput): boolean {
  const start = Date.parse(input.startsOn);
  const end = Date.parse(input.endsOn);
  return (
    input.title.trim().length >= 1 &&
    input.title.trim().length <= 30 &&
    input.benefit.trim().length >= 1 &&
    input.benefit.trim().length <= 50 &&
    input.notice.length <= 200 &&
    input.description.length <= 500 &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    end >= start &&
    end - start <= 90 * 86_400_000
  );
}

// 投稿の数、ピンの写真（表示中の投稿のいちばん新しい写真）、キャンペーンを足す（spot_summaries と同じ）
function withSummary(spot: Spot): Spot {
  const posts = state.posts
    .filter((p) => p.spotId === spot.id && !p.isHidden)
    .sort((a, b) => byTimeDesc(a.createdAt, b.createdAt));
  const latestPath = posts.flatMap((p) => p.imagePaths)[0] ?? null;
  return {
    ...spot,
    postCount: posts.length,
    latestImageUrl: imageUrl(latestPath),
    hasActiveCampaign: activeCampaignOf(spot.id) !== null,
  };
}

function spotById(id: number): Spot {
  const spot = state.spots.find((s) => s.id === id);
  if (!spot) throw new ApiError('NOT_FOUND', `spot ${id}`);
  return withSummary(spot);
}

function toAuthUser(u: (typeof mockUsers)[number]): AuthUser {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role };
}

function ownList(listId: string, user: AuthUser): StoredList {
  const list = state.lists.find((l) => l.id === listId && l.userId === user.id);
  if (!list) throw new ApiError('NOT_FOUND');
  return list;
}

function toListSummary(list: StoredList): ListSummary {
  return {
    id: list.id,
    name: list.name,
    spotCount: list.spotIds.length,
    spotIds: [...list.spotIds],
    firstSpotNames: list.spotIds.slice(0, 3).map((id) => spotById(id).name),
    updatedAt: list.updatedAt,
  };
}

function toPost(p: StoredPost, withReward = false): SpotPost {
  const reward = withReward
    ? state.rewards.find((r) => r.postId === p.id && r.userId === p.userId && isRewardValid(r))
    : undefined;
  return {
    id: p.id,
    spot: { id: p.spotId, name: spotById(p.spotId).name },
    author: { id: p.userId, displayName: displayName(p.userId) },
    body: p.body,
    imageUrls: p.imagePaths.flatMap((path) => {
      const url = imageUrl(path);
      return url ? [url] : [];
    }),
    isCampaign: p.campaignId !== null,
    isHidden: p.isHidden,
    rewardId: reward?.id ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const LIST_LIMIT = 20; // BR-18
const LIST_SPOT_LIMIT = 30; // BR-18
const POST_PAGE_SIZE = 20; // 10.3

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

// 保存前の確認（BR-06）。save_plan と同じく最初の検証コードで失敗させる
function validateBeforeSave(input: SavePlanInput): void {
  const issues = validatePlan(input, input.status === 'published' ? 'publish' : 'draft');
  if (issues.length > 0) throw new ApiError('VALIDATION', issues[0].code, [issues[0]]);
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
    // （v11）利用者のスポットも含む。エリアが空のものは最後
    return state.spots
      .filter((s) => s.isActive)
      .sort((a, b) => areaIndex(a.area) - areaIndex(b.area) || a.id - b.id)
      .map(withSummary);
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
    return mockApi.signInAs(MOCK_TARO.id);
  },

  // テスト用：別の利用者としてログインする
  signInAs(userId: string): AuthUser {
    const found = mockUsers.find((u) => u.id === userId);
    if (!found) throw new ApiError('NOT_FOUND');
    const user = toAuthUser(found);
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
    const user = currentUser();
    // 承認で利用者の種類が変わったとき（モックの中だけ）
    if (user && state.roles.has(user.id)) return { ...user, role: roleOf(user.id) };
    // 以前のモックで保存したログイン状態には role がないので、利用者の一覧から補う
    if (user && !user.role) {
      const found = mockUsers.find((u) => u.id === user.id);
      return { ...user, role: found?.role ?? 'user' };
    }
    return user;
  },

  // ---- （v11）スポット ----

  async getSpot(spotId: number): Promise<SpotDetail | null> {
    await delay();
    requireUser();
    if (!state.spots.some((s) => s.id === spotId)) return null;
    const campaign = activeCampaignOf(spotId);
    const shop = state.shops.find((sh) => sh.spotId === spotId && sh.status === 'active');
    return { ...spotById(spotId), campaign, shopName: shop?.name ?? null };
  },

  // 9.7：3件の候補から、名前に入力の文字を含むものを返す。osm_ref が登録済みなら existingSpotId を入れる
  async searchPlaces(query: string): Promise<PlaceCandidate[]> {
    await delay();
    requireUser();
    const q = query.trim();
    if (q === '') return [];
    return mockPlaceCandidates
      .filter((c) => c.name.includes(q))
      .map((c) => ({ ...c, existingSpotId: spotIdByOsmRef(c.osmRef) }));
  },

  // BR-20：同じ osm_ref → その id。金沢市の外 → OUT_OF_AREA。50m 以内の同じ名前 → その id
  async registerSpot(candidate: PlaceCandidate): Promise<{ spotId: number; reused: boolean }> {
    await delay();
    const user = requireUser();
    void user;
    const byRef = spotIdByOsmRef(candidate.osmRef);
    if (byRef !== null) return { spotId: byRef, reused: true };
    // 本物は場所の検索で住所が金沢市のものだけを候補にする（9.8）。モックの候補は絞っていないので、ここで住所も見る
    if (!isInKanazawa(candidate.lat, candidate.lng) || !candidate.address.includes('金沢市')) {
      throw new ApiError('OUT_OF_AREA', 'OUT_OF_AREA');
    }
    const near = state.spots
      .filter((s) => s.name === candidate.name && distanceKm(s, candidate) * 1000 <= 50)
      .sort((a, b) => distanceKm(a, candidate) - distanceKm(b, candidate))[0];
    if (near) return { spotId: near.id, reused: true };
    const id = state.nextUserSpotId;
    state.nextUserSpotId += 1;
    state.spots.push({
      id,
      name: candidate.name.slice(0, 50),
      description: null,
      lat: candidate.lat,
      lng: candidate.lng,
      placeId: null,
      spotType: 'minor',
      area: null,
      isActive: true,
      source: 'user',
      address: candidate.address.slice(0, 100),
      placeKind: candidate.placeKind,
      postCount: 0,
      latestImageUrl: null,
      hasActiveCampaign: false,
    });
    state.osmRefs[id] = candidate.osmRef;
    return { spotId: id, reused: false };
  },

  // ---- （v11）リスト（BR-18） ----

  async getLists(): Promise<ListSummary[]> {
    await delay();
    const user = requireUser();
    return state.lists
      .filter((l) => l.userId === user.id)
      .sort((a, b) => byTimeDesc(a.updatedAt, b.updatedAt))
      .map(toListSummary);
  },

  async getList(listId: string): Promise<ListDetail | null> {
    await delay();
    const user = requireUser();
    const list = state.lists.find((l) => l.id === listId && l.userId === user.id);
    if (!list) return null;
    return {
      id: list.id,
      name: list.name,
      spots: list.spotIds.map(spotById),
      updatedAt: list.updatedAt,
    };
  },

  async createList({ name }: { name: string }): Promise<{ id: string }> {
    await delay();
    const user = requireUser();
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 30) throw new ApiError('UNKNOWN', 'lists_name_check');
    if (state.lists.filter((l) => l.userId === user.id).length >= LIST_LIMIT) {
      throw new ApiError('LIMIT_REACHED', 'LIMIT_REACHED');
    }
    const list: StoredList = {
      id: newId('mock-list'),
      userId: user.id,
      name: clean,
      updatedAt: new Date().toISOString(),
      spotIds: [],
    };
    state.lists.push(list);
    return { id: list.id };
  },

  async createListFromSpots({
    name,
    spotIds,
  }: {
    name: string;
    spotIds: number[];
  }): Promise<{ id: string }> {
    const { id } = await mockApi.createList({ name: name.trim().slice(0, 30) });
    const list = state.lists.find((l) => l.id === id);
    if (list) {
      const unique = [...new Set(spotIds)];
      if (unique.length > LIST_SPOT_LIMIT) throw new ApiError('LIMIT_REACHED', 'LIMIT_REACHED');
      list.spotIds = unique.map((sid) => spotById(sid).id);
    }
    return { id };
  },

  async renameList(listId: string, name: string): Promise<void> {
    await delay();
    const list = ownList(listId, requireUser());
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 30) throw new ApiError('UNKNOWN', 'lists_name_check');
    list.name = clean;
    list.updatedAt = new Date().toISOString();
  },

  async deleteList(listId: string): Promise<void> {
    await delay();
    ownList(listId, requireUser());
    state.lists = state.lists.filter((l) => l.id !== listId);
  },

  async addSpotToList(listId: string, spotId: number): Promise<{ added: boolean }> {
    await delay();
    const list = ownList(listId, requireUser());
    if (list.spotIds.includes(spotId)) return { added: false };
    if (list.spotIds.length >= LIST_SPOT_LIMIT)
      throw new ApiError('LIMIT_REACHED', 'LIMIT_REACHED');
    list.spotIds.push(spotById(spotId).id);
    list.updatedAt = new Date().toISOString();
    return { added: true };
  },

  async removeSpotFromList(listId: string, spotId: number): Promise<void> {
    await delay();
    const list = ownList(listId, requireUser());
    list.spotIds = list.spotIds.filter((id) => id !== spotId);
    list.updatedAt = new Date().toISOString();
  },

  // ---- （v11）スポットの投稿（BR-21） ----

  async getSpotPosts({
    spotId,
    page,
  }: {
    spotId: number;
    page: number;
  }): Promise<{ items: SpotPost[]; hasMore: boolean }> {
    await delay();
    requireUser();
    const all = state.posts
      .filter((p) => p.spotId === spotId && !p.isHidden)
      .sort((a, b) => byTimeDesc(a.createdAt, b.createdAt) || a.id.localeCompare(b.id));
    const from = page * POST_PAGE_SIZE;
    return {
      items: all.slice(from, from + POST_PAGE_SIZE).map((p) => toPost(p)),
      hasMore: from + POST_PAGE_SIZE < all.length,
    };
  },

  async getSpotPost(postId: string): Promise<SpotPost | null> {
    await delay();
    const user = requireUser();
    const post = state.posts.find((p) => p.id === postId && p.userId === user.id);
    return post ? toPost(post) : null;
  },

  async getMySpotPosts(): Promise<SpotPost[]> {
    await delay();
    const user = requireUser();
    return state.posts
      .filter((p) => p.userId === user.id)
      .sort((a, b) => byTimeDesc(a.createdAt, b.createdAt))
      .map((p) => toPost(p, true));
  },

  // save_spot_post と同じ確かめ（10.9、BR-28）
  async saveSpotPost(input: SaveSpotPostInput): Promise<{ id: string; rewardId: string | null }> {
    await delay();
    const user = requireUser();
    const body = input.body.trim();
    if (body.length < 1 || body.length > 300) throw new ApiError('UNKNOWN', 'POST_BODY_INVALID');
    if (input.imagePaths.length < 1 || input.imagePaths.length > 4) {
      throw new ApiError('UNKNOWN', 'POST_IMAGES_INVALID');
    }
    if (input.imagePaths.some((p) => !p.startsWith(`${user.id}/`))) {
      throw new ApiError('FORBIDDEN');
    }
    const now = new Date().toISOString();
    if (input.id === null) {
      const spot = spotById(input.spotId);
      if (!spot.isActive) throw new ApiError('NOT_FOUND');
      // お店は、自分のお店のスポットに投稿できない（BR-28）
      if (state.shops.some((sh) => sh.spotId === spot.id && sh.ownerId === user.id)) {
        throw new ApiError('FORBIDDEN');
      }
      const post: StoredPost = {
        id: newId('mock-post'),
        userId: user.id,
        spotId: spot.id,
        body,
        imagePaths: [...input.imagePaths],
        isHidden: false,
        campaignId: null,
        createdAt: now,
        updatedAt: now,
      };
      state.posts.push(post);
      // 投稿するときの位置で確かめ、対象なら特典を出す。位置は保存しない（BR-28）
      if (input.position) {
        const check = eligibilityOf(user.id, spot.id, input.position);
        if (check.eligible && check.campaign && check.distanceM !== null) {
          const reward: StoredReward = {
            id: newId('mock-reward'),
            campaignId: check.campaign.id,
            userId: user.id,
            postId: post.id,
            issuedAt: now,
            distanceM: check.distanceM,
            usedAt: null,
          };
          state.rewards.push(reward);
          post.campaignId = check.campaign.id;
          return { id: post.id, rewardId: reward.id };
        }
      }
      return { id: post.id, rewardId: null };
    }
    const post = state.posts.find((p) => p.id === input.id);
    if (!post || post.userId !== user.id || post.spotId !== input.spotId) {
      throw new ApiError('FORBIDDEN');
    }
    post.body = body;
    post.imagePaths = [...input.imagePaths];
    post.updatedAt = now;
    return { id: post.id, rewardId: null };
  },

  async deleteSpotPost(postId: string): Promise<void> {
    await delay();
    const user = requireUser();
    const post = state.posts.find((p) => p.id === postId);
    if (!post || post.userId !== user.id) throw new ApiError('FORBIDDEN');
    for (const path of post.imagePaths) state.images.delete(path);
    state.posts = state.posts.filter((p) => p.id !== postId);
  },

  // 表示用の URL から写真のパスに戻す（編集のとき）
  spotPostImagePaths(post: SpotPost): string[] {
    const stored = state.posts.find((p) => p.id === post.id);
    return stored ? [...stored.imagePaths] : [];
  },

  async uploadSpotPostImage(file: File): Promise<{ path: string; url: string }> {
    return mockApi.uploadPlanImage(file);
  },

  // ---- （v11）プラン ----

  // そのスポットを含む公開中のプランを、いいね数の多い順に5件
  async getPlansBySpot(spotId: number): Promise<PlanSummary[]> {
    await delay();
    requireUser();
    return published()
      .filter((p) => spotBlocks(p).some((b) => b.spotId === spotId))
      .map(toSummary)
      .sort(
        (a, b) =>
          b.likeCount - a.likeCount ||
          byTimeDesc(a.publishedAt, b.publishedAt) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 5);
  },

  // BR-30：すでに共有していれば、そのリンクを返す
  async createShareLink(planId: string): Promise<{ url: string }> {
    await delay();
    ownPlan(planId, requireUser());
    let token = state.shareTokens.get(planId);
    if (!token) {
      token = `mock${newId('share').replace(/[^A-Za-z0-9]/g, '')}`.padEnd(32, 'x').slice(0, 32);
      state.shareTokens.set(planId, token);
    }
    const origin = globalThis.location?.origin ?? 'http://localhost:5173';
    return { url: `${origin}/shared/${token}` };
  },

  async stopShareLink(planId: string): Promise<void> {
    await delay();
    ownPlan(planId, requireUser());
    state.shareTokens.delete(planId);
  },

  // ログインしていなくても見られる。作成者の id は返さない（BR-30）
  async getSharedPlan(token: string): Promise<PlanDetail | null> {
    await delay();
    const planId = [...state.shareTokens.entries()].find(([, t]) => t === token)?.[0];
    const plan = planId ? state.plans.find((p) => p.id === planId) : undefined;
    if (!plan) return null;
    const detail = toDetail(plan);
    return {
      ...detail,
      author: { id: '', displayName: detail.author.displayName },
      sourcePlan: null,
    };
  },
  // ---- （v11 第3段階）キャンペーンと特典（BR-27、BR-28） ----

  async checkCampaignEligibility(input: {
    spotId: number;
    lat: number;
    lng: number;
    accuracy: number;
  }): Promise<{ eligible: boolean; distanceM: number | null; campaign: Campaign | null }> {
    await delay();
    const user = requireUser();
    return eligibilityOf(user.id, input.spotId, input);
  },

  async getReward(rewardId: string): Promise<CampaignReward | null> {
    await delay();
    const user = requireUser();
    const r = state.rewards.find((x) => x.id === rewardId && x.userId === user.id);
    return r ? toReward(r) : null;
  },

  async useReward(rewardId: string): Promise<void> {
    await delay();
    const user = requireUser();
    const r = state.rewards.find((x) => x.id === rewardId && x.userId === user.id);
    if (!r || !isRewardValid(r)) throw new ApiError('CAMPAIGN_NOT_ELIGIBLE');
    r.usedAt = new Date().toISOString();
  },

  async saveCampaign(input: CampaignInput): Promise<{ id: string }> {
    await delay();
    const user = requireUser();
    const shop = state.shops.find((sh) => sh.ownerId === user.id && sh.status === 'active');
    if (!shop) throw new ApiError('FORBIDDEN');
    if (!validCampaign(input)) throw new ApiError('UNKNOWN', 'CAMPAIGN_INVALID');
    const fields = {
      title: input.title.trim(),
      benefit: input.benefit.trim(),
      notice: input.notice,
      description: input.description,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      imagePath: input.imagePath,
    };
    if (input.id === null) {
      if (state.campaigns.some((c) => c.shopId === shop.id && c.status === 'active')) {
        throw new ApiError('LIMIT_REACHED');
      }
      const id = newId('mock-campaign');
      state.campaigns.push({ id, shopId: shop.id, status: 'active', ...fields });
      return { id };
    }
    const c = state.campaigns.find((x) => x.id === input.id && x.shopId === shop.id);
    if (!c || c.status === 'stopped') throw new ApiError('FORBIDDEN');
    Object.assign(c, fields);
    return { id: c.id };
  },

  async endCampaign(campaignId: string): Promise<void> {
    await delay();
    const user = requireUser();
    const shop = state.shops.find((sh) => sh.ownerId === user.id && sh.status === 'active');
    const c = state.campaigns.find((x) => x.id === campaignId && x.shopId === shop?.id);
    if (!c || c.status === 'stopped') throw new ApiError('FORBIDDEN');
    c.status = 'ended';
  },

  async uploadCampaignImage(file: File): Promise<{ path: string; url: string }> {
    return mockApi.uploadPlanImage(file);
  },

  // ---- （v11 第3段階）お店の申請とお店（BR-26、BR-27） ----

  async getMyApplication(): Promise<ShopApplication | null> {
    await delay();
    const user = requireUser();
    const mine = state.applications
      .filter((a) => a.userId === user.id)
      .sort((a, b) => byTimeDesc(a.createdAt, b.createdAt));
    return mine[0] ? toApplication(mine[0]) : null;
  },

  async submitApplication(input: ApplicationInput): Promise<{ id: string }> {
    await delay();
    const user = requireUser();
    if (roleOf(user.id) !== 'user') throw new ApiError('FORBIDDEN');
    if (state.applications.some((a) => a.userId === user.id && a.status === 'pending')) {
      throw new ApiError('LIMIT_REACHED');
    }
    const spot = state.spots.find((x) => x.id === input.spotId && x.isActive);
    if (!spot) throw new ApiError('NOT_FOUND');
    if (state.shops.some((sh) => sh.spotId === spot.id)) throw new ApiError('LIMIT_REACHED');
    if (input.campaignDraft && !validCampaign(input.campaignDraft)) {
      throw new ApiError('UNKNOWN', 'CAMPAIGN_INVALID');
    }
    const id = newId('mock-application');
    state.applications.push({
      id,
      userId: user.id,
      spotId: spot.id,
      shopName: input.shopName.trim(),
      introduction: input.introduction.trim(),
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim(),
      contactPhone: input.contactPhone.trim(),
      campaignDraft: input.campaignDraft,
      status: 'pending',
      rejectReason: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    });
    return { id };
  },

  async getMyShop(): Promise<ShopDetail | null> {
    await delay();
    const user = requireUser();
    const shop = state.shops.find((sh) => sh.ownerId === user.id);
    return shop ? toShopDetail(shop, user.id) : null;
  },

  async updateShop(input: { name: string; introduction: string }): Promise<void> {
    await delay();
    const user = requireUser();
    const shop = state.shops.find((sh) => sh.ownerId === user.id);
    if (!shop) throw new ApiError('FORBIDDEN');
    const name = input.name.trim();
    if (name.length < 1 || name.length > 30 || input.introduction.length > 300) {
      throw new ApiError('UNKNOWN', 'SHOP_INVALID');
    }
    shop.name = name;
    shop.introduction = input.introduction.trim();
  },

  // ---- （v11 第3段階）管理者（BR-26、BR-29）。どの操作も記録する ----

  async getApplications(): Promise<ShopApplication[]> {
    await delay();
    requireAdmin();
    return [...state.applications]
      .sort(
        (a, b) =>
          Number(b.status === 'pending') - Number(a.status === 'pending') ||
          byTimeDesc(a.createdAt, b.createdAt),
      )
      .map(toApplication);
  },

  async getApplication(id: string): Promise<ShopApplication | null> {
    await delay();
    requireAdmin();
    const a = state.applications.find((x) => x.id === id);
    return a ? toApplication(a) : null;
  },

  async reviewApplication(input: { id: string; approve: boolean; reason?: string }): Promise<void> {
    await delay();
    const admin = requireAdmin();
    const a = state.applications.find((x) => x.id === input.id);
    if (!a) throw new ApiError('NOT_FOUND');
    if (a.status !== 'pending') throw new ApiError('FORBIDDEN');
    const reason = input.reason?.trim() ?? '';
    if (reason.length > 200) throw new ApiError('UNKNOWN', 'REASON_INVALID');
    const now = new Date().toISOString();
    if (input.approve) {
      if (state.shops.some((sh) => sh.spotId === a.spotId || sh.ownerId === a.userId)) {
        throw new ApiError('LIMIT_REACHED');
      }
      const shopId = newId('mock-shop');
      state.shops.push({
        id: shopId,
        spotId: a.spotId,
        ownerId: a.userId,
        name: a.shopName,
        introduction: a.introduction,
        status: 'active',
      });
      if (roleOf(a.userId) === 'user') state.roles.set(a.userId, 'official');
      if (a.campaignDraft) {
        const d = a.campaignDraft;
        state.campaigns.push({
          id: newId('mock-campaign'),
          shopId,
          status: 'active',
          title: d.title,
          benefit: d.benefit,
          notice: d.notice,
          description: d.description,
          startsOn: d.startsOn,
          endsOn: d.endsOn,
          imagePath: d.imagePath,
        });
      }
      Object.assign(a, { status: 'approved', reviewedAt: now, rejectReason: null });
      recordAdmin(admin.id, 'approve_application', a.id, reason);
    } else {
      if (reason === '') throw new ApiError('UNKNOWN', 'REASON_REQUIRED');
      Object.assign(a, { status: 'rejected', reviewedAt: now, rejectReason: reason });
      recordAdmin(admin.id, 'reject_application', a.id, reason);
    }
  },

  async getShops(): Promise<ShopDetail[]> {
    await delay();
    const admin = requireAdmin();
    return state.shops.map((sh) => toShopDetail(sh, admin.id));
  },

  async setShopStatus(
    shopId: string,
    status: 'active' | 'suspended',
    reason?: string,
  ): Promise<void> {
    await delay();
    const admin = requireAdmin();
    const shop = state.shops.find((sh) => sh.id === shopId);
    if (!shop) throw new ApiError('NOT_FOUND');
    shop.status = status;
    recordAdmin(admin.id, status === 'suspended' ? 'suspend_shop' : 'resume_shop', shopId, reason);
  },

  async setCampaignStatus(
    campaignId: string,
    status: 'active' | 'stopped',
    reason?: string,
  ): Promise<void> {
    await delay();
    const admin = requireAdmin();
    const c = state.campaigns.find((x) => x.id === campaignId);
    if (!c) throw new ApiError('NOT_FOUND');
    if (
      status === 'active' &&
      state.campaigns.some((x) => x.id !== c.id && x.shopId === c.shopId && x.status === 'active')
    ) {
      throw new ApiError('LIMIT_REACHED');
    }
    c.status = status;
    recordAdmin(
      admin.id,
      status === 'stopped' ? 'stop_campaign' : 'resume_campaign',
      campaignId,
      reason,
    );
  },

  async getAllSpotPosts({
    page,
  }: {
    page: number;
  }): Promise<{ items: SpotPost[]; hasMore: boolean }> {
    await delay();
    requireAdmin();
    const all = [...state.posts].sort((a, b) => byTimeDesc(a.createdAt, b.createdAt));
    const from = page * PAGE_SIZE;
    return {
      items: all.slice(from, from + PAGE_SIZE).map((p) => toPost(p)),
      hasMore: all.length > from + PAGE_SIZE,
    };
  },

  async setSpotPostHidden(postId: string, hidden: boolean, reason?: string): Promise<void> {
    await delay();
    const admin = requireAdmin();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) throw new ApiError('NOT_FOUND');
    post.isHidden = hidden;
    recordAdmin(admin.id, hidden ? 'hide_post' : 'show_post', postId, reason);
  },

  // スポットの使用中止だけ（BR-29。再開はない）
  async setSpotActive(spotId: number, active: boolean, reason?: string): Promise<void> {
    await delay();
    const admin = requireAdmin();
    if (active) throw new ApiError('FORBIDDEN');
    const spot = state.spots.find((x) => x.id === spotId);
    if (!spot) throw new ApiError('NOT_FOUND');
    spot.isActive = false;
    recordAdmin(admin.id, 'deactivate_spot', String(spotId), reason);
  },

  // テスト用：管理者の操作の記録
  adminActionsForTest(): StoredAdminAction[] {
    return state.adminActions.map((a) => ({ ...a }));
  },
};

function spotIdByOsmRef(osmRef: string): number | null {
  const found = Object.entries(state.osmRefs).find(([, ref]) => ref === osmRef);
  return found ? Number(found[0]) : null;
}
