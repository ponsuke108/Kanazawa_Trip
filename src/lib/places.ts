// （v11）場所の候補の扱い（要件定義書 9.8、BR-19）。Nominatim の結果を、画面に出す候補にする
import { isInKanazawa, KanazawaBounds } from '@/lib/geo';
import type { PlaceCandidate } from '@/types/models';

// Nominatim の検索結果（format=jsonv2、addressdetails=1）のうち、使う項目だけ
export type NominatimResult = {
  osm_type?: string; // 'node' | 'way' | 'relation'
  osm_id?: number;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
};

const MAX_CANDIDATES = 10; // BR-19：結果は最大10件
const MAX_ADDRESS = 100; // 9.2：住所は100文字まで
const KANAZAWA = '金沢市';

// Nominatim の viewbox（左,上,右,下 = 西,北,東,南）。範囲の数字は lib/geo.ts と同じものを使う（handoff 8.3）
export const NOMINATIM_VIEWBOX = [
  KanazawaBounds.west,
  KanazawaBounds.north,
  KanazawaBounds.east,
  KanazawaBounds.south,
].join(',');

// 9.8：観光の場所でない種類は候補に出さない
function isExcluded(category: string, type: string): boolean {
  if (['highway', 'public_transport', 'place', 'boundary'].includes(category)) return true;
  if (category === 'amenity' && ['bicycle_rental', 'parking', 'parking_entrance'].includes(type)) {
    return true;
  }
  return category === 'railway' && type === 'platform';
}

// 9.8：場所の種類の表示。主なものだけ日本語にし、それ以外は「場所」
export function toPlaceKind(category: string, type: string): string {
  if (category === 'tourism' && (type === 'attraction' || type === 'viewpoint')) return '観光名所';
  if (category === 'tourism' && (type === 'museum' || type === 'gallery')) return '博物館・美術館';
  if (category === 'amenity' && type === 'place_of_worship') return '寺社';
  if (category === 'amenity' && ['cafe', 'restaurant', 'fast_food'].includes(type)) return '飲食店';
  if (category === 'shop') return 'お店';
  if (category === 'leisure' && (type === 'park' || type === 'garden')) return '公園・庭園';
  if (category === 'historic') return '史跡';
  if (category === 'building') return '建物';
  return '場所';
}

// 9.8：display_name から「日本」と郵便番号を除き、「石川県金沢市」から後ろを100文字まで。
// Nominatim の日本の住所は「兼六園, 兼六町, 金沢市, 石川県, 920-0936, 日本」のように小さい順なので、逆にしてつなぐ
export function toShortAddress(displayName: string, name: string): string {
  const parts = displayName
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '' && p !== '日本' && !/^〒?\d{3}-?\d{4}$/.test(p));
  if (parts[0] === name) parts.shift(); // 先頭は場所の名前なので住所に入れない
  const joined = parts.reverse().join('');
  const start = joined.indexOf(`石川県${KANAZAWA}`);
  const from = start >= 0 ? start : Math.max(joined.indexOf(KANAZAWA), 0);
  return joined.slice(from, from + MAX_ADDRESS);
}

// 9.8、BR-19：除く種類と、金沢市でない場所を除き、画面に出す候補にする。同じ場所は1つにする
export function filterPlaceCandidates(results: NominatimResult[]): PlaceCandidate[] {
  const out: PlaceCandidate[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const category = r.category ?? '';
    const type = r.type ?? '';
    const displayName = r.display_name ?? '';
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!r.osm_type || r.osm_id === undefined) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (isExcluded(category, type)) continue;
    // 金沢市かどうかは住所の文字で判定する（address.city に入らないことがあるため。BR-19）
    if (!displayName.includes(KANAZAWA) || !isInKanazawa(lat, lng)) continue;
    const osmRef = `${r.osm_type}/${r.osm_id}`;
    if (seen.has(osmRef)) continue;
    const name = (r.name ?? '').trim() || (displayName.split(',')[0] ?? '').trim();
    if (name === '') continue;
    seen.add(osmRef);
    out.push({
      osmRef,
      name: name.slice(0, 50), // BR-20：名前は50文字まで
      lat,
      lng,
      address: toShortAddress(displayName, name),
      placeKind: toPlaceKind(category, type),
      existingSpotId: null,
    });
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}
