// アイコンと意味の対応（設計書 v3 9.2）
// 各画面はここからアイコンを使う。新しい対応を増やすときはこのファイルに追加する。
// 絵文字・他のアイコン集・自作SVGは使わない。
import {
  ArrowLeft,
  Bike,
  Bus,
  Camera,
  Car,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  CircleUser,
  Cloud,
  CloudRain,
  Coffee,
  Copy,
  EyeOff,
  FilePen,
  Footprints,
  Globe,
  GripVertical,
  Heart,
  House,
  ImagePlus,
  Landmark,
  Leaf,
  LogOut,
  MapPin,
  MessageSquareText,
  Mountain,
  Navigation,
  Pencil,
  Plus,
  Search,
  Send,
  Sun,
  Tag,
  Timer,
  Trash2,
  Trophy,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { TransportMode } from '../types/models';

// 下部タブ
export const TabIcons = {
  home: House,
  search: Search,
  create: CirclePlus,
  ranking: Trophy,
  mypage: CircleUser,
} satisfies Record<string, LucideIcon>;

// ブロック
export const BlockIcons = {
  spot: MapPin,
  comment: MessageSquareText,
  directions: Navigation, // 経路を見る（Googleマップ）
} satisfies Record<string, LucideIcon>;

// 移動手段
export const TransportIcons: Record<TransportMode, LucideIcon> = {
  walk: Footprints,
  bus: Bus,
  bicycle: Bike,
  car: Car,
};

export const TransportLabels: Record<TransportMode, string> = {
  walk: '徒歩',
  bus: 'バス',
  bicycle: '自転車',
  car: '車',
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

// 対応表にない slug が来たときは汎用のタグアイコンを返す
export function getTagIcon(slug: string): LucideIcon {
  return TAG_ICONS[slug] ?? Tag;
}

// 操作
export const ActionIcons = {
  like: Heart, // いいね済みは fill="currentColor" で塗りつぶす
  copy: Copy,
  edit: Pencil,
  delete: Trash2,
  dragHandle: GripVertical,
  moveUp: ChevronUp,
  moveDown: ChevronDown,
  add: Plus,
  addImage: ImagePlus,
  publish: Send,
  unpublish: EyeOff,
  back: ArrowLeft,
  close: X,
  logout: LogOut,
} satisfies Record<string, LucideIcon>;

// 状態のラベル
export const StatusIcons = {
  published: Globe,
  draft: FilePen,
} satisfies Record<string, LucideIcon>;
