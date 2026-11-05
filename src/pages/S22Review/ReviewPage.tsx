import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApplication, reviewApplication } from '@/api/admin';
import { campaignImageUrl } from '@/api/campaigns';
import { queryKeys } from '@/api/queryKeys';
import { getSpot } from '@/api/spots';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { CampaignPanel } from '@/components/common/CampaignPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/common/useToast';
import { LazyMapView } from '@/components/map/LazyMapView';
import { AdminMessages, ShopMessages } from '@/constants/messages';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ShopIcons, StateIcons } from '@/lib/icons';
import { ReasonDialog } from '@/pages/S21Admin/ReasonDialog';
import type { Campaign, ShopApplication } from '@/types/models';
import styles from './ReviewPage.module.css';

const MAP_HEIGHT = '160px';

// S-22 申請の審査（6.6、F-66、BR-26）。管理者だけ（RequireRole admin）
export function ReviewPage() {
  const { applicationId = '' } = useParams();
  const navigate = useNavigate();
  const app = useQuery({
    queryKey: queryKeys.admin.application(applicationId),
    queryFn: () => getApplication(applicationId),
  });
  const pending = app.data?.status === 'pending';
  return (
    <AppLayout showTabBar={false} bottomBar={pending}>
      <PageHeader title="申請の審査" />
      {app.isPending ? (
        <FullScreenLoading />
      ) : app.isError ? (
        <main className={styles.main}>
          <ErrorState message={errorMessage(app.error)} onRetry={() => app.refetch()} />
        </main>
      ) : !app.data ? (
        <main className={styles.main}>
          <EmptyState
            icon={StateIcons.noResults}
            title={AdminMessages.applicationNotFound}
            action={<Button onClick={() => navigate('/admin')}>管理者の画面へ</Button>}
          />
        </main>
      ) : (
        <ReviewView application={app.data} />
      )}
    </AppLayout>
  );
}

// 申請の最初のキャンペーンを、S-17 と同じ見た目で見せるための形
function draftToCampaign(app: ShopApplication): Campaign | null {
  const d = app.campaignDraft;
  if (!d) return null;
  return {
    id: 'draft',
    shopId: '',
    shopName: app.shopName,
    title: d.title,
    benefit: d.benefit,
    notice: d.notice,
    description: d.description,
    imageUrl: campaignImageUrl(d.imagePath),
    startsOn: d.startsOn,
    endsOn: d.endsOn,
    status: 'active',
  };
}

function ReviewView({ application }: { application: ShopApplication }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const spot = useQuery({
    queryKey: queryKeys.spot.detail(application.spot.id),
    queryFn: () => getSpot(application.spot.id),
  });
  const campaign = draftToCampaign(application);
  const pending = application.status === 'pending';

  const review = useMutation({
    mutationFn: (input: { approve: boolean; reason?: string }) =>
      reviewApplication({ id: application.id, ...input }),
    onSuccess: async (_d, input) => {
      setConfirmApprove(false);
      setRejectOpen(false);
      toast.show({
        type: 'success',
        message: input.approve ? AdminMessages.approved : AdminMessages.rejected,
      });
      // 第3段階の操作のあとは spots、shop、applications、admin 全体を読み直す（11.2）
      await Promise.all(
        [queryKeys.spots, queryKeys.shop.all, queryKeys.applications.all, queryKeys.admin.all].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      navigate('/admin?tab=applications', { replace: true });
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  return (
    <>
      <main className={styles.main}>
        {!pending && (
          <p className={styles.result} role="status">
            {AdminMessages.reviewed(application.status === 'approved' ? 'approved' : 'rejected')}
            {application.rejectReason && `（${application.rejectReason}）`}
          </p>
        )}

        <section className={styles.section} aria-labelledby="review-shop">
          <h2 id="review-shop" className={styles.heading}>
            お店
          </h2>
          <dl className={styles.items}>
            <dt>お店の名前</dt>
            <dd>{application.shopName}</dd>
            <dt>スポット</dt>
            <dd>
              <Link to={`/spots/${application.spot.id}`}>{application.spot.name}</Link>
            </dd>
            <dt>お店の紹介</dt>
            <dd>{application.introduction || 'なし'}</dd>
            <dt>申請日</dt>
            <dd>{formatDate(application.createdAt)}</dd>
          </dl>
          {spot.data && (
            <div className={styles.map}>
              <LazyMapView spots={[spot.data]} interactive={false} fitToSpots height={MAP_HEIGHT} />
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="review-contact">
          <h2 id="review-contact" className={styles.heading}>
            担当者
          </h2>
          <p className={styles.sub}>{ShopMessages.contactNotice}</p>
          <dl className={styles.items}>
            <dt>名前</dt>
            <dd>{application.contactName}</dd>
            <dt>メールアドレス</dt>
            <dd>{application.contactEmail}</dd>
            <dt>電話番号</dt>
            <dd>{application.contactPhone}</dd>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="review-campaign">
          <h2 id="review-campaign" className={styles.heading}>
            最初のキャンペーン
          </h2>
          {campaign ? <CampaignPanel campaign={campaign} /> : <p className={styles.sub}>なし</p>}
        </section>
      </main>

      {pending && (
        <BottomActionBar>
          <Button variant="danger" icon={ActionIcons.close} onClick={() => setRejectOpen(true)}>
            却下する
          </Button>
          <Button icon={ShopIcons.approve} onClick={() => setConfirmApprove(true)}>
            承認する
          </Button>
        </BottomActionBar>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="承認する"
        message={`「${application.shopName}」をお店として承認します。最初のキャンペーンがあれば、そのまま公開されます。`}
        confirmLabel="承認する"
        loading={review.isPending}
        onConfirm={() => review.mutate({ approve: true })}
        onCancel={() => setConfirmApprove(false)}
      />
      <ReasonDialog
        open={rejectOpen}
        title="却下する"
        confirmLabel="却下する"
        required
        danger
        loading={review.isPending}
        onConfirm={(reason) => review.mutate({ approve: false, reason })}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}
