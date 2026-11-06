import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getSpots } from '@/api/spots';
import { AddToListSheet } from '@/components/common/AddToListSheet';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/common/useToast';
import { LazyMapView } from '@/components/map/LazyMapView';
import { MapAttribution } from '@/components/map/MapAttribution';
import { targetPinOf } from '@/components/map/mapFocus';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { SpotSheet } from '@/components/map/SpotSheet';
import type { MapPoint } from '@/components/map/types';
import { MapMessages } from '@/constants/messages';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ListIcons, PostIcons } from '@/lib/icons';
import type { PlaceCandidate } from '@/types/models';
import styles from './MapPage.module.css';

// S-13 地図（6.4、F-34、BR-24）。/map?spot=:spotId&minor=1
// 写真のあるスポットだけをピンで出す。ピンを押すと URL の spot を変え、シートを出す（戻るで閉じる）
export function MapPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidate, setCandidate] = useState<PlaceCandidate | null>(null);
  const [focus, setFocus] = useState<MapPoint | null>(null);

  const minorOnly = params.get('minor') === '1';
  const spotParam = Number(params.get('spot'));
  const selectedId = Number.isInteger(spotParam) && spotParam > 0 ? spotParam : null;

  const spots = useQuery({
    queryKey: queryKeys.spots,
    queryFn: getSpots,
    staleTime: STALE_TIME.never,
  });

  // スポットの読み込みに失敗したらトーストで知らせ、地図はそのまま（6.4 S-13）
  useEffect(() => {
    if (spots.isError) toast.show({ type: 'error', message: errorMessage(spots.error) });
  }, [spots.isError, spots.error, toast]);

  // BR-24、K50：地図に出すのは写真のあるスポットだけ。「定番以外だけ」で絞る
  const pins = useMemo(
    () =>
      (spots.data ?? []).filter(
        (s) => s.latestImageUrl !== null && (!minorOnly || s.spotType === 'minor'),
      ),
    [spots.data, minorOnly],
  );
  const selected = useMemo(
    () =>
      selectedId === null ? null : ((spots.data ?? []).find((s) => s.id === selectedId) ?? null),
    [spots.data, selectedId],
  );

  // K68：写真のピンがない場所は、指すピンを出す。「定番以外だけ」で隠れているスポットも同じ
  const targetPin = useMemo(
    () => targetPinOf(selected, candidate, new Set(pins.map((s) => s.id))),
    [selected, candidate, pins],
  );

  const update = (change: (p: URLSearchParams) => void, replace: boolean) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        change(next);
        return next;
      },
      { replace },
    );
  // ピンを選ぶと履歴に積む（戻るでシートを閉じられる。6.4 S-13）
  const selectSpot = (id: number) => {
    setCandidate(null);
    if (id === selectedId) return; // 同じピンをもう一度押しても履歴を増やさない
    update((p) => p.set('spot', String(id)), false);
  };
  const closeSheet = () => update((p) => p.delete('spot'), true);
  const toggleMinor = () =>
    update((p) => (minorOnly ? p.delete('minor') : p.set('minor', '1')), true);

  return (
    <AppLayout showTabBar>
      <PageHeader title="地図" showSiteName />
      <div className={styles.stage}>
        <LazyMapView
          spots={pins}
          selectedSpotId={selectedId}
          onSelectSpot={selectSpot}
          edgeZoom
          targetPin={targetPin}
          focus={focus}
          height="100%"
        />
        <div className={styles.controls}>
          <button type="button" className={styles.search} onClick={() => setSearchOpen(true)}>
            <ActionIcons.search size={20} aria-hidden="true" />
            {MapMessages.searchSpots}
          </button>
          <button
            type="button"
            className={`${styles.chip} ${minorOnly ? styles.chipOn : ''}`}
            aria-pressed={minorOnly}
            onClick={toggleMinor}
          >
            {MapMessages.minorOnly}
          </button>
        </div>
        {selected && <SpotSheet key={selected.id} spot={selected} onClose={closeSheet} />}
        {!selected && candidate && (
          <CandidateSheet candidate={candidate} onClose={() => setCandidate(null)} />
        )}
      </div>

      <PlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(r) => {
          setSearchOpen(false);
          // K68：選んだ場所へ動かす。座標は S-16 の結果（このサイトのスポットか Nominatim）のもの
          const { lat, lng } = r.kind === 'spot' ? r.spot : r.candidate;
          setFocus({ lat, lng });
          if (r.kind === 'spot') selectSpot(r.spot.id);
          else {
            closeSheet();
            setCandidate(r.candidate);
          }
        }}
      />
    </AppLayout>
  );
}

// まだこのサイトにない場所（S-16 で選んだ候補）のシート。投稿するときにスポットとして登録する（BR-20）
function CandidateSheet({
  candidate,
  onClose,
}: {
  candidate: PlaceCandidate;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const resolve = useResolveSpot();
  const [listOpen, setListOpen] = useState(false);
  return (
    <section className={styles.candidate} aria-label={`${candidate.name}の情報`}>
      <header className={styles.candidateHead}>
        <div>
          <h2 className={styles.candidateName}>{candidate.name}</h2>
          <p className={styles.candidateSub}>
            {candidate.placeKind}・{candidate.address}
          </p>
        </div>
        <IconButton icon={ActionIcons.close} label="閉じる" onClick={onClose} />
      </header>
      <Button
        icon={PostIcons.post}
        loading={resolve.isPending}
        onClick={() =>
          resolve.mutate(
            { kind: 'candidate', candidate },
            {
              onSuccess: ({ spotId }) => navigate(`/posts/new?spot=${spotId}`),
              onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
            },
          )
        }
      >
        ここに投稿
      </Button>
      <Button variant="secondary" icon={ListIcons.add} onClick={() => setListOpen(true)}>
        リストに追加
      </Button>
      <MapAttribution />
      <AddToListSheet
        spot={{ kind: 'candidate', candidate }}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />
    </section>
  );
}
