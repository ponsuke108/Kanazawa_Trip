import type { FeatureCollection, Point } from 'geojson';
import type { MapSpot } from '@/components/map/types';

// 写真の束（BR-24）の代表を決めるための数。写真のあるスポットを優先し、その中では id の大きい（新しい）もの
export const REP_PHOTO_WEIGHT = 10_000_000;

export type SpotFeatureProps = { id: number; rep: number };

export function repScore(spot: MapSpot): number {
  return (spot.latestImageUrl ? REP_PHOTO_WEIGHT : 0) + spot.id;
}

export function repSpotId(score: number): number {
  return score % REP_PHOTO_WEIGHT;
}

export function toFeatureCollection(spots: MapSpot[]): FeatureCollection<Point, SpotFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: spots.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { id: s.id, rep: repScore(s) },
    })),
  };
}
