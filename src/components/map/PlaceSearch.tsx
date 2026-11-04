import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { searchPlaces } from '@/api/places';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getSpots } from '@/api/spots';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { IconButton } from '@/components/common/IconButton';
import { MapAttribution } from '@/components/map/MapAttribution';
import { PlaceSearchMessages } from '@/constants/messages';
import { SpotTypeLabels } from '@/constants/spots';
import { errorMessage } from '@/lib/errorMessage';
import { distanceKm } from '@/lib/geo';
import { ActionIcons, StateIcons } from '@/lib/icons';
import type { PlaceCandidate, Spot, SpotOrCandidate } from '@/types/models';
import styles from './PlaceSearch.module.css';

type Props = {
  open: boolean;
  onSelect: (result: SpotOrCandidate) => void;
  onClose: () => void;
};

const MAX_SITE_SPOTS = 10; // S-16：このサイトのスポットは最大10件
const COOLDOWN_MS = 1000; // BR-19：押したあと1秒は押せない
const NEAR_M = 50; // BR-20：50m 以内

// S-16 場所を探す（6.4、7.6）。元の画面の上に画面いっぱいに重ねて出す。URL は変えない。
// 選んだものを onSelect で返すだけで、スポットの登録（registerSpot）はしない（BR-20）
export function PlaceSearch({ open, onSelect, onClose }: Props) {
  if (!open) return null;
  return createPortal(<PlaceSearchBody onSelect={onSelect} onClose={onClose} />, document.body);
}

function PlaceSearchBody({ onSelect, onClose }: Omit<Props, 'open'>) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const [nearbyChoice, setNearbyChoice] = useState<{
    candidate: PlaceCandidate;
    spot: Spot;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const spots = useQuery({
    queryKey: queryKeys.spots,
    queryFn: getSpots,
    staleTime: STALE_TIME.never,
  });
  // 同じ言葉の結果は覚えておき、Nominatim を呼び直さない（BR-19、11.2）
  const places = useQuery({
    queryKey: queryKeys.places(submitted ?? ''),
    queryFn: () => searchPlaces(submitted ?? ''),
    enabled: submitted !== null,
    staleTime: STALE_TIME.never,
    gcTime: STALE_TIME.never,
    retry: false,
  });

  // Esc で閉じる。呼ぶ側が毎回新しい関数を渡しても、検索欄のカーソルが戻らないようにする
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 開いたら検索欄にカーソルを置き、Esc で閉じる。後ろの画面はスクロールさせない
  useEffect(() => {
    inputRef.current?.focus();
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

  useEffect(() => {
    if (!coolingDown) return;
    const t = window.setTimeout(() => setCoolingDown(false), COOLDOWN_MS);
    return () => window.clearTimeout(t);
  }, [coolingDown]);

  const keyword = input.trim();
  const activeSpots = useMemo(() => (spots.data ?? []).filter((s) => s.isActive), [spots.data]);
  // 入力するたびに、このサイトのスポットを画面の中で絞り込む（Nominatim は呼ばない。BR-19）
  const siteMatches = useMemo(
    () =>
      keyword === ''
        ? []
        : activeSpots.filter((s) => s.name.includes(keyword)).slice(0, MAX_SITE_SPOTS),
    [activeSpots, keyword],
  );
  const spotById = useMemo(() => new Map(activeSpots.map((s) => [s.id, s])), [activeSpots]);

  function searchOsm() {
    if (keyword === '' || coolingDown) return;
    setCoolingDown(true);
    setNearbyChoice(null);
    setSubmitted(keyword);
  }

  // BR-20：すでにある場所はこのサイトのスポットに置き換える。近くに別のスポットがあれば先に見せる
  function selectCandidate(candidate: PlaceCandidate) {
    const existing = candidate.existingSpotId ? spotById.get(candidate.existingSpotId) : undefined;
    if (existing) return onSelect({ kind: 'spot', spot: existing });
    const near = activeSpots
      .map((s) => ({ s, m: distanceKm(s, candidate) * 1000 }))
      .filter((x) => x.m <= NEAR_M)
      .sort((a, b) => a.m - b.m);
    const sameName = near.find((x) => x.s.name === candidate.name);
    if (sameName) return onSelect({ kind: 'spot', spot: sameName.s });
    const nearest = near[0];
    if (nearest) return setNearbyChoice({ candidate, spot: nearest.s });
    onSelect({ kind: 'candidate', candidate });
  }

  const noSiteSpots = keyword !== '' && spots.isSuccess && siteMatches.length === 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="場所を探す">
      <header className={styles.header}>
        <IconButton icon={ActionIcons.back} label="戻る" onClick={onClose} />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder={PlaceSearchMessages.placeholder}
          aria-label={PlaceSearchMessages.placeholder}
          value={input}
          maxLength={100}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter ではこのサイトの絞り込みだけ。Nominatim はボタンを押したときだけ呼ぶ（BR-19）
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
      </header>

      <main className={styles.body}>
        {spots.isPending ? (
          <FullScreenLoading />
        ) : spots.isError ? (
          <ErrorState message={errorMessage(spots.error)} onRetry={() => spots.refetch()} />
        ) : keyword === '' ? (
          <p className={styles.hint}>{PlaceSearchMessages.emptyInput}</p>
        ) : (
          <>
            <section aria-label={PlaceSearchMessages.siteSpots}>
              {noSiteSpots ? (
                <p className={styles.hint}>{PlaceSearchMessages.noSiteSpots}</p>
              ) : (
                <ul className={styles.list}>
                  {siteMatches.map((s) => (
                    <li key={s.id}>
                      <SpotRow spot={s} onClick={() => onSelect({ kind: 'spot', spot: s })} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className={styles.osm}>
              <p className={styles.hint}>{PlaceSearchMessages.searchLead}</p>
              <Button
                variant={noSiteSpots ? 'primary' : 'secondary'}
                icon={ActionIcons.search}
                fullWidth
                disabled={coolingDown}
                loading={places.isFetching}
                onClick={searchOsm}
              >
                {PlaceSearchMessages.searchButton}
              </Button>
            </div>

            {/* 入力を変えたら、前の言葉の候補は出さない */}
            {submitted !== null && submitted === keyword && (
              <section className={styles.candidates} aria-label={PlaceSearchMessages.candidates}>
                <CandidateResults
                  state={places}
                  shownSpotIds={new Set(siteMatches.map((s) => s.id))}
                  spotById={spotById}
                  nearbyChoice={nearbyChoice}
                  onSelectCandidate={selectCandidate}
                  onSelectSpot={(spot) => onSelect({ kind: 'spot', spot })}
                  onKeepCandidate={(candidate) => onSelect({ kind: 'candidate', candidate })}
                />
                <MapAttribution />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type CandidateResultsProps = {
  state: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: PlaceCandidate[] | undefined;
  };
  spotById: Map<number, Spot>;
  shownSpotIds: Set<number>; // 上の「このサイトのスポット」にもう出ているもの
  nearbyChoice: { candidate: PlaceCandidate; spot: Spot } | null;
  onSelectCandidate: (c: PlaceCandidate) => void;
  onSelectSpot: (s: Spot) => void;
  onKeepCandidate: (c: PlaceCandidate) => void;
};

// 場所の候補と、その状態（6.4 S-16 の表）
function CandidateResults({
  state,
  spotById,
  shownSpotIds,
  nearbyChoice,
  onSelectCandidate,
  onSelectSpot,
  onKeepCandidate,
}: CandidateResultsProps) {
  if (state.isPending) {
    return (
      <p className={styles.hint} role="status">
        {PlaceSearchMessages.searching}
      </p>
    );
  }
  if (state.isError) {
    // 止めている・失敗・金沢市の外だけ。どれも同じ箱で文言だけ変える（6.5）
    const outOfArea = isApiError(state.error) && state.error.code === 'OUT_OF_AREA';
    return (
      <EmptyState
        icon={outOfArea ? StateIcons.spot : StateIcons.alert}
        title={errorMessage(state.error)}
      />
    );
  }
  // 上の一覧にもう出ているスポットは、2回出さない
  const candidates = (state.data ?? []).filter(
    (c) => c.existingSpotId === null || !shownSpotIds.has(c.existingSpotId),
  );
  if ((state.data ?? []).length === 0) {
    return <EmptyState icon={StateIcons.noResults} title={PlaceSearchMessages.noCandidates} />;
  }
  if (candidates.length === 0) return null;
  return (
    <ul className={styles.list}>
      {candidates.map((c) => {
        // すでにこのサイトにある場所は、このサイトのスポットとして出す
        const existing = c.existingSpotId ? spotById.get(c.existingSpotId) : undefined;
        if (existing) {
          return (
            <li key={c.osmRef}>
              <SpotRow spot={existing} onClick={() => onSelectSpot(existing)} />
            </li>
          );
        }
        const asking = nearbyChoice?.candidate.osmRef === c.osmRef ? nearbyChoice : null;
        return (
          <li key={c.osmRef}>
            <button type="button" className={styles.item} onClick={() => onSelectCandidate(c)}>
              <span className={styles.nameRow}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.kind}>{c.placeKind}</span>
              </span>
              <span className={styles.sub}>{c.address}</span>
            </button>
            {asking && (
              <div className={styles.nearby} role="alert">
                <p>{PlaceSearchMessages.nearbyTitle(asking.spot.name)}</p>
                <div className={styles.nearbyActions}>
                  <Button onClick={() => onSelectSpot(asking.spot)}>
                    {PlaceSearchMessages.chooseNearby(asking.spot.name)}
                  </Button>
                  <Button variant="secondary" onClick={() => onKeepCandidate(c)}>
                    {PlaceSearchMessages.chooseCandidate}
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// このサイトのスポットの行：スポット名、種類のラベル、紹介文か住所
function SpotRow({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  const sub = spot.description ?? spot.address;
  return (
    <button type="button" className={styles.item} onClick={onClick}>
      <span className={styles.nameRow}>
        <span className={styles.name}>{spot.name}</span>
        <span className={styles.label}>{SpotTypeLabels[spot.spotType]}</span>
      </span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </button>
  );
}
