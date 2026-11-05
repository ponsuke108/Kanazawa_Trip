import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { sortSpots, toSpotFromSummary } from '@/api/mappers';
import { fetchCampaign } from '@/api/campaigns';
import { mockApi } from '@/api/mock/mockApi';
import { maybeOne, one, rows, spotImageUrlOf } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { PlaceCandidate, Spot, SpotDetail } from '@/types/models';

// 使用中のスポットを spot_summaries からエリア、sort_order、id の順に全件取得（10.3、BR-17）。
// （v11）利用者のスポットも含む。エリアが空のものは最後
export async function getSpots(): Promise<Spot[]> {
  if (USE_MOCK) return mockApi.getSpots();
  return sortSpots(
    await rows(getSupabase().from('spot_summaries').select('*').eq('is_active', true)),
    spotImageUrlOf,
  );
}

// （v11）スポット詳細（S-05、S-17）。使用中止のスポットも返す。見つからなければ null。
// キャンペーン中なら、そのキャンペーンとお店の名前も返す（BR-27）
export async function getSpot(spotId: number): Promise<SpotDetail | null> {
  if (USE_MOCK) return mockApi.getSpot(spotId);
  if (!Number.isInteger(spotId) || spotId <= 0) return null;
  const row = await maybeOne(
    getSupabase().from('spot_summaries').select('*').eq('id', spotId).maybeSingle(),
  );
  if (!row) return null;
  const [campaign, shop] = await Promise.all([
    row.active_campaign_id ? fetchCampaign(row.active_campaign_id) : Promise.resolve(null),
    maybeOne(
      getSupabase()
        .from('shops')
        .select('name')
        .eq('spot_id', spotId)
        .eq('status', 'active')
        .maybeSingle(),
    ),
  ]);
  return {
    ...toSpotFromSummary(row, spotImageUrlOf),
    campaign,
    shopName: shop?.name ?? null,
  };
}

// （v11）場所の候補をスポットとして登録する（RPC register_spot、BR-20）。
// 同じ場所がすでにあれば、その id を reused: true で返す。金沢市の外は OUT_OF_AREA
export async function registerSpot(
  candidate: PlaceCandidate,
): Promise<{ spotId: number; reused: boolean }> {
  if (USE_MOCK) return mockApi.registerSpot(candidate);
  const result = await one(
    getSupabase().rpc('register_spot', {
      p_candidate: {
        osm_ref: candidate.osmRef,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        address: candidate.address,
        place_kind: candidate.placeKind,
      },
    }),
  );
  const first = result[0];
  if (!first) throw new ApiError('UNKNOWN', 'register_spot の結果が空です');
  return { spotId: first.spot_id, reused: first.reused };
}
