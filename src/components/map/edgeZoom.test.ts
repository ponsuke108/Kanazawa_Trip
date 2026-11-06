import { describe, expect, it } from 'vitest';
import { EDGE_WIDTH_PX, isEdgeStart, PX_PER_ZOOM, zoomFromDrag } from '@/components/map/edgeZoom';

describe('isEdgeStart', () => {
  it('左右の端だけを受け付ける', () => {
    expect(isEdgeStart(EDGE_WIDTH_PX, 0, 375)).toBe(true);
    expect(isEdgeStart(EDGE_WIDTH_PX + 1, 0, 375)).toBe(false);
    expect(isEdgeStart(187, 0, 375)).toBe(false);
    expect(isEdgeStart(375 - EDGE_WIDTH_PX, 0, 375)).toBe(true);
    expect(isEdgeStart(375 - EDGE_WIDTH_PX - 1, 0, 375)).toBe(false);
  });

  it('地図の左の位置を差し引いて判定する', () => {
    expect(isEdgeStart(110, 100, 300)).toBe(true);
    expect(isEdgeStart(50 + 100, 100, 300)).toBe(false);
  });
});

describe('zoomFromDrag', () => {
  it('上へなぞると拡大、下へなぞると縮小', () => {
    expect(zoomFromDrag(13, 400, 400 - PX_PER_ZOOM)).toBe(14);
    expect(zoomFromDrag(13, 400, 400 + PX_PER_ZOOM)).toBe(12);
    expect(zoomFromDrag(13, 400, 400)).toBe(13);
  });
});
