import type { MapTargetPin } from '@/components/map/types';

// S-13 のシートの形（7.8）。スマホ・タブレットは下、PC は右に幅 400px
export const SIDE_SHEET_MEDIA = '(min-width: 1024px)';
const SIDE_SHEET_WIDTH_PX = 400;
// 下のシートのときは、地図の高さの 35% の位置に出す。シートが最大（60%）でも隠れず、ふつうの高さなら
// 見える範囲の中央に近い。シートの高さは写真の読み込みで変わるので、測らずに決める
const BOTTOM_SHEET_SHIFT_RATIO = 0.15;

// シートに隠れない範囲の中央が、地図の中央からどれだけずれているか（K69）。maplibre-gl の offset に渡す
export function visibleCenterOffset(height: number, sideSheet: boolean): [number, number] {
  if (sideSheet) return [-SIDE_SHEET_WIDTH_PX / 2, 0];
  return [0, -height * BOTTOM_SHEET_SHIFT_RATIO];
}

type Place = MapTargetPin & { id?: number };

// 写真のピンがない場所だけを指すピンにする（K69、BR-24）。写真のピンがあるスポットは、そのピンを使う
export function targetPinOf(
  selected: Place | null,
  candidate: Place | null,
  pinIds: ReadonlySet<number>,
): MapTargetPin | null {
  const place = selected ?? candidate;
  if (!place) return null;
  if (selected?.id !== undefined && pinIds.has(selected.id)) return null;
  return { lat: place.lat, lng: place.lng, name: place.name };
}
