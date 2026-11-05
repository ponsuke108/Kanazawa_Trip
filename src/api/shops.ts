// （v11 第3段階）お店の申請とお店（要件定義書 10.3、BR-26、BR-27）
import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { CAMPAIGN_COLUMNS } from '@/api/campaigns';
import {
  toApplication,
  toApplicationJson,
  toCampaign,
  type ApplicationRow,
  type CampaignRow,
} from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import { campaignImageUrlOf, currentUserId, maybeOne, one, rows } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { ApplicationInput, ShopApplication, ShopDetail } from '@/types/models';

export const APPLICATION_COLUMNS =
  'id, shop_name, introduction, contact_name, contact_email, contact_phone, campaign_draft, status, reject_reason, created_at, reviewed_at, spot:spots(id, name)';

export const SHOP_COLUMNS = `id, owner_id, name, introduction, status, spot:spots(id, name), campaigns(${CAMPAIGN_COLUMNS})`;

type ShopRow = {
  id: string;
  owner_id: string;
  name: string;
  introduction: string;
  status: string;
  spot: { id: number; name: string } | null;
  campaigns: CampaignRow[];
};

// 今のキャンペーン：active のもの。なければ管理者が止めたもの（お店にだけ「停止しました」と出すため）
export function toShopDetail(
  r: ShopRow,
  counts: { rewardCount: number; usedRewardCount: number },
): ShopDetail {
  const current =
    r.campaigns.find((c) => c.status === 'active') ??
    r.campaigns.find((c) => c.status === 'stopped') ??
    null;
  return {
    id: r.id,
    spot: { id: r.spot?.id ?? 0, name: r.spot?.name ?? '' },
    name: r.name,
    introduction: r.introduction,
    status: r.status === 'suspended' ? 'suspended' : 'active',
    campaign: current
      ? toCampaign({ ...current, shop: { name: r.name } }, campaignImageUrlOf)
      : null,
    ...counts,
  };
}

// 自分のいちばん新しい申請（S-11、S-19）
export async function getMyApplication(): Promise<ShopApplication | null> {
  if (USE_MOCK) return mockApi.getMyApplication();
  const userId = await currentUserId();
  const data = await rows(
    getSupabase()
      .from('shop_applications')
      .select(APPLICATION_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
  );
  const first = data[0];
  return first ? toApplication(first as unknown as ApplicationRow) : null;
}

// RPC submit_application（BR-26）
export async function submitApplication(input: ApplicationInput): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.submitApplication(input);
  const id = await one(
    getSupabase().rpc('submit_application', {
      p_input: toApplicationJson(input) as unknown as Json,
    }),
  );
  return { id };
}

// 自分のお店、今のキャンペーン、その特典の数と使用済みの数（S-20）
export async function getMyShop(): Promise<ShopDetail | null> {
  if (USE_MOCK) return mockApi.getMyShop();
  const userId = await currentUserId();
  const row = await maybeOne(
    getSupabase().from('shops').select(SHOP_COLUMNS).eq('owner_id', userId).maybeSingle(),
  );
  if (!row) return null;
  const shop = row as unknown as ShopRow;
  const detail = toShopDetail(shop, { rewardCount: 0, usedRewardCount: 0 });
  if (!detail.campaign) return detail;
  const rewards = await rows(
    getSupabase().from('campaign_rewards').select('used_at').eq('campaign_id', detail.campaign.id),
  );
  return {
    ...detail,
    rewardCount: rewards.length,
    usedRewardCount: rewards.filter((r) => r.used_at !== null).length,
  };
}

// お店の名前と紹介を変える（本人だけ。9.4）
export async function updateShop(input: { name: string; introduction: string }): Promise<void> {
  if (USE_MOCK) return mockApi.updateShop(input);
  const userId = await currentUserId();
  const data = await rows(
    getSupabase()
      .from('shops')
      .update({ name: input.name.trim(), introduction: input.introduction.trim() })
      .eq('owner_id', userId)
      .select('id'),
  );
  if (data.length === 0) throw new ApiError('FORBIDDEN');
}
