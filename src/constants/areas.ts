// エリア一覧（要件定義書 9.6）。公式観光サイト「金沢旅物語」のエリア分けに合わせた順
export const AREAS = [
  '金沢駅周辺',
  '近江町市場周辺',
  '香林坊・長町武家屋敷跡周辺',
  '兼六園周辺',
  'ひがし茶屋街周辺',
  '寺町・にし茶屋街周辺',
  '金石・大野周辺',
  '湯涌温泉周辺',
  '森本周辺',
  'その他',
] as const;

export function areaIndex(area: string): number {
  const i = (AREAS as readonly string[]).indexOf(area);
  return i === -1 ? AREAS.length : i;
}
