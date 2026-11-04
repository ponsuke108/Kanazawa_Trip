import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Supabase は呼ばずに、登録済みのスポットはないことにする
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
    }),
  }),
}));

const kenrokuen = {
  osm_type: 'way',
  osm_id: 1,
  lat: '36.5621',
  lon: '136.6626',
  category: 'leisure',
  type: 'garden',
  name: '兼六園',
  display_name: '兼六園, 兼六町, 金沢市, 石川県, 920-0936, 日本',
};

describe('searchPlaces（BR-19）', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    // 本物の searchPlaces を確かめる（.env.local でモックにしていても）
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('続けて呼んでも、Nominatim は1秒に1回まで（順に1回ずつ）', async () => {
    const times: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        times.push(Date.now());
        return new Response(JSON.stringify([kenrokuen]), { status: 200 });
      }),
    );
    const { searchPlaces } = await import('@/api/places');
    const all = Promise.all([searchPlaces('兼六園'), searchPlaces('兼六'), searchPlaces('園')]);
    await vi.advanceTimersByTimeAsync(3000);
    const results = await all;
    expect(results[0]?.[0]?.name).toBe('兼六園');
    expect(times).toHaveLength(3);
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBeGreaterThanOrEqual(1000);
    expect((times[2] ?? 0) - (times[1] ?? 0)).toBeGreaterThanOrEqual(1000);
  });

  it('決まった問い合わせ（jsonv2、ja、limit=10、viewbox、bounded）で呼ぶ', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { searchPlaces } = await import('@/api/places');
    await expect(searchPlaces(' にし茶屋街 ')).resolves.toEqual([]);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0 as never]));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'にし茶屋街',
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': 'ja',
      limit: '10',
      viewbox: '136.5,36.7,136.9,36.4',
      bounded: '1',
    });
  });

  it('429 などは PLACE_SEARCH_FAILED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 429 })),
    );
    const { searchPlaces } = await import('@/api/places');
    await expect(searchPlaces('兼六園')).rejects.toMatchObject({ code: 'PLACE_SEARCH_FAILED' });
  });

  it('金沢市の外だけ見つかったら OUT_OF_AREA', async () => {
    const outside = {
      ...kenrokuen,
      name: '金沢工業大学',
      lat: '36.5309',
      lon: '136.6276',
      category: 'amenity',
      type: 'university',
      display_name: '金沢工業大学, 扇が丘, 野々市市, 石川県, 921-8501, 日本',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([outside]), { status: 200 })),
    );
    const { searchPlaces } = await import('@/api/places');
    await expect(searchPlaces('金沢工業大学')).rejects.toMatchObject({ code: 'OUT_OF_AREA' });
  });

  it('VITE_PLACE_SEARCH_ENABLED=false なら呼ばずに PLACE_SEARCH_DISABLED', async () => {
    vi.stubEnv('VITE_PLACE_SEARCH_ENABLED', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { searchPlaces } = await import('@/api/places');
    await expect(searchPlaces('兼六園')).rejects.toMatchObject({ code: 'PLACE_SEARCH_DISABLED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
