import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getLists } from '@/api/lists';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getSpot, getSpots } from '@/api/spots';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useToast } from '@/components/common/useToast';
import { LazyMapView } from '@/components/map/LazyMapView';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import type { MapSpot } from '@/components/map/types';
import { AREAS, areaIndex } from '@/constants/areas';
import { UiMessages } from '@/constants/messages';
import { isDemoSpot } from '@/constants/spots';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ListIcons, ShopIcons } from '@/lib/icons';
import type { ListSummary, Spot, SpotOrCandidate } from '@/types/models';
import styles from './SpotPicker.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
  disabledSpotId: number | null; // 直前のスポット（BR-03）
  initialListId?: string | null; // リストから作ったプランでは、そのリストを選んだ状態から始める
};

type Tab = 'all' | 'list';
type View = 'list' | 'map';

const ALL = 'all';
const OTHER_AREA = 'その他'; // エリアのない利用者のスポット
const MAP_HEIGHT = '100%';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'list', label: 'リスト' },
];
const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'list', label: '一覧' },
  { value: 'map', label: '地図' },
];

// 「冬の金沢 1日目」「冬の金沢 1日目 ほか1件」（6.4 S-07）
function savedLabel(names: string[]): string {
  if (names.length === 0) return '';
  return names.length === 1 ? (names[0] ?? '') : `${names[0] ?? ''} ほか${names.length - 1}件`;
}

// S-07 スポット選択（6.4、BR-03、BR-18、K31、K56）。S-06 の上に画面いっぱいに出す。
// 「すべて」「リスト」のタブ、一覧と地図の切り替え。すべて読み込んでから画面の中で絞り込む
export function SpotPicker({ open, ...rest }: Props) {
  if (!open) return null;
  return createPortal(<SpotPickerBody {...rest} />, document.body);
}

function SpotPickerBody({
  onClose,
  onSelect,
  disabledSpotId,
  initialListId = null,
}: Omit<Props, 'open'>) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const resolve = useResolveSpot();
  const [tab, setTab] = useState<Tab>(initialListId ? 'list' : 'all');
  const [listId, setListId] = useState<string>(initialListId ?? ALL);
  const [view, setView] = useState<View>('list');
  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState<string>(ALL);
  const [minorOnly, setMinorOnly] = useState(false);
  const [pinSpot, setPinSpot] = useState<Spot | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const spots = useQuery({
    queryKey: queryKeys.spots,
    queryFn: getSpots,
    staleTime: STALE_TIME.never,
  });
  const lists = useQuery({ queryKey: queryKeys.lists.all, queryFn: getLists });
  // 1つのリストを選んだときは、使用中止のスポットも含めて読む（「使用中止」として押せない形で出す）
  const oneList = useQuery({
    queryKey: queryKeys.lists.detail(listId),
    queryFn: () => getList(listId),
    enabled: tab === 'list' && listId !== ALL,
  });

  // Esc で閉じる。後ろの画面はスクロールさせない
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // スポットの id → 保存しているリストの名前
  const savedIn = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const l of lists.data ?? []) {
      for (const id of l.spotIds) map.set(id, [...(map.get(id) ?? []), l.name]);
    }
    return map;
  }, [lists.data]);

  // タブとリストのチップで、対象のスポットを決める（使用中止は「すべて」には出さない）
  const base = useMemo((): Spot[] => {
    const active = (spots.data ?? []).filter((s) => s.isActive);
    if (tab === 'all') return active;
    if (listId === ALL) return active.filter((s) => savedIn.has(s.id));
    return oneList.data?.spots ?? [];
  }, [spots.data, tab, listId, savedIn, oneList.data]);

  const filtered = useMemo(() => {
    const k = keyword.trim();
    return base.filter(
      (s) =>
        (k === '' || s.name.includes(k)) &&
        (area === ALL || (s.area ?? OTHER_AREA) === area) &&
        (!minorOnly || s.spotType === 'minor'),
    );
  }, [base, keyword, area, minorOnly]);

  // 「すべて」はエリアごと（エリアのない利用者のスポットは「その他」）、「リスト」は入れた順のまま
  const groups = useMemo((): Array<[string, Spot[]]> => {
    if (tab === 'list') return [['', filtered]];
    const map = new Map<string, Spot[]>();
    for (const s of filtered) {
      const key = s.area ?? OTHER_AREA;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].sort((a, b) => areaIndex(a[0]) - areaIndex(b[0]));
  }, [filtered, tab]);

  // 地図：写真がなくても色の丸で出し、リストに保存したスポットを強調する（handoff 8.2、6.4 S-07）
  const mapSpots = useMemo(
    (): MapSpot[] =>
      filtered.filter((s) => s.isActive).map((s) => ({ ...s, highlighted: savedIn.has(s.id) })),
    [filtered, savedIn],
  );

  const pick = (spot: Spot) => {
    if (spot.id === disabledSpotId || !spot.isActive) return;
    onSelect(spot);
  };

  // S-16 で選んだ候補は、その場でスポットとして登録してから加える（BR-20）
  const pickFromSearch = async (r: SpotOrCandidate) => {
    setSearchOpen(false);
    try {
      const { spotId } = await resolve.mutateAsync(r);
      const spot = r.kind === 'spot' ? r.spot : await getSpot(spotId);
      if (!spot) return;
      if (spot.id === disabledSpotId) {
        toast.show({ type: 'error', message: UiMessages.sameSpotAdjacent });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.spots });
      onSelect(spot);
    } catch (err) {
      toast.show({ type: 'error', message: errorMessage(err) });
    }
  };

  const loading =
    spots.isPending || lists.isPending || (tab === 'list' && listId !== ALL && oneList.isPending);
  const error = spots.error ?? lists.error ?? oneList.error;
  const noSaved = tab === 'list' && listId === ALL && base.length === 0;

  const listPanel = loading ? (
    <PlanCardSkeletonList count={4} />
  ) : error ? (
    <ErrorState
      message={errorMessage(error)}
      onRetry={() => {
        void spots.refetch();
        void lists.refetch();
      }}
    />
  ) : noSaved ? (
    <div className={styles.emptyBox}>
      <ListIcons.list size={28} aria-hidden="true" />
      <p>リストに保存したスポットはありません</p>
    </div>
  ) : filtered.length === 0 ? (
    <p className={styles.empty}>条件に合うスポットがありません</p>
  ) : (
    groups.map(([areaName, items]) => (
      <section key={areaName || 'list'} className={styles.group}>
        {areaName && <h3 className={styles.areaHeading}>{areaName}</h3>}
        <ul className={styles.list}>
          {items.map((s) => (
            <li key={s.id}>
              <SpotRow
                spot={s}
                saved={savedIn.get(s.id) ?? []}
                highlight={tab === 'all'}
                disabled={s.id === disabledSpotId || !s.isActive}
                sameAsPrevious={s.id === disabledSpotId}
                onClick={() => pick(s)}
              />
            </li>
          ))}
        </ul>
      </section>
    ))
  );

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="スポットを追加">
        <header className={styles.header}>
          <h2 className={styles.title}>スポットを追加</h2>
          <div className={styles.viewToggle}>
            <SegmentedControl options={VIEWS} value={view} onChange={setView} label="見え方" />
          </div>
          <IconButton icon={ActionIcons.close} label="閉じる" onClick={onClose} />
        </header>

        <div className={styles.filters}>
          <div className={styles.tabs}>
            <SegmentedControl options={TABS} value={tab} onChange={setTab} label="スポットの範囲" />
          </div>
          {tab === 'list' && (
            <ListChips lists={lists.data ?? []} value={listId} onChange={setListId} />
          )}
          <input
            type="search"
            className={styles.search}
            placeholder="スポット名で絞り込み"
            aria-label="スポット名で絞り込み"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className={styles.row}>
            <select
              className={styles.select}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="エリア"
            >
              <option value={ALL}>すべてのエリア</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={minorOnly}
                onChange={(e) => setMinorOnly(e.target.checked)}
              />
              定番以外だけ
            </label>
          </div>
        </div>

        {/* スマホ・タブレットは一覧と地図を切り替える。PC は左に一覧、右に地図（7.8） */}
        <div className={`${styles.content} ${view === 'map' ? styles.showMap : styles.showList}`}>
          <div className={styles.listPane}>
            {listPanel}
            <div className={styles.searchMore}>
              <Button
                variant="secondary"
                icon={ActionIcons.search}
                fullWidth
                loading={resolve.isPending}
                onClick={() => setSearchOpen(true)}
              >
                見つからない場所を探す
              </Button>
            </div>
          </div>
          <div className={styles.mapPane}>
            <LazyMapView
              spots={mapSpots}
              selectedSpotId={pinSpot?.id ?? null}
              onSelectSpot={(id) => setPinSpot(filtered.find((s) => s.id === id) ?? null)}
              fitToSpots={tab === 'list'}
              height={MAP_HEIGHT}
            />
            {pinSpot && (
              <div className={styles.pinSheet}>
                <div className={styles.pinHead}>
                  <p className={styles.pinName}>{pinSpot.name}</p>
                  <IconButton
                    icon={ActionIcons.close}
                    label="閉じる"
                    onClick={() => setPinSpot(null)}
                  />
                </div>
                {savedIn.has(pinSpot.id) && (
                  <p className={styles.saved}>
                    <ListIcons.list size={14} aria-hidden="true" />
                    {savedLabel(savedIn.get(pinSpot.id) ?? [])}
                  </p>
                )}
                {pinSpot.id === disabledSpotId ? (
                  <p className={styles.note}>{UiMessages.sameSpotAdjacent}</p>
                ) : (
                  <Button icon={ActionIcons.add} onClick={() => pick(pinSpot)}>
                    追加する
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <PlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(r) => void pickFromSearch(r)}
      />
    </div>
  );
}

// 「すべてのリスト」と各リストの名前のチップ
function ListChips({
  lists,
  value,
  onChange,
}: {
  lists: ListSummary[];
  value: string;
  onChange: (id: string) => void;
}) {
  const items = [{ id: ALL, name: 'すべてのリスト' }, ...lists];
  return (
    <div className={styles.chips} role="group" aria-label="リスト">
      {items.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`${styles.chip} ${value === l.id ? styles.chipOn : ''}`}
          aria-pressed={value === l.id}
          onClick={() => onChange(l.id)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}

type RowProps = {
  spot: Spot;
  saved: string[];
  highlight: boolean; // 「すべて」タブでは、保存したスポットの行の背景を変える
  disabled: boolean;
  sameAsPrevious: boolean;
  onClick: () => void;
};

// 一覧の行：写真（小さな丸）、スポット名、ラベル、紹介文か住所、保存しているリスト（6.4 S-07）
function SpotRow({ spot, saved, highlight, disabled, sameAsPrevious, onClick }: RowProps) {
  const sub = spot.description ?? spot.address;
  const Ticket = ShopIcons.campaign;
  const Saved = ListIcons.list;
  return (
    <button
      type="button"
      className={`${styles.item} ${highlight && saved.length > 0 ? styles.highlight : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={styles.thumb} data-type={spot.spotType}>
        {spot.latestImageUrl && <img src={spot.latestImageUrl} alt="" loading="lazy" />}
      </span>
      <span className={styles.itemBody}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{spot.name}</span>
          {spot.spotType === 'major' && <span className={styles.label}>定番</span>}
          {spot.spotType === 'hub' && <span className={styles.label}>起点</span>}
          {isDemoSpot(spot.id) && <span className={styles.label}>デモ</span>}
          {spot.hasActiveCampaign && (
            <span className={styles.campaign}>
              <Ticket size={12} aria-hidden="true" />
              キャンペーン中
            </span>
          )}
          {!spot.isActive && <span className={styles.inactive}>{UiMessages.inactiveSpot}</span>}
        </span>
        {sub && <span className={styles.description}>{sub}</span>}
        {saved.length > 0 && (
          <span className={styles.saved}>
            <Saved size={14} aria-hidden="true" />
            {savedLabel(saved)}
          </span>
        )}
        {sameAsPrevious && <span className={styles.note}>{UiMessages.sameSpotAdjacent}</span>}
      </span>
    </button>
  );
}
