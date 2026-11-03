import { MapMessages } from '@/constants/messages';
import styles from './MapAttribution.module.css';

// 場所の情報の出典（要件定義書 7.6、BR-19、BR-24）。S-05、S-16、S-01 で使う。
// 地図の上の出典（© OpenFreeMap など）は maplibre-gl が自動で出すので、ここでは出さない
export function MapAttribution() {
  return (
    <p className={styles.attribution}>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        {MapMessages.attribution}
      </a>
    </p>
  );
}
