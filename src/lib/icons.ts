// アイコンと意味の対応（要件定義書 7.3）。各画面はここから使う。新しい対応もここに追加する
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CirclePlus,
  CircleUser,
  Cloud,
  CloudRain,
  Coffee,
  Compass,
  Copy,
  EllipsisVertical,
  EyeOff,
  FilePen,
  Footprints,
  Globe,
  GripVertical,
  Heart,
  Image,
  ImagePlus,
  Inbox,
  Landmark,
  Leaf,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageSquareText,
  Mountain,
  Navigation,
  Pencil,
  Plus,
  RotateCw,
  Save,
  Search,
  SearchX,
  Send,
  ShieldCheck,
  Snowflake,
  Store,
  Sun,
  Tag,
  Ticket,
  Timer,
  Trash2,
  Trophy,
  UserPlus,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { createElement, type ReactElement } from 'react';
import type { LucideProps } from 'lucide-react';
import type { PlanStatus, TransportMode } from '@/types/models';

export type { LucideIcon };

// 下部タブ（v11：地図・探す・作る・マイページ）
export const TabIcons = {
  map: MapIcon,
  search: Search,
  create: CirclePlus,
  mypage: CircleUser,
} satisfies Record<string, LucideIcon>;

// （v11）地図：地図で探す・現在地。ランキングを見る（S-01、S-02）
export const MapIcons = {
  map: MapIcon,
  locate: LocateFixed,
  ranking: Trophy,
} satisfies Record<string, LucideIcon>;

// ブロック
export const BlockIcons = {
  spot: MapPin,
  comment: MessageSquareText,
  directions: Navigation,
} satisfies Record<string, LucideIcon>;

// 移動手段
export const TransportIcons: Record<TransportMode, LucideIcon> = {
  walk: Footprints,
  bus: Bus,
  bicycle: Bike,
  car: Car,
};

// タグ（tags.slug と対応）
const TAG_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  scenery: Mountain,
  history: Landmark,
  photo: Camera,
  relaxed: Leaf,
  quick: Timer,
  budget: Wallet,
  cozy: Coffee,
  sunny: Sun,
  rainy: CloudRain,
  cloudy: Cloud,
};

// 対応表にない slug は汎用のタグアイコン
export function getTagIcon(slug: string): LucideIcon {
  return TAG_ICONS[slug] ?? Tag;
}

// タグのアイコンを描く（描画中にコンポーネントを決める書き方を避けるため、要素を返す）
export function renderTagIcon(slug: string, props: LucideProps): ReactElement {
  return createElement(getTagIcon(slug), props);
}

// プラン
export const PlanIcons = {
  hasMinorSpot: Compass,
} satisfies Record<string, LucideIcon>;

export const StatusIcons: Record<PlanStatus, LucideIcon> = {
  published: Globe,
  draft: FilePen,
};

// 操作
export const ActionIcons = {
  like: Heart, // いいね済みは塗りつぶす
  copy: Copy,
  edit: Pencil,
  delete: Trash2,
  dragHandle: GripVertical,
  moveUp: ChevronUp,
  moveDown: ChevronDown,
  add: Plus,
  addImage: ImagePlus,
  saveDraft: Save,
  next: ArrowRight,
  publish: Send,
  unpublish: EyeOff,
  menu: EllipsisVertical,
  back: ArrowLeft,
  close: X,
  login: LogIn,
  signup: UserPlus,
  logout: LogOut,
  search: Search,
  create: CirclePlus,
  mypage: CircleUser,
} satisfies Record<string, LucideIcon>;

// 状態
export const StateIcons = {
  loading: LoaderCircle,
  retry: RotateCw,
  alert: CircleAlert,
  noResults: SearchX,
  empty: Inbox,
  noImage: Image,
  trophy: Trophy,
  spot: MapPin,
  heart: Heart,
  snow: Snowflake, // S-11 の飾り（要件定義書 7.3、7.7）
} satisfies Record<string, LucideIcon>;

// （v11）お店・管理者（要件定義書 7.3）。キャンペーン中のお店のピンの札は campaign
export const ShopIcons = {
  shop: Store,
  admin: ShieldCheck,
  campaign: Ticket,
  approve: Check,
} satisfies Record<string, LucideIcon>;

// （v11）スポットの投稿（要件定義書 7.3）。ここに投稿・投稿なし
export const PostIcons = {
  post: Camera,
} satisfies Record<string, LucideIcon>;
