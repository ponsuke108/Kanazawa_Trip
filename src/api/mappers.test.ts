import { describe, expect, it } from 'vitest';
import {
  sortApplications,
  sortSpots,
  toBlocks,
  toListSummary,
  toSavePlanJson,
  toSharedPlan,
  toSpotFromSummary,
  toSummary,
  type SpotRow,
  type SpotSummaryRow,
} from '@/api/mappers';
import type { ShopApplication } from '@/types/models';
import { toApiError } from '@/api/errors';

const url = (p: string) => `https://example.supabase.co/storage/v1/object/public/plan-images/${p}`;
const spotRow = (id: number, area: string, sort = 0): SpotRow => ({
  id,
  name: `s${id}`,
  description: 'd',
  lat: 36.5,
  lng: 136.6,
  google_place_id: null,
  spot_type: 'minor',
  area,
  is_active: true,
  sort_order: sort,
  address: null,
  cover_image_path: null,
  created_at: '2026-11-04T00:00:00Z',
  created_by: null,
  is_demo: false,
  osm_ref: null,
  place_kind: null,
  source: 'curated',
});

const summaryRow = (id: number, area: string | null, sort = 0): SpotSummaryRow => ({
  id,
  name: `s${id}`,
  description: area ? 'd' : null,
  lat: 36.5,
  lng: 136.6,
  google_place_id: null,
  spot_type: 'minor',
  area,
  is_active: true,
  sort_order: sort,
  source: area ? 'curated' : 'user',
  address: null,
  place_kind: null,
  is_demo: false,
  post_count: 0,
  latest_image_path: null,
  on_map: false,
  active_campaign_id: null,
});

describe('mappers（10.1）', () => {
  it('スポットはエリア（9.6 の順）、sort_order、id の順。（v11）エリアが空のものは最後', () => {
    const rows = [
      summaryRow(100001, null),
      summaryRow(3, 'その他'),
      summaryRow(2, '兼六園周辺', 1),
      summaryRow(1, '兼六園周辺', 2),
      summaryRow(4, '金沢駅周辺'),
    ];
    expect(sortSpots(rows, url).map((s) => s.id)).toEqual([4, 2, 1, 3, 100001]);
  });

  it('（v11）spot_summaries：写真のパスを URL にし、キャンペーン中かを返す', () => {
    const spot = toSpotFromSummary(
      {
        ...summaryRow(8, '寺町・にし茶屋街周辺'),
        post_count: 2,
        latest_image_path: 'u/p.jpg',
        active_campaign_id: 'c1',
      },
      url,
    );
    expect(spot).toMatchObject({
      id: 8,
      postCount: 2,
      latestImageUrl: url('u/p.jpg'),
      hasActiveCampaign: true,
      source: 'curated',
    });
    const user = toSpotFromSummary(summaryRow(100001, null), url);
    expect(user).toMatchObject({
      area: null,
      source: 'user',
      latestImageUrl: null,
      hasActiveCampaign: false,
    });
  });

  it('（v11）リスト：スポットは入れた順、最初の3つの名前', () => {
    const list = toListSummary({
      id: 'l',
      name: 'リスト',
      updated_at: '2026-11-04T00:00:00Z',
      list_spots: [
        { spot_id: 5, added_at: '2026-11-03T00:00:00Z', spot: { name: '兼六園' } },
        { spot_id: 1, added_at: '2026-11-01T00:00:00Z', spot: { name: '金沢駅' } },
        { spot_id: 2, added_at: '2026-11-02T00:00:00Z', spot: { name: '近江町市場' } },
        { spot_id: 8, added_at: '2026-11-04T00:00:00Z', spot: { name: 'にし茶屋街' } },
      ],
    });
    expect(list.spotIds).toEqual([1, 2, 5, 8]);
    expect(list.firstSpotNames).toEqual(['金沢駅', '近江町市場', '兼六園']);
    expect(list.spotCount).toBe(4);
  });

  it('（v11）共有のプラン：作成者の id は空、ブロックは position の順', () => {
    const plan = toSharedPlan(
      {
        id: 'p',
        title: '共有',
        status: 'draft',
        published_at: null,
        updated_at: '2026-11-04T00:00:00Z',
        author_name: '太郎',
        like_count: 0,
        tags: [],
        blocks: [
          {
            id: 'b',
            position: 1,
            block_type: 'comment',
            transport_mode: null,
            body: 'メモ',
            image_path: null,
            spot: null,
          },
          {
            id: 'a',
            position: 0,
            block_type: 'spot',
            transport_mode: null,
            body: null,
            image_path: null,
            spot: {
              id: 1,
              name: '金沢駅',
              description: 'd',
              lat: 36.5,
              lng: 136.6,
              google_place_id: null,
              spot_type: 'hub',
              area: '金沢駅周辺',
              is_active: true,
              source: 'curated',
              address: null,
              place_kind: null,
              is_demo: false,
            },
          },
        ],
      },
      url,
    );
    expect(plan.author).toEqual({ id: '', displayName: '太郎' });
    expect(plan.blocks.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('ブロックは position の順で、写真のパスを URL にする', () => {
    const blocks = toBlocks(
      [
        {
          id: 'b',
          position: 1,
          block_type: 'comment',
          spot_id: null,
          transport_mode: null,
          body: 'メモ',
          image_path: null,
          spot: null,
        },
        {
          id: 'a',
          position: 0,
          block_type: 'spot',
          spot_id: 1,
          transport_mode: null,
          body: null,
          image_path: 'u/x.jpg',
          spot: spotRow(1, 'その他'),
        },
      ],
      url,
    );
    expect(blocks.map((b) => b.id)).toEqual(['a', 'b']);
    expect(blocks[0].type === 'spot' && blocks[0].imageUrl).toBe(url('u/x.jpg'));
  });

  it('要約の null を既定値にする', () => {
    const s = toSummary(
      {
        id: 'p',
        user_id: 'u',
        title: '',
        status: 'draft',
        source_plan_id: null,
        created_at: 't',
        updated_at: 't',
        published_at: null,
        author_name: '太郎',
        like_count: null,
        spot_count: 2,
        has_minor_spot: null,
        spot_names: null,
        tag_ids: null,
        cover_image_path: null,
      },
      url,
    );
    expect(s).toMatchObject({
      likeCount: 0,
      hasMinorSpot: false,
      spotNames: [],
      tagIds: [],
      coverImageUrl: null,
    });
  });

  it('save_plan の JSON は snake_case', () => {
    expect(
      toSavePlanJson({
        id: null,
        title: 't',
        status: 'draft',
        sourcePlanId: 'src',
        tagIds: [1],
        blocks: [
          { type: 'spot', spotId: 1, transportMode: null, imagePath: null },
          { type: 'comment', body: 'x' },
        ],
      }),
    ).toEqual({
      id: null,
      title: 't',
      status: 'draft',
      source_plan_id: 'src',
      tag_ids: [1],
      blocks: [
        { type: 'spot', spot_id: 1, transport_mode: null, image_path: null },
        { type: 'comment', body: 'x' },
      ],
    });
  });
});

describe('toApiError（10.2）', () => {
  it.each([
    [{ code: 'P0001', message: 'SPOTS_TOO_FEW' }, 'VALIDATION'],
    [{ code: 'P0001', message: 'FORBIDDEN' }, 'FORBIDDEN'],
    [{ code: 'P0001', message: 'UNAUTHORIZED' }, 'UNAUTHORIZED'],
    [{ code: '42501', message: 'new row violates row-level security policy' }, 'FORBIDDEN'],
    [{ code: 'PGRST301', message: 'JWT expired' }, 'UNAUTHORIZED'],
    [
      { code: 'invalid_credentials', message: 'Invalid login credentials' },
      'AUTH_INVALID_CREDENTIALS',
    ],
    [{ code: 'user_already_exists', message: 'User already registered' }, 'AUTH_EMAIL_TAKEN'],
    [{ code: 'email_exists', message: '' }, 'AUTH_EMAIL_TAKEN'],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'NETWORK'],
    [new TypeError('Failed to fetch'), 'NETWORK'],
    [{ code: 'XX000', message: 'boom' }, 'UNKNOWN'],
  ])('%o → %s', (input, code) => {
    expect(toApiError(input).code).toBe(code);
  });

  it('検証コードは ValidationIssue に変換する', () => {
    expect(toApiError({ code: 'P0001', message: 'TITLE_REQUIRED' }).issues).toEqual([
      { code: 'TITLE_REQUIRED', message: 'タイトルを入力してください', step: 'info' },
    ]);
  });
});

describe('sortApplications（6.6 S-21）', () => {
  const app = (id: string, status: 'pending' | 'approved' | 'rejected', createdAt: string) =>
    ({ id, status, createdAt }) as unknown as ShopApplication;
  it('審査中を古い順、その下に審査済みを新しい順', () => {
    const sorted = sortApplications([
      app('p2', 'pending', '2026-11-03'),
      app('r1', 'rejected', '2026-11-01'),
      app('p1', 'pending', '2026-11-02'),
      app('a2', 'approved', '2026-11-04'),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['p1', 'p2', 'a2', 'r1']);
  });
});
