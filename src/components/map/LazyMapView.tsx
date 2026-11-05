import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { MapError, MapLoading } from '@/components/map/MapStatus';
import type { RouteMapProps } from '@/components/map/RouteMap';
import type { MapViewProps } from '@/components/map/types';
import styles from './LazyMapView.module.css';

// maplibre-gl は重いので、地図を使う画面に入ったときに読み込む（BR-24、handoff 8.3）
const MapViewChunk = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// 画面からはこの部品を使う。引数は MapView と同じ（要件定義書 7.6）
export function LazyMapView(props: MapViewProps) {
  const [retryKey, setRetryKey] = useState(0);
  const fallback = (
    <div className={styles.box} style={{ height: props.height }}>
      <MapLoading />
    </div>
  );
  return (
    <ChunkErrorBoundary
      key={retryKey}
      fallback={
        <div className={styles.box} style={{ height: props.height }}>
          <MapError onRetry={() => setRetryKey((k) => k + 1)} />
        </div>
      }
    >
      <Suspense fallback={fallback}>
        <MapViewChunk {...props} />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

// （v11）経路順の地図（BR-22）も、地図を使う画面に入ったときだけ読み込む
const RouteMapChunk = lazy(() =>
  import('@/components/map/RouteMap').then((m) => ({ default: m.RouteMap })),
);

export function LazyRouteMap(props: RouteMapProps) {
  const [retryKey, setRetryKey] = useState(0);
  return (
    <ChunkErrorBoundary
      key={retryKey}
      fallback={
        <div className={styles.fill}>
          <MapError onRetry={() => setRetryKey((k) => k + 1)} />
        </div>
      }
    >
      <Suspense
        fallback={
          <div className={styles.fill}>
            <MapLoading />
          </div>
        }
      >
        <RouteMapChunk {...props} />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

// 地図の部品のファイルを読み込めなかったとき（通信の失敗など）。地図以外は使えるままにする（BR-24）
class ChunkErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
