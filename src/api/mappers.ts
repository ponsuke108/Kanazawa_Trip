// データベースの snake_case と画面の camelCase の変換（要件定義書 10.1）
import { areaIndex } from '@/constants/areas';
import type { Database } from '@/types/database';
import type {
  ApplicationInput,
  Block,
  Campaign,
  CampaignInput,
  ListSummary,
  PlanDetail,
  PlanStatus,
  PlanSummary,
  SavePlanInput,
  SaveSpotPostInput,
  ShopApplication,
  Spot,
  SpotPost,
  SpotType,
  Tag,
  TransportMode,
} from '@/types/models';

type Tables = Database['public']['Tables'];
export type SpotRow = Tables['spots']['Row'];
export type TagRow = Tables['tags']['Row'];
export type SummaryRow = Database['public']['Views']['plan_summaries']['Row'];
export type SpotSummaryRow = Database['public']['Views']['spot_summaries']['Row'];
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

// spots の表の行（プランのブロックなど）。投稿の数と写真は spot_summaries にしかないので、空にする
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
    source: r.source === 'user' ? 'user' : 'curated',
    address: r.address,
    placeKind: r.place_kind,
    postCount: 0,
    latestImageUrl: null,
    hasActiveCampaign: false,
  };
}

// （v11）spot_summaries の行（地図、S-07、S-16 など。9.3）
export function toSpotFromSummary(r: SpotSummaryRow, imageUrlOf: ImageUrlOf): Spot {
  return {
    id: r.id ?? 0,
    name: r.name ?? '',
    description: r.description,
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    placeId: r.google_place_id,
    spotType: (r.spot_type ?? 'minor') as SpotType,
    area: r.area,
    isActive: r.is_active ?? false,
    source: r.source === 'user' ? 'user' : 'curated',
    address: r.address,
    placeKind: r.place_kind,
    postCount: r.post_count ?? 0,
    latestImageUrl: r.latest_image_path ? imageUrlOf(r.latest_image_path) : null,
    hasActiveCampaign: r.active_campaign_id !== null,
  };
}

// 10.3：エリア（9.6 の順。空は最後）、sort_order、id の順
export function sortSpots(rows: SpotSummaryRow[], imageUrlOf: ImageUrlOf): Spot[] {
  return [...rows]
    .sort(
      (a, b) =>
        areaIndex(a.area) - areaIndex(b.area) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        (a.id ?? 0) - (b.id ?? 0),
    )
    .map((r) => toSpotFromSummary(r, imageUrlOf));
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

// （v11）リスト（BR-18）。スポットは入れた順
export type ListRow = {
  id: string;
  name: string;
  updated_at: string;
  list_spots: Array<{ spot_id: number; added_at: string; spot: { name: string } | null }>;
};

export function toListSummary(r: ListRow): ListSummary {
  const spots = [...r.list_spots].sort(
    (a, b) => a.added_at.localeCompare(b.added_at) || a.spot_id - b.spot_id,
  );
  return {
    id: r.id,
    name: r.name,
    spotCount: spots.length,
    spotIds: spots.map((s) => s.spot_id),
    firstSpotNames: spots.slice(0, 3).map((s) => s.spot?.name ?? ''),
    updatedAt: r.updated_at,
  };
}

// （v11）スポットの投稿（BR-21）
export type SpotPostRow = {
  id: string;
  user_id: string;
  body: string;
  is_hidden: boolean;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
  spot: { id: number; name: string } | null;
  author: { display_name: string } | null;
  images: Array<{ image_path: string; position: number }>;
};

export function toSpotPost(
  r: SpotPostRow,
  imageUrlOf: ImageUrlOf,
  rewardId: string | null = null,
): SpotPost {
  return {
    id: r.id,
    spot: { id: r.spot?.id ?? 0, name: r.spot?.name ?? '' },
    author: { id: r.user_id, displayName: r.author?.display_name ?? '' },
    body: r.body,
    imageUrls: [...r.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => imageUrlOf(i.image_path)),
    isCampaign: r.campaign_id !== null, // 「キャンペーン参加」のラベル（BR-21、BR-28）
    isHidden: r.is_hidden,
    rewardId, // 本人の有効な特典（getMySpotPosts だけ）
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// save_spot_post に渡す JSON（10.9）
export function toSaveSpotPostJson(input: SaveSpotPostInput) {
  return {
    id: input.id,
    spot_id: input.spotId,
    body: input.body,
    image_paths: input.imagePaths,
    position: input.position,
  };
}

// （v11）get_shared_plan の結果（10.9、BR-30）。作成者の id は返らないので空にする
export type SharedPlanJson = {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  author_name: string;
  like_count: number;
  tags: TagRow[];
  blocks: Array<Omit<BlockRow, 'spot_id' | 'spot'> & { spot: SharedSpotJson | null }>;
};

type SharedSpotJson = Pick<
  SpotRow,
  | 'id'
  | 'name'
  | 'description'
  | 'lat'
  | 'lng'
  | 'google_place_id'
  | 'spot_type'
  | 'area'
  | 'is_active'
  | 'source'
  | 'address'
  | 'place_kind'
  | 'is_demo'
>;

export function toSharedPlan(j: SharedPlanJson, imageUrlOf: ImageUrlOf): PlanDetail {
  return {
    id: j.id,
    title: j.title,
    status: j.status as PlanStatus,
    author: { id: '', displayName: j.author_name },
    sourcePlan: null,
    tags: [...j.tags].sort((a, b) => a.id - b.id).map(toTag),
    likeCount: j.like_count,
    publishedAt: j.published_at,
    updatedAt: j.updated_at,
    blocks: toBlocks(
      j.blocks.map((b) => ({
        ...b,
        spot_id: b.spot?.id ?? null,
        spot: b.spot
          ? {
              ...b.spot,
              cover_image_path: null,
              created_at: '',
              created_by: null,
              osm_ref: null,
              sort_order: 0,
            }
          : null,
      })),
      imageUrlOf,
    ),
  };
}

// ---- （v11 第3段階）キャンペーン・特典・申請・お店（9.2、10.7） ----

export type CampaignRow = {
  id: string;
  shop_id: string;
  title: string;
  benefit: string;
  notice: string;
  description: string;
  image_path: string | null;
  starts_on: string;
  ends_on: string;
  status: string;
  shop: { name: string } | null;
};

export function toCampaign(r: CampaignRow, imageUrlOf: ImageUrlOf): Campaign {
  return {
    id: r.id,
    shopId: r.shop_id,
    shopName: r.shop?.name ?? '',
    title: r.title,
    benefit: r.benefit,
    notice: r.notice,
    description: r.description,
    imageUrl: r.image_path ? imageUrlOf(r.image_path) : null,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    status: r.status === 'ended' || r.status === 'stopped' ? r.status : 'active',
  };
}

// campaigns に書く列（saveCampaign、申請の campaign_draft）
export function toCampaignColumns(input: CampaignInput) {
  return {
    title: input.title.trim(),
    benefit: input.benefit.trim(),
    notice: input.notice,
    description: input.description,
    image_path: input.imagePath,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
  };
}

// 日本時間の日付（YYYY-MM-DD）。特典は受け取った日のうち有効（BR-28）
export function jstDateOf(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export function rewardExpiresAt(issuedAt: string): string {
  return `${jstDateOf(issuedAt)}T23:59:59+09:00`;
}

export function isRewardValid(r: { issued_at: string; used_at: string | null }, now = new Date()) {
  return r.used_at === null && jstDateOf(r.issued_at) === jstDateOf(now.toISOString());
}

type CampaignDraftJson = {
  title?: string;
  benefit?: string;
  notice?: string;
  description?: string;
  image_path?: string | null;
  starts_on?: string;
  ends_on?: string;
};

export type ApplicationRow = {
  id: string;
  shop_name: string;
  introduction: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  campaign_draft: unknown;
  status: string;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  spot: { id: number; name: string } | null;
};

export function toApplication(r: ApplicationRow): ShopApplication {
  const d = r.campaign_draft as CampaignDraftJson | null;
  return {
    id: r.id,
    spot: { id: r.spot?.id ?? 0, name: r.spot?.name ?? '' },
    shopName: r.shop_name,
    introduction: r.introduction,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    campaignDraft: d
      ? {
          id: null,
          title: d.title ?? '',
          benefit: d.benefit ?? '',
          notice: d.notice ?? '',
          description: d.description ?? '',
          imagePath: d.image_path ?? null,
          startsOn: d.starts_on ?? '',
          endsOn: d.ends_on ?? '',
        }
      : null,
    status: r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending',
    rejectReason: r.reject_reason,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  };
}

// submit_application に渡す JSON（10.9）
export function toApplicationJson(input: ApplicationInput) {
  return {
    spot_id: input.spotId,
    shop_name: input.shopName.trim(),
    introduction: input.introduction.trim(),
    contact_name: input.contactName.trim(),
    contact_email: input.contactEmail.trim(),
    contact_phone: input.contactPhone.trim(),
    campaign_draft: input.campaignDraft ? toCampaignColumns(input.campaignDraft) : null,
  };
}

// 審査中を古い順、その下に審査済みを新しい順（6.6 S-21）
export function sortApplications(list: ShopApplication[]): ShopApplication[] {
  const pending = list
    .filter((a) => a.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reviewed = list
    .filter((a) => a.status !== 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...pending, ...reviewed];
}
