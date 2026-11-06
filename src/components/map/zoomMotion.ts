// （K70）端ズームのなめらかな動き。指の動きで決まるズームへ、毎コマ少しずつ近づける。指を離しても止まるまで続く
export const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)'; // この設定のときは動きなしで変える
const FOLLOW_TAU_MS = 60; // この時間で、残りの約 63% を進む
const SETTLE_ZOOM = 0.002; // これより近づいたら止める
const MAX_FRAME_MS = 50; // タブが裏にあったあとなどで、1コマが長くなっても飛ばない

// 1コマ分近づけたズーム。コマの長さが違っても、同じ速さで近づく
export function nextZoom(current: number, target: number, dtMs: number): number {
  if (Math.abs(target - current) < SETTLE_ZOOM) return target;
  const dt = Math.min(Math.max(dtMs, 0), MAX_FRAME_MS);
  return current + (target - current) * (1 - Math.exp(-dt / FOLLOW_TAU_MS));
}

type Scheduler = {
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
};

const browserScheduler: Scheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export type ZoomFollower = {
  moveTo: (target: number, currentZoom: number) => void; // 動いていないときは currentZoom から始める
  stop: () => void;
};

export function createZoomFollower(
  apply: (zoom: number) => void,
  scheduler: Scheduler = browserScheduler,
): ZoomFollower {
  let frame: number | null = null;
  let zoom = 0;
  let target = 0;
  let lastTime: number | null = null;

  const step = (time: number) => {
    const dt = lastTime === null ? 1000 / 60 : time - lastTime;
    lastTime = time;
    zoom = nextZoom(zoom, target, dt);
    apply(zoom);
    if (zoom === target) {
      frame = null;
      lastTime = null;
      return;
    }
    frame = scheduler.request(step);
  };

  return {
    moveTo(nextTarget, currentZoom) {
      target = nextTarget;
      if (frame !== null) return;
      zoom = currentZoom;
      frame = scheduler.request(step);
    },
    stop() {
      if (frame !== null) scheduler.cancel(frame);
      frame = null;
      lastTime = null;
    },
  };
}
