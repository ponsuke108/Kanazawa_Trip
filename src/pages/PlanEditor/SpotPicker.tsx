import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIME } from '@/api/queryKeys';
import { getSpots } from '@/api/spots';
import { BottomSheet } from '@/components/common/BottomSheet';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { AREAS, areaIndex } from '@/constants/areas';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import type { Spot } from '@/types/models';
import styles from './SpotPicker.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
  disabledSpotId: number | null; // 直前のスポット（BR-03）
};

const ALL = 'all';

// S-07 スポット選択（6.4）。すべて読み込んでから画面内で絞り込む
export function SpotPicker({ open, onClose, onSelect, disabledSpotId }: Props) {
  const spots = useQuery({
    queryKey: queryKeys.spots,
    queryFn: getSpots,
    staleTime: STALE_TIME.never,
    enabled: open,
  });
  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState<string>(ALL);
  const [minorOnly, setMinorOnly] = useState(false);

  const groups = useMemo(() => {
    const k = keyword.trim();
    const filtered = (spots.data ?? []).filter(
      (s) =>
        s.isActive &&
        (k === '' || s.name.includes(k)) &&
        (area === ALL || s.area === area) &&
        (!minorOnly || s.spotType === 'minor'),
    );
    const map = new Map<string, Spot[]>();
    for (const s of filtered) map.set(s.area, [...(map.get(s.area) ?? []), s]);
    return [...map.entries()].sort((a, b) => areaIndex(a[0]) - areaIndex(b[0]));
  }, [spots.data, keyword, area, minorOnly]);

  return (
    <BottomSheet open={open} title="スポットを追加" onClose={onClose}>
      <div className={styles.filters}>
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

      {spots.isPending ? (
        <FullScreenLoading />
      ) : spots.isError ? (
        <ErrorState message={errorMessage(spots.error)} onRetry={() => spots.refetch()} />
      ) : groups.length === 0 ? (
        <p className={styles.empty}>条件に合うスポットがありません</p>
      ) : (
        groups.map(([areaName, items]) => (
          <section key={areaName} className={styles.group}>
            <h3 className={styles.areaHeading}>{areaName}</h3>
            <ul className={styles.list}>
              {items.map((s) => {
                const disabled = s.id === disabledSpotId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={styles.item}
                      disabled={disabled}
                      onClick={() => onSelect(s)}
                    >
                      <span className={styles.nameRow}>
                        <span className={styles.name}>{s.name}</span>
                        {s.spotType === 'major' && <span className={styles.label}>定番</span>}
                        {s.spotType === 'hub' && <span className={styles.label}>起点</span>}
                      </span>
                      {s.description && <span className={styles.description}>{s.description}</span>}
                      {disabled && (
                        <span className={styles.note}>{UiMessages.sameSpotAdjacent}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </BottomSheet>
  );
}
