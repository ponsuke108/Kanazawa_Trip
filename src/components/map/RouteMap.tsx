import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LngLatBounds, Map as MapLibreMap, Marker, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, LineString } from 'geojson';
import { MAP_STYLE_URL } from '@/components/map/mapStyle';
import { MapError, MapLoading } from '@/components/map/MapStatus';
import { KanazawaCenter, MapMaxBounds } from '@/lib/geo';
import type { RouteStop } from '@/types/models';
import styles from './RouteMap.module.css';

export type RouteMapProps = {
  stops: RouteStop[];
  onSelectStop?: (stop: RouteStop) => void;
};

const LINE_SOURCE = 'route-line';
const FIT_PADDING = 40;
const MAX_ZOOM = 16;
const SINGLE_ZOOM = 15;

// すべてのピンが入るように合わせる（BR-22）
function fitStops(map: MapLibreMap, stops: RouteStop[]) {
  const first = stops[0];
  if (stops.length === 1 && first) {
    map.jumpTo({ center: [first.spot.lng, first.spot.lat], zoom: SINGLE_ZOOM });
  } else if (stops.length > 1) {
    const bounds = new LngLatBounds();
    for (const s of stops) bounds.extend([s.spot.lng, s.spot.lat]);
    map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: MAX_ZOOM, duration: 0 });
  }
}

function toLine(stops: RouteStop[]): FeatureCollection<LineString> {
  // 並び順に結ぶ：同じスポットが2回出るときも、番号の順にたどる（BR-22）
  const order = stops
    .flatMap((s) => s.numbers.map((n) => ({ n, s })))
    .sort((a, b) => a.n - b.n)
    .map(({ s }) => [s.spot.lng, s.spot.lat]);
  return {
    type: 'FeatureCollection',
    features:
      order.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: order },
            },
          ]
        : [],
  };
}

// 経路順の地図（7.6、BR-22）：スポットを並び順の番号のピンにして直線で結ぶ。写真がなくても出す。
// 地図をなぞる操作とブロックの並べ替えがぶつからないよう、スマホでは2本指で動かす（8.3、T7）。
// 画面からは LazyRouteMap を使う
export function RouteMap({ stops, onSelectStop }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stopsRef = useRef(stops);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [elements, setElements] = useState<
    Array<{ key: string; el: HTMLElement; stop: RouteStop }>
  >([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    let loaded = false;
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [KanazawaCenter.lng, KanazawaCenter.lat],
      zoom: 13,
      maxBounds: [
        [MapMaxBounds.west, MapMaxBounds.south],
        [MapMaxBounds.east, MapMaxBounds.north],
      ],
      cooperativeGestures: true,
      // 出典は maplibre-gl が自動で右下に出す。消さない（BR-24）
    });
    mapRef.current = map;
    map.on('load', () => {
      loaded = true;
      map.addSource(LINE_SOURCE, { type: 'geojson', data: toLine([]) });
      map.addLayer({
        id: LINE_SOURCE,
        type: 'line',
        source: LINE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        // 7.2 --color-route-line（金）。地図の描画には CSS の変数を渡せないので、変数の値を読んで使う
        paint: {
          'line-color':
            getComputedStyle(container).getPropertyValue('--color-route-line').trim() || 'gold',
          'line-width': 3,
        },
      });
      setStatus('ready');
    });
    map.on('error', () => {
      if (!loaded) setStatus('error');
    });
    // 閉じていた地図を開いたときなど、大きさが変わったら描き直して合わせ直す
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      if (container.clientHeight > 0) fitStops(map, stopsRef.current);
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [reloadKey]);

  // 並び順が変わったら、すぐピンと直線を直し、すべてのピンが入るように合わせる（BR-22）
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    map.getSource<GeoJSONSource>(LINE_SOURCE)?.setData(toLine(stops));
    const markers = stops.map((stop) => {
      const el = document.createElement('div');
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([stop.spot.lng, stop.spot.lat])
        .addTo(map);
      return { marker, el, stop };
    });
    setElements(markers.map(({ el, stop }) => ({ key: stop.blockIds.join('-'), el, stop })));
    stopsRef.current = stops;
    fitStops(map, stops);
    return () => {
      for (const { marker } of markers) marker.remove();
    };
  }, [stops, status]);

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} />
      {elements.map(({ key, el, stop }) =>
        createPortal(
          <button
            type="button"
            className={styles.pin}
            data-type={stop.spot.spotType}
            onClick={onSelectStop ? () => onSelectStop(stop) : undefined}
            aria-label={`${stop.numbers.join('・')}番目 ${stop.spot.name}`}
          >
            {stop.numbers.join('・')}
          </button>,
          el,
          key,
        ),
      )}
      {status === 'loading' && <MapLoading />}
      {status === 'error' && <MapError onRetry={() => setReloadKey((k) => k + 1)} />}
    </div>
  );
}
