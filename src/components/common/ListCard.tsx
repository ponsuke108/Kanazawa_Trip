import { Link } from 'react-router';
import { formatDate } from '@/lib/format';
import { ListIcons } from '@/lib/icons';
import type { ListSummary } from '@/types/models';
import styles from './ListCard.module.css';

// リストのカード（7.6、6.4 S-14）：名前、スポットの数、最初の3スポットの名前、更新日。押すと S-15
export function ListCard({ list }: { list: ListSummary }) {
  const Icon = ListIcons.list;
  return (
    <Link to={`/lists/${list.id}`} className={styles.card}>
      <span className={styles.badge} aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{list.name}</span>
        <span className={styles.spots}>
          {list.spotCount}か所
          {list.firstSpotNames.length > 0 && `：${list.firstSpotNames.join('、')}`}
        </span>
        <span className={styles.date}>{formatDate(list.updatedAt)} 更新</span>
      </span>
    </Link>
  );
}
