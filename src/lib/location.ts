// （v11）端末の現在地。押したときだけ使い、保存も送信もしない（BR-28、6.4 S-13）
export type Position = { lat: number; lng: number; accuracy: number };
export type PositionError = 'unsupported' | 'denied' | 'unavailable';

export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject: (reason: PositionError) => void) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (err) => reject(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
