import { describe, expect, it } from 'vitest';
import {
  filterPlaceCandidates,
  foundOnlyOutsideKanazawa,
  NOMINATIM_VIEWBOX,
  toPlaceKind,
  toShortAddress,
  type NominatimResult,
} from '@/lib/places';

function result(over: Partial<NominatimResult>): NominatimResult {
  return {
    osm_type: 'node',
    osm_id: 1,
    lat: '36.5621',
    lon: '136.6626',
    category: 'tourism',
    type: 'attraction',
    name: '兼六園',
    display_name: '兼六園, 兼六町, 金沢市, 石川県, 920-0936, 日本',
    ...over,
  };
}

describe('filterPlaceCandidates（9.8、BR-19）', () => {
  it('候補の形にする', () => {
    expect(filterPlaceCandidates([result({ osm_type: 'way', osm_id: 123 })])).toEqual([
      {
        osmRef: 'way/123',
        name: '兼六園',
        lat: 36.5621,
        lng: 136.6626,
        address: '石川県金沢市兼六町',
        placeKind: '観光名所',
        existingSpotId: null,
      },
    ]);
  });

  it('バス停（highway）とレンタサイクル（amenity/bicycle_rental）を除く', () => {
    const out = filterPlaceCandidates([
      result({ osm_id: 1, category: 'highway', type: 'bus_stop', name: '兼六園下' }),
      result({ osm_id: 2, category: 'amenity', type: 'bicycle_rental', name: 'まちのり 兼六園' }),
      result({ osm_id: 3, category: 'amenity', type: 'parking' }),
      result({ osm_id: 4, category: 'public_transport', type: 'platform' }),
      result({ osm_id: 5, category: 'railway', type: 'platform' }),
      result({ osm_id: 6, category: 'place', type: 'neighbourhood' }),
      result({ osm_id: 7, category: 'boundary', type: 'administrative' }),
      result({ osm_id: 8 }),
    ]);
    expect(out.map((c) => c.osmRef)).toEqual(['node/8']);
  });

  it('住所が金沢市でないものを除く（四角の範囲に入る野々市市など）', () => {
    const out = filterPlaceCandidates([
      result({
        osm_id: 1,
        name: '金沢工業大学',
        lat: '36.5309',
        lon: '136.6276',
        display_name: '金沢工業大学, 扇が丘, 野々市市, 石川県, 921-8501, 日本',
      }),
    ]);
    expect(out).toEqual([]);
  });

  it('範囲の外を除く', () => {
    const out = filterPlaceCandidates([
      result({ osm_id: 1, lat: '35.6812', lon: '139.7671', display_name: '金沢市, 東京' }),
    ]);
    expect(out).toEqual([]);
  });

  it('同じ場所は1つにし、最大10件にする', () => {
    const many = Array.from({ length: 15 }, (_, i) => result({ osm_id: i + 1 }));
    const out = filterPlaceCandidates([result({ osm_id: 1 }), ...many]);
    expect(out).toHaveLength(10);
    expect(new Set(out.map((c) => c.osmRef)).size).toBe(10);
  });

  it('名前がなければ display_name の最初を名前にする', () => {
    const out = filterPlaceCandidates([result({ name: '' })]);
    expect(out[0]?.name).toBe('兼六園');
  });
});

describe('種類の表示（9.8）', () => {
  it('表のとおり', () => {
    expect(toPlaceKind('tourism', 'attraction')).toBe('観光名所');
    expect(toPlaceKind('tourism', 'viewpoint')).toBe('観光名所');
    expect(toPlaceKind('tourism', 'museum')).toBe('博物館・美術館');
    expect(toPlaceKind('tourism', 'gallery')).toBe('博物館・美術館');
    expect(toPlaceKind('amenity', 'place_of_worship')).toBe('寺社');
    expect(toPlaceKind('amenity', 'cafe')).toBe('飲食店');
    expect(toPlaceKind('amenity', 'restaurant')).toBe('飲食店');
    expect(toPlaceKind('amenity', 'fast_food')).toBe('飲食店');
    expect(toPlaceKind('shop', 'confectionery')).toBe('お店');
    expect(toPlaceKind('leisure', 'park')).toBe('公園・庭園');
    expect(toPlaceKind('leisure', 'garden')).toBe('公園・庭園');
    expect(toPlaceKind('historic', 'castle')).toBe('史跡');
    expect(toPlaceKind('building', 'yes')).toBe('建物');
    expect(toPlaceKind('amenity', 'bank')).toBe('場所');
  });
});

describe('住所の短くし方（9.8）', () => {
  it('「日本」と郵便番号を除き、「石川県金沢市」から後ろにする', () => {
    expect(
      toShortAddress('近江町市場, 上近江町, 金沢市, 石川県, 920-0905, 日本', '近江町市場'),
    ).toBe('石川県金沢市上近江町');
  });

  it('100文字まで', () => {
    const long = `${'あ'.repeat(120)}, 金沢市, 石川県, 日本`;
    expect(toShortAddress(long, 'x')).toHaveLength(100);
  });
});

describe('Nominatim の範囲（handoff 8.3）', () => {
  it('viewbox は 西,北,東,南 の順で、lib/geo.ts と同じ数字', () => {
    expect(NOMINATIM_VIEWBOX).toBe('136.5,36.7,136.9,36.4');
  });
});

describe('金沢市の外だけ見つかったか（S-16）', () => {
  const outside = result({
    osm_id: 9,
    name: '金沢工業大学',
    display_name: '金沢工業大学, 扇が丘, 野々市市, 石川県, 921-8501, 日本',
  });

  it('金沢市の外の場所だけなら true', () => {
    expect(foundOnlyOutsideKanazawa([outside])).toBe(true);
  });

  it('金沢市の場所が1つでもあれば false', () => {
    expect(foundOnlyOutsideKanazawa([outside, result({ osm_id: 10 })])).toBe(false);
  });

  it('バス停だけ、または何もないなら false（見つからなかった扱い）', () => {
    expect(foundOnlyOutsideKanazawa([result({ category: 'highway', type: 'bus_stop' })])).toBe(
      false,
    );
    expect(foundOnlyOutsideKanazawa([])).toBe(false);
  });
});
