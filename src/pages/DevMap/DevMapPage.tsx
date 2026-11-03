import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSpots } from '@/api/spots';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { LazyMapView } from '@/components/map/LazyMapView';
import { MapAttribution } from '@/components/map/MapAttribution';
import type { MapSpot } from '@/components/map/types';
import { errorMessage } from '@/lib/errorMessage';
import styles from './DevMapPage.module.css';

// I-25 の確認用の仮の画面（開発のときだけ /dev/map で開ける）。S-13 を作る I-30 で消す。
// 写真のピンと札を確かめるため、いくつかのスポットに単色の仮の写真とキャンペーン中の印を付ける
function sampleImage(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const SAMPLE_COLORS = ['#7aa874', '#d9a05b', '#6f8fc9', '#c97a8f'];

export function DevMapPage() {
  const spots = useQuery({ queryKey: queryKeys.spots, queryFn: getSpots });
  const [selected, setSelected] = useState<number | null>(null);

  const mapSpots = useMemo<MapSpot[]>(
    () =>
      (spots.data ?? []).map((s, i) => ({
        ...s,
        latestImageUrl:
          i % 3 === 0 ? sampleImage(SAMPLE_COLORS[i % SAMPLE_COLORS.length] ?? '#888') : null,
        hasActiveCampaign: i % 5 === 1,
      })),
    [spots.data],
  );
  const selectedName = mapSpots.find((s) => s.id === selected)?.name;

  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="地図の確認（I-25）" />
      <main className={styles.main}>
        {spots.isPending ? (
          <FullScreenLoading />
        ) : spots.isError ? (
          <ErrorState message={errorMessage(spots.error)} onRetry={() => spots.refetch()} />
        ) : (
          <>
            <p className={styles.note}>
              {mapSpots.length}か所。選んだスポット：{selectedName ?? 'なし'}
            </p>
            <LazyMapView
              spots={mapSpots}
              selectedSpotId={selected}
              onSelectSpot={setSelected}
              height="60dvh"
            />
            <MapAttribution />
          </>
        )}
      </main>
    </AppLayout>
  );
}
