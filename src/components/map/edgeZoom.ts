// （K66）スマホの地図：左右の画面の端を縦になぞって拡大・縮小する。上へなぞると拡大、下へなぞると縮小
export const EDGE_WIDTH_PX = 28; // 指の出だしをこの幅の中で受け付ける
export const PX_PER_ZOOM = 80; // 80px なぞるとズームが1段変わる
export const TAP_SLOP_PX = 8; // これより動かなければタップとして扱う
export const MOBILE_MEDIA = '(max-width: 767px)'; // スマホの幅（7.8）

// 地図の左右の端から始まったか
export function isEdgeStart(x: number, left: number, width: number): boolean {
  return x - left <= EDGE_WIDTH_PX || left + width - x <= EDGE_WIDTH_PX;
}

// なぞり始めのズームと、始めの位置からの縦の動きから、今のズームを求める。y は下へ増える
export function zoomFromDrag(startZoom: number, startY: number, y: number): number {
  return startZoom + (startY - y) / PX_PER_ZOOM;
}
