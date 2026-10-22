// データベースの snake_case と画面の camelCase の変換（要件定義書 10.1）
import { areaIndex } from '@/constants/areas';
import type { Database } from '@/types/database';
import type {
  Block,
  PlanStatus,
  PlanSummary,
  SavePlanInput,
  Spot,
  SpotType,
  Tag,
  TransportMode,
} from '@/types/models';

type Tables = Database['public']['Tables'];
export type SpotRow = Tables['spots']['Row'];
export type TagRow = Tables['tags']['Row'];
export type SummaryRow = Database['public']['Views']['plan_summaries']['Row'];
export type BlockRow = Pick<
  Tables['plan_blocks']['Row'],
  'id' | 'position' | 'block_type' | 'spot_id' | 'transport_mode' | 'body' | 'image_path'
> & { spot: SpotRow | null };

// 写真のパスを公開URLに変える関数（Storage）。テストでは差し替える
export type ImageUrlOf = (path: string) => string;

export function toTag(r: TagRow): Tag {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    group: r.tag_group === 'weather' ? 'weather' : 'theme',
  };
}

export function sortTags(rows: TagRow[]): Tag[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id).map(toTag);
}

export function toSpot(r: SpotRow): Spot {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    lat: r.lat,
    lng: r.lng,
    placeId: r.google_place_id,
    spotType: r.spot_type as SpotType,
    area: r.area,
    isActive: r.is_active,
  };
}

// 10.3：エリア（9.6 の順）、sort_order、id の順
export function sortSpots(rows: SpotRow[]): Spot[] {
  return [...rows]
    .sort(
      (a, b) => areaIndex(a.area) - areaIndex(b.area) || a.sort_order - b.sort_order || a.id - b.id,
    )
    .map(toSpot);
}

export function toSummary(r: SummaryRow, imageUrlOf: ImageUrlOf): PlanSummary {
  return {
    id: r.id ?? '',
    title: r.title ?? '',
    status: (r.status ?? 'draft') as PlanStatus,
    authorId: r.user_id ?? '',
    authorName: r.author_name ?? '',
    likeCount: r.like_count ?? 0,
    spotCount: r.spot_count ?? 0,
    spotNames: r.spot_names ?? [],
    tagIds: r.tag_ids ?? [],
    hasMinorSpot: r.has_minor_spot ?? false,
    coverImageUrl: r.cover_image_path ? imageUrlOf(r.cover_image_path) : null,
    publishedAt: r.published_at,
    updatedAt: r.updated_at ?? '',
  };
}

export function toBlocks(rows: BlockRow[], imageUrlOf: ImageUrlOf): Block[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .flatMap((r): Block[] => {
      if (r.block_type === 'spot' && r.spot) {
        return [
          {
            id: r.id,
            type: 'spot',
            spot: toSpot(r.spot),
            transportMode: (r.transport_mode as TransportMode | null) ?? null,
            imagePath: r.image_path,
            imageUrl: r.image_path ? imageUrlOf(r.image_path) : null,
          },
        ];
      }
      if (r.block_type === 'comment') return [{ id: r.id, type: 'comment', body: r.body ?? '' }];
      return [];
    });
}

// save_plan に渡す JSON（SavePlanInput を snake_case にしたもの、10.5）
export function toSavePlanJson(input: SavePlanInput) {
  return {
    id: input.id,
    title: input.title,
    status: input.status,
    source_plan_id: input.sourcePlanId,
    tag_ids: input.tagIds,
    blocks: input.blocks.map((b) =>
      b.type === 'spot'
        ? {
            type: 'spot',
            spot_id: b.spotId,
            transport_mode: b.transportMode,
            image_path: b.imagePath,
          }
        : { type: 'comment', body: b.body },
    ),
  };
}
