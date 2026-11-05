import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { getMyApplication, submitApplication } from '@/api/shops';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { CampaignForm } from '@/components/common/CampaignForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { TextAreaField } from '@/components/common/TextAreaField';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { ShopMessages } from '@/constants/messages';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { campaignIssues, emptyCampaignInput, todayJst } from '@/lib/campaign';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ShopIcons } from '@/lib/icons';
import type { CampaignInput, ShopApplication, SpotOrCandidate } from '@/types/models';
import styles from './ApplyPage.module.css';

const LIMITS = { shopName: 30, introduction: 300, contactName: 30, contactPhone: 20 };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[0-9-]{1,20}$/;

function len(s: string): number {
  return Array.from(s.trim()).length;
}

// S-19 お店の申請（6.6、F-61、BR-26）。一般の利用者だけ（RequireRole user）
export function ApplyPage() {
  const mine = useQuery({ queryKey: queryKeys.applications.mine, queryFn: getMyApplication });
  return (
    <AppLayout showTabBar={false} bottomBar={mine.data?.status !== 'pending'}>
      <PageHeader title="お店として申請する" />
      {mine.isPending ? (
        <FullScreenLoading />
      ) : mine.isError ? (
        <main className={styles.main}>
          <ErrorState message={errorMessage(mine.error)} onRetry={() => mine.refetch()} />
        </main>
      ) : mine.data?.status === 'pending' ? (
        // 審査中の申請があるときは、入力欄を出さない
        <main className={styles.main}>
          <EmptyState icon={ShopIcons.shop} title={ShopMessages.pending} />
          <p className={styles.lead}>{ShopMessages.pendingLead}</p>
          <p className={styles.lead}>
            申請したお店：{mine.data.shopName}（{mine.data.spot.name}）
          </p>
        </main>
      ) : (
        // 却下されたあとは、前の内容を入れた状態から始める
        <ApplyForm previous={mine.data?.status === 'rejected' ? mine.data : null} />
      )}
    </AppLayout>
  );
}

function ApplyForm({ previous }: { previous: ShopApplication | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const resolveSpot = useResolveSpot();
  const [spot, setSpot] = useState<SpotOrCandidate | null>(null);
  // 却下された申請のスポット（選び直さなければ、そのまま使う）
  const [previousSpot, setPreviousSpot] = useState(previous?.spot ?? null);
  const [shopName, setShopName] = useState(previous?.shopName ?? '');
  const [introduction, setIntroduction] = useState(previous?.introduction ?? '');
  const [contactName, setContactName] = useState(previous?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(previous?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(previous?.contactPhone ?? '');
  const [withCampaign, setWithCampaign] = useState(previous?.campaignDraft != null);
  const [campaign, setCampaign] = useState<CampaignInput>(
    previous?.campaignDraft ?? emptyCampaignInput(todayJst()),
  );
  const [agreeRequest, setAgreeRequest] = useState(false);
  const [agreeImage, setAgreeImage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

  const errors = {
    shopName:
      len(shopName) < 1
        ? 'お店の名前を入れてください'
        : len(shopName) > LIMITS.shopName
          ? `お店の名前は${LIMITS.shopName}文字までです`
          : null,
    introduction:
      len(introduction) > LIMITS.introduction ? `紹介は${LIMITS.introduction}文字までです` : null,
    contactName:
      len(contactName) < 1
        ? '担当者の名前を入れてください'
        : len(contactName) > LIMITS.contactName
          ? `担当者の名前は${LIMITS.contactName}文字までです`
          : null,
    contactEmail: EMAIL.test(contactEmail.trim()) ? null : 'メールアドレスの形で入れてください',
    contactPhone: PHONE.test(contactPhone.trim())
      ? null
      : '電話番号は数字とハイフンで20文字までです',
  };
  const campaignOk = !withCampaign || Object.keys(campaignIssues(campaign)).length === 0;
  const canSubmit =
    (spot !== null || previousSpot !== null) &&
    Object.values(errors).every((e) => e === null) &&
    campaignOk &&
    agreeRequest &&
    agreeImage;

  const submit = useMutation({
    mutationFn: async () => {
      // 場所の候補なら、ここでスポットとして登録する（BR-20）
      const spotId = spot ? (await resolveSpot.mutateAsync(spot)).spotId : (previousSpot?.id ?? 0);
      return submitApplication({
        spotId,
        shopName: shopName.trim(),
        introduction: introduction.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        campaignDraft: withCampaign ? campaign : null,
      });
    },
    onSuccess: async () => {
      setConfirm(false);
      toast.show({ type: 'success', message: ShopMessages.applied });
      await queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      navigate('/mypage');
    },
    onError: (err) => {
      setConfirm(false);
      // 1つのスポットにお店は1つ。審査中の申請も1つ（BR-26）
      if (isApiError(err) && err.code === 'LIMIT_REACHED') {
        setSpotError(ShopMessages.spotTaken);
        toast.show({ type: 'error', message: ShopMessages.spotTaken });
        return;
      }
      toast.show({ type: 'error', message: errorMessage(err) });
    },
  });

  const spotName = spot
    ? spot.kind === 'spot'
      ? spot.spot.name
      : spot.candidate.name
    : (previousSpot?.name ?? null);
  const Send = ActionIcons.publish;

  return (
    <>
      <main className={styles.main}>
        {previous && (
          <p className={styles.rejected} role="alert">
            {ShopMessages.rejected(previous.rejectReason)}
          </p>
        )}
        <p className={styles.lead}>{ShopMessages.applyLead}</p>

        <section className={styles.section} aria-labelledby="apply-spot">
          <h2 id="apply-spot" className={styles.heading}>
            お店のスポット
          </h2>
          {spotName ? (
            <div className={styles.spotRow}>
              <p className={styles.spotName}>{spotName}</p>
              <Button variant="ghost" onClick={() => setSearchOpen(true)}>
                変える
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              icon={ActionIcons.search}
              fullWidth
              onClick={() => setSearchOpen(true)}
            >
              スポットを選ぶ
            </Button>
          )}
          {spotError && (
            <p className={styles.error} role="alert">
              {spotError}
            </p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="apply-shop">
          <h2 id="apply-shop" className={styles.heading}>
            お店の情報
          </h2>
          <TextField
            label="お店の名前"
            value={shopName}
            counter={{ current: len(shopName), max: LIMITS.shopName }}
            error={shopName ? errors.shopName : null}
            onChange={(e) => setShopName(e.target.value)}
          />
          <TextAreaField
            label="お店の紹介（任意）"
            value={introduction}
            counter={{ current: len(introduction), max: LIMITS.introduction }}
            error={errors.introduction}
            onChange={(e) => setIntroduction(e.target.value)}
          />
        </section>

        <section className={styles.section} aria-labelledby="apply-contact">
          <h2 id="apply-contact" className={styles.heading}>
            担当者
          </h2>
          <p className={styles.sub}>{ShopMessages.contactNotice}</p>
          <TextField
            label="担当者の名前"
            value={contactName}
            autoComplete="name"
            counter={{ current: len(contactName), max: LIMITS.contactName }}
            error={contactName ? errors.contactName : null}
            onChange={(e) => setContactName(e.target.value)}
          />
          <TextField
            label="メールアドレス"
            type="email"
            autoComplete="email"
            value={contactEmail}
            error={contactEmail ? errors.contactEmail : null}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <TextField
            label="電話番号"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={contactPhone}
            placeholder="076-000-0000"
            error={contactPhone ? errors.contactPhone : null}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </section>

        <section className={styles.section} aria-labelledby="apply-campaign">
          <h2 id="apply-campaign" className={styles.heading}>
            最初のキャンペーン（任意）
          </h2>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={withCampaign}
              onChange={(e) => setWithCampaign(e.target.checked)}
            />
            キャンペーンも一緒に申請する
          </label>
          {withCampaign && <CampaignForm value={campaign} onChange={setCampaign} />}
        </section>

        <section className={styles.section} aria-labelledby="apply-agree">
          <h2 id="apply-agree" className={styles.heading}>
            同意
          </h2>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={agreeRequest}
              onChange={(e) => setAgreeRequest(e.target.checked)}
            />
            {ShopMessages.agreeNoRequest}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={agreeImage}
              onChange={(e) => setAgreeImage(e.target.checked)}
            />
            {ShopMessages.agreeImage}
          </label>
        </section>
      </main>

      <BottomActionBar>
        <Button icon={Send} disabled={!canSubmit} onClick={() => setConfirm(true)}>
          申請する
        </Button>
      </BottomActionBar>

      <PlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(result) => {
          setSpot(result);
          setPreviousSpot(null);
          setSpotError(null);
          setSearchOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirm}
        title="申請する"
        message={ShopMessages.applyConfirm}
        confirmLabel="申請する"
        loading={submit.isPending}
        onConfirm={() => submit.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
