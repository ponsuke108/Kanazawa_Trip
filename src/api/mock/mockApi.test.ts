import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi, resetMockState } from '@/api/mock/mockApi';

// 要件定義書 9.7「このデータで確認できること」
describe('モックの並び順（9.7）', () => {
  beforeEach(() => {
    resetMockState();
    mockApi.signInAsTaro();
  });

  it('定番以外を含む（BR-02）：plan-1 と plan-4 は true、plan-2 は false（金沢駅は起点）', async () => {
    const all = await mockApi.searchPlans({ tagIds: [], page: 0 });
    const byId = Object.fromEntries(all.items.map((p) => [p.id, p.hasMinorSpot]));
    expect(byId).toEqual({ 'mock-plan-1': true, 'mock-plan-2': false, 'mock-plan-4': true });
  });

  it('検索（BR-01）：「写真」では、一致数が同じなら定番以外を含む plan-1 が plan-2 より先', async () => {
    const result = await mockApi.searchPlans({ tagIds: [4], page: 0 });
    expect(result.items.map((p) => p.id)).toEqual(['mock-plan-1', 'mock-plan-2']);
    expect(result.totalCount).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it('検索（BR-01）：一致したタグ数が多い順', async () => {
    // 歴史(3)・時短(6)：plan-4 は2つ一致、plan-1 は1つ一致
    const result = await mockApi.searchPlans({ tagIds: [3, 6], page: 0 });
    expect(result.items.map((p) => p.id)).toEqual(['mock-plan-4', 'mock-plan-1']);
  });

  it('検索（BR-01）：タグなしは公開中のプランをすべて出し、下書きは出さない', async () => {
    const result = await mockApi.searchPlans({ tagIds: [], page: 0 });
    expect(result.items.map((p) => p.id)).toEqual(['mock-plan-1', 'mock-plan-4', 'mock-plan-2']);
  });

  it('ランキング（BR-11）：総合は plan-2、plan-1、plan-4 の順', async () => {
    const items = await mockApi.getRanking({ type: 'overall', limit: 20 });
    expect(items.map((p) => p.id)).toEqual(['mock-plan-2', 'mock-plan-1', 'mock-plan-4']);
    expect(items.map((p) => p.likeCount)).toEqual([8, 5, 2]);
  });

  it('ランキング（BR-11）：定番以外は plan-1、plan-4 の順', async () => {
    const items = await mockApi.getRanking({ type: 'minor', limit: 20 });
    expect(items.map((p) => p.id)).toEqual(['mock-plan-1', 'mock-plan-4']);
  });

  it('下書きは本人のマイページにだけ出る', async () => {
    const mine = await mockApi.getMyPlans();
    expect(mine.map((p) => p.id)).toEqual(['mock-plan-3', 'mock-plan-2']);
  });

  it('いいねしたプランは plan-4、plan-1 の順（いいねした日時の新しい順）', async () => {
    const liked = await mockApi.getLikedPlans();
    expect(liked.map((p) => p.id)).toEqual(['mock-plan-4', 'mock-plan-1']);
  });

  it('コピー元の表示（BR-07）：plan-4 のコピー元はテスト太郎', async () => {
    const plan = await mockApi.getPlan('mock-plan-4');
    expect(plan?.sourcePlan).toEqual({ id: 'mock-plan-2', authorName: 'テスト太郎' });
  });

  it('自分のプランにはいいねできない（BR-08）', async () => {
    await expect(mockApi.likePlan('mock-plan-2')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('ログインしていなければ UNAUTHORIZED', async () => {
    await mockApi.signOut();
    await expect(mockApi.getTags()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('モックの保存（BR-06）', () => {
  beforeEach(() => {
    resetMockState();
    mockApi.signInAsTaro();
  });

  it('スポット1つでは公開できず、VALIDATION になる', async () => {
    await expect(
      mockApi.savePlan({
        id: null,
        title: 'テスト',
        status: 'published',
        sourcePlanId: null,
        tagIds: [1],
        blocks: [{ type: 'spot', spotId: 1, transportMode: null, imagePath: null }],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', issues: [{ code: 'SPOTS_TOO_FEW' }] });
  });

  it('下書きならスポット1つでも保存でき、本人のマイページに出る', async () => {
    const { id } = await mockApi.savePlan({
      id: null,
      title: '',
      status: 'draft',
      sourcePlanId: null,
      tagIds: [],
      blocks: [{ type: 'spot', spotId: 1, transportMode: null, imagePath: null }],
    });
    const mine = await mockApi.getMyPlans();
    expect(mine[0].id).toBe(id);
  });
});

// （v11）9.7 のモックの追加データと 11.6 のテスト
describe('（v11）モックのスポットの登録（BR-20）', () => {
  beforeEach(() => {
    resetMockState();
    mockApi.signInAsTaro();
  });

  it('同じ osm_ref で既存の id が返る', async () => {
    const [terminal] = await mockApi.searchPlaces('クルーズ');
    expect(terminal?.existingSpotId).toBe(100001);
    if (!terminal) throw new Error('候補がない');
    await expect(mockApi.registerSpot(terminal)).resolves.toEqual({ spotId: 100001, reused: true });
  });

  it('金沢市の外で OUT_OF_AREA になる', async () => {
    const [outside] = await mockApi.searchPlaces('白山比咩');
    if (!outside) throw new Error('候補がない');
    await expect(mockApi.registerSpot(outside)).rejects.toMatchObject({ code: 'OUT_OF_AREA' });
  });

  it('50m 以内の同じ名前なら既存のスポット（にし茶屋街、id 8）を使う', async () => {
    const [nishi] = await mockApi.searchPlaces('にし茶屋');
    expect(nishi?.existingSpotId).toBeNull();
    if (!nishi) throw new Error('候補がない');
    await expect(mockApi.registerSpot(nishi)).resolves.toEqual({ spotId: 8, reused: true });
  });

  it('新しい場所は 100003 から登録され、getSpots に出る（エリアが空なので最後）', async () => {
    const result = await mockApi.registerSpot({
      osmRef: 'node/123',
      name: '確認の甘味処',
      lat: 36.57,
      lng: 136.66,
      address: '石川県金沢市確認町',
      placeKind: '飲食店',
      existingSpotId: null,
    });
    expect(result).toEqual({ spotId: 100003, reused: false });
    const spots = await mockApi.getSpots();
    expect(spots.at(-1)).toMatchObject({
      id: 100003,
      source: 'user',
      area: null,
      spotType: 'minor',
    });
    // もう一度登録すると同じ id
    const again = await mockApi.searchPlaces('クルーズ');
    expect(again).toHaveLength(1);
  });

  it('デモ用のスポットと利用者のスポットが getSpots に入る（9.7）', async () => {
    const ids = (await mockApi.getSpots()).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([90001, 100001, 100002]));
  });
});

describe('（v11）モックのリスト・投稿・共有', () => {
  beforeEach(() => {
    resetMockState();
    mockApi.signInAsTaro();
  });

  it('テスト太郎のリストは2つ。同じスポットは2回入らない（BR-18）', async () => {
    const lists = await mockApi.getLists();
    expect(lists.map((l) => l.name)).toEqual(['冬の金沢 1日目', '雨の日']);
    expect(lists[0]?.firstSpotNames).toEqual(['金沢駅', '近江町市場', '鈴木大拙館']);
    await expect(mockApi.addSpotToList('mock-list-2', 13)).resolves.toEqual({ added: false });
    await expect(mockApi.addSpotToList('mock-list-2', 5)).resolves.toEqual({ added: true });
    const detail = await mockApi.getList('mock-list-2');
    expect(detail?.spots.map((s) => s.id)).toEqual([13, 12, 5]);
  });

  it('リストは1人20個まで（LIMIT_REACHED）', async () => {
    for (let i = 0; i < 18; i += 1) await mockApi.createList({ name: `リスト${i}` });
    await expect(mockApi.createList({ name: '21個目' })).rejects.toMatchObject({
      code: 'LIMIT_REACHED',
    });
  });

  it('投稿の数がスポットに入り、キャンペーン中のお店がわかる', async () => {
    const spots = await mockApi.getSpots();
    expect(spots.find((s) => s.id === 8)?.postCount).toBe(1);
    expect(spots.find((s) => s.id === 100001)?.postCount).toBe(1);
    const posts = await mockApi.getSpotPosts({ spotId: 8, page: 0 });
    expect(posts.items.map((p) => p.author.displayName)).toEqual(['テスト花子']);
    expect(await mockApi.getMySpotPosts()).toHaveLength(1);
  });

  it('共有リンクで、ログインしていなくてもプランが見られる（BR-30）', async () => {
    const { url } = await mockApi.createShareLink('mock-plan-2');
    const token = url.split('/shared/')[1] ?? '';
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    await mockApi.signOut();
    const plan = await mockApi.getSharedPlan(token);
    expect(plan?.id).toBe('mock-plan-2');
    expect(plan?.author.id).toBe('');
    mockApi.signInAsTaro();
    await mockApi.stopShareLink('mock-plan-2');
    expect(await mockApi.getSharedPlan(token)).toBeNull();
  });
});
