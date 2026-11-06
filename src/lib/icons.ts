// アイコンと意味の対応（要件定義書 7.3）。各画面はここから使う。新しい対応もここに追加する
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bookmark,
  BookmarkPlus,
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
  Link2,
  Share2,
  EllipsisVertical,
  Eye,
  EyeOff,
  FilePen,
  Footprints,
  Globe,
  GripVertical,
  Heart,
  Image,
  Info,
  ImagePlus,
  Inbox,
  Landmark,
  Leaf,
  ListPlus,
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
  Route,
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
  showPassword: Eye, // S-12 のパスワードを見せる（7.3）
  hidePassword: EyeOff, // S-12 のパスワードを隠す
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
  snow: Snowflake, // S-11・S-12 の飾り（要件定義書 7.3、7.7）
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

// （v11）リスト（要件定義書 7.3）：リスト / リストに追加 / 新しいリスト・リストに保存
export const ListIcons = {
  list: Bookmark,
  add: BookmarkPlus,
  newList: ListPlus,
} satisfies Record<string, LucideIcon>;

// （v11）経路順の地図（要件定義書 7.3）：直線距離の説明 / 経路順を地図で見る
export const RouteIcons = {
  info: Info,
  route: Route,
} satisfies Record<string, LucideIcon>;

// （v11）プランの共有（要件定義書 6.4 S-04、BR-30）：共有 / リンクをコピー
export const ShareIcons = {
  share: Share2,
  link: Link2,
} satisfies Record<string, LucideIcon>;
