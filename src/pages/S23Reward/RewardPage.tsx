import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReward, useReward as markRewardUsed } from '@/api/campaigns';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/common/useToast';
import { RewardMessages } from '@/constants/messages';
import { isRewardExpired } from '@/lib/campaign';
import { errorMessage } from '@/lib/errorMessage';
import { ShopIcons, StateIcons } from '@/lib/icons';
import type { CampaignReward } from '@/types/models';
import styles from './RewardPage.module.css';

const dateTime = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

// S-23 特典の画面（6.6、F-65、BR-28）。本人だけ（getReward は本人の特典しか返さない）
export function RewardPage() {
  const { rewardId = '' } = useParams();
  const navigate = useNavigate();
  const reward = useQuery({
    queryKey: queryKeys.reward(rewardId),
    queryFn: () => getReward(rewardId),
  });
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="特典" />
      {reward.isPending ? (
        <FullScreenLoading />
      ) : reward.isError ? (
        <main className={styles.main}>
          <ErrorState message={errorMessage(reward.error)} onRetry={() => reward.refetch()} />
        </main>
      ) : !reward.data ? (
        <main className={styles.main}>
          <EmptyState
            icon={StateIcons.alert}
            title={RewardMessages.notViewable}
            action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
          />
        </main>
      ) : (
        <RewardView reward={reward.data} />
      )}
    </AppLayout>
  );
}

// 現在の時刻（秒まで）。画面の写真ではないことをお店の人が確かめるため
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function RewardView({ reward }: { reward: CampaignReward }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const now = useNow();
  const [confirm, setConfirm] = useState(false);
  const expired = isRewardExpired(reward.expiresAt, now);
  const used = reward.usedAt !== null;
  const Ticket = ShopIcons.campaign;

  const use = useMutation({
    mutationFn: () => markRewardUsed(reward.id),
    onSuccess: async () => {
      setConfirm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reward(reward.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.mine }),
      ]);
    },
    onError: async (err) => {
      setConfirm(false);
      toast.show({ type: 'error', message: errorMessage(err) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reward(reward.id) });
    },
  });

  const time = now.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });

  return (
    <main className={styles.main}>
      <section className={styles.card} aria-label="特典">
        <p className={styles.shop}>
          <span className={styles.badge}>
            <Ticket size={16} aria-hidden="true" />
          </span>
          {reward.campaign.shopName}
        </p>
        <p className={styles.benefit}>{reward.campaign.benefit}</p>
        <p className={styles.title}>{reward.campaign.title}</p>
        <p className={styles.sub}>受け取った日時：{formatDateTime(reward.issuedAt)}</p>
        {used ? (
          <p className={styles.used} role="status">
            {RewardMessages.used(formatDateTime(reward.usedAt ?? ''))}
          </p>
        ) : expired ? (
          <p className={styles.expired} role="status">
            {RewardMessages.expired}
          </p>
        ) : (
          <p className={styles.valid}>{RewardMessages.validToday}</p>
        )}
      </section>

      {/* 動く表示：現在の時刻（秒まで）とゆっくり回る模様 */}
      {!used && !expired && (
        <section className={styles.live} aria-label="現在の時刻">
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.clock}>{time}</span>
        </section>
      )}

      {!used && !expired && (
        <Button variant="secondary" fullWidth onClick={() => setConfirm(true)}>
          {RewardMessages.useButton}
        </Button>
      )}

      <ConfirmDialog
        open={confirm}
        title="使用済みにする"
        message={RewardMessages.useConfirm}
        confirmLabel="使用済みにする"
        loading={use.isPending}
        onConfirm={() => use.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </main>
  );
}
