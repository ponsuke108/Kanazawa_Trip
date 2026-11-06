import { describe, expect, it } from 'vitest';
import { createZoomFollower, nextZoom } from '@/components/map/zoomMotion';

function fakeScheduler() {
  let pending: ((time: number) => void) | null = null;
  let now = 0;
  return {
    scheduler: {
      request(callback: (time: number) => void) {
        pending = callback;
        return 1;
      },
      cancel() {
        pending = null;
      },
    },
    isRunning: () => pending !== null,
    // 16ms ごとにコマを進める
    tick(frames = 1) {
      for (let i = 0; i < frames && pending; i++) {
        const callback: (time: number) => void = pending;
        pending = null;
        now += 16;
        callback(now);
      }
    },
  };
}

describe('nextZoom', () => {
  it('目標へ近づくが、1コマでは届かない', () => {
    const zoom = nextZoom(13, 14, 16);
    expect(zoom).toBeGreaterThan(13);
    expect(zoom).toBeLessThan(14);
  });

  it('縮小でも同じように近づく', () => {
    const zoom = nextZoom(14, 13, 16);
    expect(zoom).toBeLessThan(14);
    expect(zoom).toBeGreaterThan(13);
  });

  it('十分近づいたら目標にそろえる', () => {
    expect(nextZoom(13.999, 14, 16)).toBe(14);
  });

  it('コマが長くても、一度に飛ばない', () => {
    expect(nextZoom(13, 14, 5000)).toBe(nextZoom(13, 14, 50));
    expect(nextZoom(13, 14, 5000)).toBeLessThan(14);
  });
});

describe('createZoomFollower', () => {
  it('呼び出しのあともコマごとに動き、目標に着いたら止まる', () => {
    const fake = fakeScheduler();
    const applied: number[] = [];
    const follower = createZoomFollower((z) => applied.push(z), fake.scheduler);
    follower.moveTo(14, 13);
    expect(applied).toEqual([]);
    fake.tick(200);
    expect(applied[0]).toBeGreaterThan(13);
    expect(applied[0]).toBeLessThan(14);
    expect(applied.at(-1)).toBe(14);
    expect(fake.isRunning()).toBe(false);
  });

  it('動いている途中で目標が変わると、今の位置から新しい目標へ向かう', () => {
    const fake = fakeScheduler();
    const applied: number[] = [];
    const follower = createZoomFollower((z) => applied.push(z), fake.scheduler);
    follower.moveTo(14, 13);
    fake.tick(3);
    const middle = applied.at(-1) ?? 0;
    follower.moveTo(12, 99); // 動いている間は、渡した今のズームを使わない
    fake.tick(1);
    expect(applied.at(-1)).toBeLessThan(middle);
    fake.tick(200);
    expect(applied.at(-1)).toBe(12);
  });

  it('stop のあとは動かない', () => {
    const fake = fakeScheduler();
    const applied: number[] = [];
    const follower = createZoomFollower((z) => applied.push(z), fake.scheduler);
    follower.moveTo(14, 13);
    fake.tick(2);
    const count = applied.length;
    follower.stop();
    fake.tick(5);
    expect(applied).toHaveLength(count);
    expect(fake.isRunning()).toBe(false);
  });
});
