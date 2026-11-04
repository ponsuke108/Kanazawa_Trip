// （v11）場所の検索（要件定義書 BR-19、9.8）。Nominatim を呼ぶのはこのファイルの searchPlaces だけ
import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { mockApi } from '@/api/mock/mockApi';
import { rows } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import {
  filterPlaceCandidates,
  foundOnlyOutsideKanazawa,
  NOMINATIM_VIEWBOX,
  type NominatimResult,
} from '@/lib/places';
import type { PlaceCandidate } from '@/types/models';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1000; // 利用条件：1秒に1回まで（BR-19）

// 運営者が止められるようにする（BR-19）。'false' のときだけ止める
export function isPlaceSearchEnabled(): boolean {
  return import.meta.env.VITE_PLACE_SEARCH_ENABLED !== 'false';
}

// 前の呼び出しから1秒たつまで待つ。続けて呼ばれても順に1回ずつ（handoff 8.3）
let queue: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function waitTurn(): Promise<void> {
  const turn = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
  });
  queue = turn.catch(() => undefined);
  return turn;
}

// スポット名で OpenStreetMap の場所を探す（BR-19）。検索ボタンを押したときだけ呼ぶ。
// 入力しながらの候補表示には使わない。同じ言葉の結果は画面側で TanStack Query が覚えておく（['places', query]）。
// 結果の osm_ref がすでに spots にあれば existingSpotId を入れて返す。
// 金沢市の外の場所だけ見つかったときは OUT_OF_AREA
export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  if (!isPlaceSearchEnabled()) throw new ApiError('PLACE_SEARCH_DISABLED');
  if (USE_MOCK) return mockApi.searchPlaces(query);
  const q = query.trim();
  if (q === '') return [];

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'ja',
    limit: '10',
    viewbox: NOMINATIM_VIEWBOX,
    bounded: '1',
  });
  await waitTurn();
  let results: NominatimResult[];
  try {
    // ブラウザが送る Referer（サイトの URL）で名乗る。Referer を消す設定はしない（BR-19）
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new ApiError('PLACE_SEARCH_FAILED', `Nominatim ${res.status}`);
    results = (await res.json()) as NominatimResult[];
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('PLACE_SEARCH_FAILED', e instanceof Error ? e.message : '');
  }
  if (!Array.isArray(results)) throw new ApiError('PLACE_SEARCH_FAILED', '結果の形が違います');

  const candidates = filterPlaceCandidates(results);
  if (candidates.length === 0) {
    // 金沢市の外の場所だけ見つかったときは、そう伝える（S-16）
    if (foundOnlyOutsideKanazawa(results)) throw new ApiError('OUT_OF_AREA', 'OUT_OF_AREA');
    return [];
  }
  const existing = await rows(
    getSupabase()
      .from('spots')
      .select('id, osm_ref')
      .in(
        'osm_ref',
        candidates.map((c) => c.osmRef),
      ),
  );
  const idByRef = new Map(existing.map((r) => [r.osm_ref, r.id]));
  return candidates.map((c) => ({ ...c, existingSpotId: idByRef.get(c.osmRef) ?? null }));
}
