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
