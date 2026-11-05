import { describe, expect, it } from 'vitest';
import {
  addDays,
  campaignIssues,
  campaignPhase,
  emptyCampaignInput,
  isRewardExpired,
  toEligibilityView,
  todayJst,
} from '@/lib/campaign';

const base = emptyCampaignInput('2026-11-05');

describe('campaignIssues（BR-27）', () => {
  it('題名と特典の内容は必須', () => {
    const issues = campaignIssues(base);
    expect(issues.title).toBeDefined();
    expect(issues.benefit).toBeDefined();
  });

  it('正しい入力なら誤りなし', () => {
    expect(campaignIssues({ ...base, title: '投稿で割引', benefit: '100円引き' })).toEqual({});
  });

  it('期間は90日まで。91日は誤り。終了日が開始日より前も誤り', () => {
    const ok = { ...base, title: 't', benefit: 'b' };
    expect(campaignIssues({ ...ok, endsOn: addDays(ok.startsOn, 90) }).period).toBeUndefined();
    expect(campaignIssues({ ...ok, endsOn: addDays(ok.startsOn, 91) }).period).toBeDefined();
    expect(campaignIssues({ ...ok, endsOn: addDays(ok.startsOn, -1) }).period).toBeDefined();
  });

  it('文字数の上限（題名30、特典50、お知らせ200、説明500）', () => {
    const issues = campaignIssues({
      ...base,
      title: 'あ'.repeat(31),
      benefit: 'あ'.repeat(51),
      notice: 'あ'.repeat(201),
      description: 'あ'.repeat(501),
    });
    expect(Object.keys(issues).sort()).toEqual(['benefit', 'description', 'notice', 'title']);
  });
});

describe('campaignPhase（6.6 S-20）', () => {
  const c = { status: 'active' as const, startsOn: '2026-11-10', endsOn: '2026-11-20' };
  it('予定・実施中・終了・管理者が停止', () => {
    expect(campaignPhase(c, '2026-11-05')).toBe('scheduled');
    expect(campaignPhase(c, '2026-11-10')).toBe('running');
    expect(campaignPhase(c, '2026-11-20')).toBe('running');
    expect(campaignPhase(c, '2026-11-21')).toBe('finished');
    expect(campaignPhase({ ...c, status: 'ended' }, '2026-11-12')).toBe('finished');
    expect(campaignPhase({ ...c, status: 'stopped' }, '2026-11-12')).toBe('stopped');
  });
});

describe('todayJst', () => {
  it('日本時間の日付になる（UTC の前日の15時は翌日）', () => {
    expect(todayJst(new Date('2026-11-04T15:30:00Z'))).toBe('2026-11-05');
  });
});

describe('toEligibilityView（BR-28）', () => {
  const campaign = { id: 'c' };
  it('対象', () => {
    expect(toEligibilityView({ eligible: true, distanceM: 30, campaign }, 20)).toEqual({
      kind: 'eligible',
    });
  });
  it('100mより遠いと「離れている」と距離', () => {
    expect(toEligibilityView({ eligible: false, distanceM: 230, campaign }, 20)).toEqual({
      kind: 'far',
      distanceM: 230,
    });
  });
  it('誤差が100mより大きい', () => {
    expect(toEligibilityView({ eligible: false, distanceM: 40, campaign }, 150.4).kind).toBe(
      'inaccurate',
    );
  });
  it('近くて誤差も小さいのに対象でないのは、受け取り済み', () => {
    expect(toEligibilityView({ eligible: false, distanceM: 10, campaign }, 10).kind).toBe(
      'already',
    );
  });
  it('キャンペーンが終わっていた', () => {
    expect(toEligibilityView({ eligible: false, distanceM: 10, campaign: null }, 10).kind).toBe(
      'noCampaign',
    );
  });
});

describe('isRewardExpired（BR-28）', () => {
  it('受け取った日の 23:59:59（日本時間）を過ぎると切れる', () => {
    const expiresAt = '2026-11-05T23:59:59+09:00';
    expect(isRewardExpired(expiresAt, new Date('2026-11-05T23:59:00+09:00'))).toBe(false);
    expect(isRewardExpired(expiresAt, new Date('2026-11-06T00:00:01+09:00'))).toBe(true);
  });
});
