// （v11 第3段階）キャンペーンの入力の確かめと状態（要件定義書 BR-27）
import type { Campaign, CampaignInput } from '@/types/models';

export const CAMPAIGN_LIMITS = {
  title: 30,
  benefit: 50,
  notice: 200,
  description: 500,
  maxDays: 90, // 終了日は開始日から90日以内（K46）
} as const;

export type CampaignField = 'title' | 'benefit' | 'notice' | 'description' | 'period';

const DAY = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

function charLength(s: string): number {
  return Array.from(s).length;
}

// 入力の誤りを、項目ごとの文言で返す（誤りがなければ空）
export function campaignIssues(input: CampaignInput): Partial<Record<CampaignField, string>> {
  const issues: Partial<Record<CampaignField, string>> = {};
  const title = charLength(input.title.trim());
  const benefit = charLength(input.benefit.trim());
  if (title < 1) issues.title = '題名を入れてください';
  else if (title > CAMPAIGN_LIMITS.title)
    issues.title = `題名は${CAMPAIGN_LIMITS.title}文字までです`;
  if (benefit < 1) issues.benefit = '特典の内容を入れてください';
  else if (benefit > CAMPAIGN_LIMITS.benefit)
    issues.benefit = `特典の内容は${CAMPAIGN_LIMITS.benefit}文字までです`;
  if (charLength(input.notice) > CAMPAIGN_LIMITS.notice)
    issues.notice = `お知らせ文は${CAMPAIGN_LIMITS.notice}文字までです`;
  if (charLength(input.description) > CAMPAIGN_LIMITS.description)
    issues.description = `説明は${CAMPAIGN_LIMITS.description}文字までです`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)) {
    issues.period = '開始日と終了日を入れてください';
  } else {
    const days = daysBetween(input.startsOn, input.endsOn);
    if (days < 0) issues.period = '終了日は開始日より後にしてください';
    else if (days > CAMPAIGN_LIMITS.maxDays)
      issues.period = `終了日は開始日から${CAMPAIGN_LIMITS.maxDays}日以内にしてください`;
  }
  return issues;
}

// 日本時間の今日（YYYY-MM-DD）
export function todayJst(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

// 日付に日数を足す（YYYY-MM-DD）
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export type CampaignPhase = 'scheduled' | 'running' | 'finished' | 'stopped';

export const CampaignPhaseLabels: Record<CampaignPhase, string> = {
  scheduled: '予定',
  running: '実施中',
  finished: '終了',
  stopped: '管理者が停止',
};

// S-20 のキャンペーンの状態：予定・実施中・終了・管理者が停止（6.6 S-20）
export function campaignPhase(c: Pick<Campaign, 'status' | 'startsOn' | 'endsOn'>, today: string) {
  if (c.status === 'stopped') return 'stopped' as const;
  if (c.status === 'ended' || c.endsOn < today) return 'finished' as const;
  if (c.startsOn > today) return 'scheduled' as const;
  return 'running' as const;
}

// 新しいキャンペーンの入力の初め（今日から30日）
export function emptyCampaignInput(today: string): CampaignInput {
  return {
    id: null,
    title: '',
    benefit: '',
    notice: '',
    description: '',
    imagePath: null,
    startsOn: today,
    endsOn: addDays(today, 30),
  };
}

export function campaignToInput(c: Campaign, imagePath: string | null): CampaignInput {
  return {
    id: c.id,
    title: c.title,
    benefit: c.benefit,
    notice: c.notice,
    description: c.description,
    imagePath,
    startsOn: c.startsOn,
    endsOn: c.endsOn,
  };
}

// ---- 位置の確認（BR-28） ----

export const ELIGIBLE_DISTANCE_M = 100; // お店から100m以内
export const MAX_ACCURACY_M = 100; // 位置の誤差（精度）100m以下

export type EligibilityView =
  | { kind: 'eligible' }
  | { kind: 'far'; distanceM: number }
  | { kind: 'inaccurate'; accuracyM: number }
  | { kind: 'already' }
  | { kind: 'noCampaign' };

// checkCampaignEligibility の結果を、S-17 で出す内容にする（6.4 S-17、BR-28）
export function toEligibilityView(
  result: { eligible: boolean; distanceM: number | null; campaign: unknown },
  accuracyM: number,
): EligibilityView {
  if (result.eligible) return { kind: 'eligible' };
  if (!result.campaign) return { kind: 'noCampaign' };
  if (result.distanceM !== null && result.distanceM > ELIGIBLE_DISTANCE_M) {
    return { kind: 'far', distanceM: result.distanceM };
  }
  if (accuracyM > MAX_ACCURACY_M) return { kind: 'inaccurate', accuracyM: Math.round(accuracyM) };
  // 近くて誤差も小さいのに対象でない：すでに特典を受けている（1人1キャンペーン1回）
  return { kind: 'already' };
}

// 特典は受け取った日のうち（日本時間の23:59まで）有効（BR-28）
export function isRewardExpired(expiresAt: string, now = new Date()): boolean {
  return now.getTime() > Date.parse(expiresAt);
}
