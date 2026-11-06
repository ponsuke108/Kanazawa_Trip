import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LngLatBounds, Map as MapLibreMap, Marker, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL } from '@/components/map/mapStyle';
import { MapError, MapLoading } from '@/components/map/MapStatus';
import { useToast } from '@/components/common/useToast';
import { IconButton } from '@/components/common/IconButton';
import { MapMessages } from '@/constants/messages';
import { isInKanazawa } from '@/lib/geo';
import { MapIcons } from '@/lib/icons';
import { ClusterPin, SpotPin } from '@/components/map/SpotPin';
import { repSpotId, toFeatureCollection } from '@/components/map/spotsGeoJson';
import { isEdgeStart, MOBILE_MEDIA, TAP_SLOP_PX, zoomFromDrag } from '@/components/map/edgeZoom';
import type { MapSpot, MapViewProps } from '@/components/map/types';
import { KanazawaCenter, MapMaxBounds } from '@/lib/geo';
import { createZoomFollower } from '@/components/map/zoomMotion';
import styles from './MapView.module.css';

const SOURCE_ID = 'spots';
const INITIAL_ZOOM = 13;
const SPOT_ZOOM = 15; // スポットが1つのときの拡大
const CLUSTER_RADIUS = 48; // この距離（画面の px）より近いピンを写真の束にする
const CLUSTER_MAX_ZOOM = 16; // これより拡大したら束にしない
const FIT_PADDING = 56;
const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)';

type PinItem =
  | { key: string; kind: 'spot'; el: HTMLElement; spotId: number }
  | {
      key: string;
      kind: 'cluster';
      el: HTMLElement;
      clusterId: number;
      count: number;
      repId: number;
    };

// 地図（要件定義書 7.6、BR-24）。maplibre-gl はこのフォルダの中だけで使う。
// 画面からは LazyMapView を使い、地図を使う画面に入ったときだけ読み込む
export function MapView({
  spots,
  selectedSpotId = null,
  onSelectSpot,
  interactive = true,
  fitToSpots = false,
  edgeZoom = false,
  height,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLElement }>());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [items, setItems] = useState<PinItem[]>([]);

  const spotsById = useMemo(() => new Map(spots.map((s) => [s.id, s])), [spots]);

  // 見えているピンと束を、HTML のマーカーとして置き直す
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(SOURCE_ID)) return;
    const next: PinItem[] = [];
    const seen = new Set<string>();
    for (const f of map.querySourceFeatures(SOURCE_ID)) {
      if (f.geometry.type !== 'Point') continue;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const p = f.properties as Record<string, unknown>;
      const isCluster = p.cluster === true;
      const key = isCluster ? `c${String(p.cluster_id)}` : `s${String(p.id)}`;
      if (seen.has(key)) continue; // タイルの境目で同じものが2回返ることがある
      seen.add(key);
      let entry = markersRef.current.get(key);
      if (!entry) {
        const el = document.createElement('div');
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
        entry = { marker, el };
        markersRef.current.set(key, entry);
      }
      next.push(
        isCluster
          ? {
              key,
              kind: 'cluster',
              el: entry.el,
              clusterId: Number(p.cluster_id),
              count: Number(p.point_count),
              repId: repSpotId(Number(p.rep)),
            }
          : { key, kind: 'spot', el: entry.el, spotId: Number(p.id) },
      );
    }
    for (const [key, entry] of markersRef.current) {
      if (!seen.has(key)) {
        entry.marker.remove();
        markersRef.current.delete(key);
      }
    }
    setItems(next);
  }, []);

  // 地図を作る。画面を離れるときは map.remove()（handoff 8.3）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus('loading');
    let loaded = false;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [KanazawaCenter.lng, KanazawaCenter.lat],
      zoom: INITIAL_ZOOM,
      // 金沢市の外へは動かせない（BR-24）
      maxBounds: [
        [MapMaxBounds.west, MapMaxBounds.south],
        [MapMaxBounds.east, MapMaxBounds.north],
      ],
      interactive,
      // 出典は maplibre-gl が自動で右下に出す。消さない（BR-24）
    });
    mapRef.current = map;
    map.on('load', () => {
      loaded = true;
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toFeatureCollection([]),
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterProperties: { rep: ['max', ['get', 'rep']] },
      });
      // ピンは HTML のマーカーで描く。束の計算のため、見えない層を1つ置く
      map.addLayer({
        id: `${SOURCE_ID}-hidden`,
        type: 'circle',
        source: SOURCE_ID,
        paint: { 'circle-opacity': 0, 'circle-radius': 1 },
      });
      setStatus('ready');
    });
    map.on('error', () => {
      // 背景の地図そのものを読み込めないときだけ失敗にする（読み込んだ後のタイルの失敗は無視）
      if (!loaded) setStatus('error');
    });
    // 親の大きさが変わったとき（一覧と地図の切り替えで隠れていた地図が出たときなど）に描き直す
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    map.on('moveend', syncMarkers);
    map.on('sourcedata', (e) => {
      if (e.sourceId === SOURCE_ID && e.isSourceLoaded) syncMarkers();
    });
    return () => {
      resizeObserver.disconnect();
      for (const { marker } of markers.values()) marker.remove();
      markers.clear();
      setItems([]);
      map.remove();
      mapRef.current = null;
    };
  }, [interactive, reloadKey, syncMarkers]);

  // （K66）スマホで左右の端を縦になぞると拡大・縮小する。maplibre-gl より先に受け取り、地図は動かさない
  useEffect(() => {
    const container = containerRef.current;
    if (!edgeZoom || !interactive || status !== 'ready' || !container) return;
    let drag: { id: number; startY: number; startZoom: number; moved: boolean } | null = null;
    // （K70）指に少し遅れてなめらかに追う。指を離しても、目標に着くまで動く
    const follower = createZoomFollower((zoom) => mapRef.current?.jumpTo({ zoom }));

    const onStart = (e: TouchEvent) => {
      const map = mapRef.current;
      const touch = e.touches[0];
      follower.stop(); // 動いている途中で次の操作が始まったら、そこで止める
      if (e.touches.length !== 1) {
        drag = null; // 2本目の指が置かれたら、ふつうのピンチに任せる
        return;
      }
      if (!map || !touch || !window.matchMedia(MOBILE_MEDIA).matches) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('.maplibregl-ctrl')) return; // 出典の表示などは押せるようにしておく
      const { left, width } = container.getBoundingClientRect();
      if (!isEdgeStart(touch.clientX, left, width)) return;
      drag = {
        id: touch.identifier,
        startY: touch.clientY,
        startZoom: map.getZoom(),
        moved: false,
      };
      e.stopPropagation();
    };
    const onMove = (e: TouchEvent) => {
      const map = mapRef.current;
      if (!drag || !map) return;
      const id = drag.id;
      const touch = [...e.touches].find((t) => t.identifier === id);
      if (!touch) return;
      e.stopPropagation();
      if (!drag.moved && Math.abs(touch.clientY - drag.startY) < TAP_SLOP_PX) return;
      // なぞり始めたら preventDefault する。ブラウザは click を出さないので、ピンは押されない
      e.preventDefault();
      drag.moved = true;
      const zoom = zoomFromDrag(drag.startZoom, drag.startY, touch.clientY);
      if (window.matchMedia(REDUCED_MOTION_MEDIA).matches) map.jumpTo({ zoom });
      else follower.moveTo(zoom, map.getZoom());
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      const id = drag.id;
      if ([...e.changedTouches].some((t) => t.identifier === id)) drag = null;
      e.stopPropagation();
    };

    const capture = { capture: true };
    const activeCapture = { capture: true, passive: false };
    container.addEventListener('touchstart', onStart, activeCapture);
    container.addEventListener('touchmove', onMove, activeCapture);
    container.addEventListener('touchend', onEnd, capture);
    container.addEventListener('touchcancel', onEnd, capture);
    return () => {
      follower.stop();
      container.removeEventListener('touchstart', onStart, capture);
      container.removeEventListener('touchmove', onMove, capture);
      container.removeEventListener('touchend', onEnd, capture);
      container.removeEventListener('touchcancel', onEnd, capture);
    };
  }, [edgeZoom, interactive, status]);

  // スポットを地図に入れる
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    source?.setData(toFeatureCollection(spots));
    if (fitToSpots && spots.length > 0) {
      const first = spots[0];
      if (spots.length === 1 && first) {
        map.jumpTo({ center: [first.lng, first.lat], zoom: SPOT_ZOOM });
      } else {
        const bounds = new LngLatBounds();
        for (const s of spots) bounds.extend([s.lng, s.lat]);
        map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: SPOT_ZOOM, duration: 0 });
      }
    }
  }, [spots, status, fitToSpots]);

  // 選んでいるスポットが束の中や画面の外で見えないときは、そこへ移る（S-13 の URL の spot、S-05 からの移動）
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || selectedSpotId === null) return;
    const spot = spotsById.get(selectedSpotId);
    if (!spot || markersRef.current.has(`s${spot.id}`)) return;
    map.easeTo({
      center: [spot.lng, spot.lat],
      zoom: Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1),
    });
  }, [selectedSpotId, spotsById, status]);

  // 現在地（6.4 S-13）：押したときだけ端末の現在地を使い、金沢市の中なら移動する。保存も送信もしない
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      toast.show({ type: 'error', message: MapMessages.locationUnavailable });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInKanazawa(coords.latitude, coords.longitude)) {
          toast.show({ type: 'info', message: MapMessages.outsideKanazawa });
          return;
        }
        mapRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: SPOT_ZOOM });
      },
      () => {
        setLocating(false);
        toast.show({ type: 'error', message: MapMessages.locationUnavailable });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [toast]);

  // 束を押すと、その範囲を拡大する（BR-24）
  const expandCluster = useCallback(async (clusterId: number, el: HTMLElement) => {
    const map = mapRef.current;
    const source = map?.getSource<GeoJSONSource>(SOURCE_ID);
    if (!map || !source) return;
    const zoom = await source.getClusterExpansionZoom(clusterId);
    const marker = [...markersRef.current.values()].find((m) => m.el === el)?.marker;
    map.easeTo({ center: marker?.getLngLat() ?? map.getCenter(), zoom });
  }, []);

  return (
    <div className={styles.wrap} style={{ height }}>
      <div ref={containerRef} className={styles.map} />
      {items.map((item) => {
        if (item.kind === 'cluster') {
          return createPortal(
            <ClusterPin
              spot={spotsById.get(item.repId)}
              count={item.count}
              onClick={() => void expandCluster(item.clusterId, item.el)}
            />,
            item.el,
            item.key,
          );
        }
        const spot: MapSpot | undefined = spotsById.get(item.spotId);
        if (!spot) return null;
        return createPortal(
          <SpotPin
            spot={spot}
            selected={spot.id === selectedSpotId}
            onClick={onSelectSpot ? () => onSelectSpot(spot.id) : undefined}
          />,
          item.el,
          item.key,
        );
      })}
      {interactive && status === 'ready' && (
        <div className={styles.locate}>
          <IconButton icon={MapIcons.locate} label="現在地" disabled={locating} onClick={locate} />
        </div>
      )}
      {status === 'loading' && <MapLoading />}
      {status === 'error' && <MapError onRetry={() => setReloadKey((k) => k + 1)} />}
    </div>
  );
}
