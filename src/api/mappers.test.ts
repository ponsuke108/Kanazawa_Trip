import { describe, expect, it } from 'vitest';
import { sortSpots, toBlocks, toSavePlanJson, toSummary, type SpotRow } from '@/api/mappers';
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
});

describe('mappers（10.1）', () => {
  it('スポットはエリア（9.6 の順）、sort_order、id の順', () => {
    const rows = [
      spotRow(3, 'その他'),
      spotRow(2, '兼六園周辺', 1),
      spotRow(1, '兼六園周辺', 2),
      spotRow(4, '金沢駅周辺'),
    ];
    expect(sortSpots(rows).map((s) => s.id)).toEqual([4, 2, 1, 3]);
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
