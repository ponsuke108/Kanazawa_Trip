import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { campaignImagePath, endCampaign, saveCampaign } from '@/api/campaigns';
import { queryKeys } from '@/api/queryKeys';
import { getMyShop, updateShop } from '@/api/shops';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { CampaignForm } from '@/components/common/CampaignForm';
import { CampaignPanel } from '@/components/common/CampaignPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { TextAreaField } from '@/components/common/TextAreaField';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { ShopMessages } from '@/constants/messages';
import {
  campaignIssues,
  campaignPhase,
  CampaignPhaseLabels,
  campaignToInput,
  emptyCampaignInput,
  todayJst,
} from '@/lib/campaign';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, ShopIcons } from '@/lib/icons';
import type { CampaignInput, ShopDetail } from '@/types/models';
import styles from './ShopPage.module.css';

// S-20 お店の管理（6.6、F-62、F-63、BR-27）。お店だけ（RequireRole official）
export function ShopPage() {
  const shop = useQuery({ queryKey: queryKeys.shop.mine, queryFn: getMyShop });
  return (
    <AppLayout showTabBar={false}>
      <PageHeader title="お店の管理" />
      {shop.isPending ? (
        <FullScreenLoading />
      ) : shop.isError ? (
        <main className={styles.main}>
          <ErrorState message={errorMessage(shop.error)} onRetry={() => shop.refetch()} />
        </main>
      ) : !shop.data ? (
        <main className={styles.main}>
          <EmptyState icon={ShopIcons.shop} title={ShopMessages.noShop} />
        </main>
      ) : (
        <ShopView shop={shop.data} />
      )}
    </AppLayout>
  );
}

function ShopView({ shop }: { shop: ShopDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = todayJst();
  const suspended = shop.status === 'suspended';
  const [editingInfo, setEditingInfo] = useState(false);
  const [name, setName] = useState(shop.name);
  const [introduction, setIntroduction] = useState(shop.introduction);
  const [draft, setDraft] = useState<CampaignInput | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const campaign = shop.campaign;
  const phase = campaign ? campaignPhase(campaign, today) : null;
  // 期間が過ぎたキャンペーンは、新しく作るときに終える（同時に1つ。BR-27）
  const expired = campaign && campaign.status === 'active' && phase === 'finished';
  const canCreate = !suspended && (!campaign || expired);
  const canEdit = !suspended && campaign && campaign.status === 'active' && !expired;

  // 第3段階の操作のあとは spots、shop、applications、admin を読み直す（11.2）
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shop.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.spots }),
    ]);

  const saveInfo = useMutation({
    mutationFn: () => updateShop({ name: name.trim(), introduction: introduction.trim() }),
    onSuccess: async () => {
      setEditingInfo(false);
      toast.show({ type: 'success', message: ShopMessages.shopSaved });
      await refresh();
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const save = useMutation({
    mutationFn: async (input: CampaignInput) => {
      if (input.id === null && expired && campaign) await endCampaign(campaign.id);
      return saveCampaign(input);
    },
    onSuccess: async () => {
      setDraft(null);
      toast.show({ type: 'success', message: ShopMessages.campaignSaved });
      await refresh();
    },
    onError: (err) =>
      toast.show({
        type: 'error',
        message:
          isApiError(err) && err.code === 'LIMIT_REACHED'
            ? ShopMessages.oneCampaign
            : errorMessage(err),
      }),
  });

  const end = useMutation({
    mutationFn: () => endCampaign(campaign?.id ?? ''),
    onSuccess: async () => {
      setConfirmEnd(false);
      toast.show({ type: 'success', message: ShopMessages.campaignEnded });
      await refresh();
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const nameLength = Array.from(name.trim()).length;
  const introLength = Array.from(introduction.trim()).length;
  const infoOk = nameLength >= 1 && nameLength <= 30 && introLength <= 300;

  return (
    <main className={styles.main}>
      {suspended && (
        <p className={styles.alert} role="alert">
          {ShopMessages.suspended}
        </p>
      )}

      <section className={styles.section} aria-labelledby="shop-info">
        <h2 id="shop-info" className={styles.heading}>
          お店
        </h2>
        {editingInfo ? (
          <div className={styles.card}>
            <TextField
              label="お店の名前"
              value={name}
              counter={{ current: nameLength, max: 30 }}
              onChange={(e) => setName(e.target.value)}
            />
            <TextAreaField
              label="お店の紹介"
              value={introduction}
              counter={{ current: introLength, max: 300 }}
              onChange={(e) => setIntroduction(e.target.value)}
            />
            <div className={styles.buttons}>
              <Button
                variant="ghost"
                onClick={() => {
                  setName(shop.name);
                  setIntroduction(shop.introduction);
                  setEditingInfo(false);
                }}
              >
                やめる
              </Button>
              <Button
                disabled={!infoOk}
                loading={saveInfo.isPending}
                onClick={() => saveInfo.mutate()}
              >
                保存する
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <p className={styles.shopName}>{shop.name}</p>
            <Link to={`/spots/${shop.spot.id}`} className={styles.link}>
              スポット：{shop.spot.name}
            </Link>
            {shop.introduction && <p className={styles.text}>{shop.introduction}</p>}
            <div>
              <Button
                variant="secondary"
                icon={ActionIcons.edit}
                onClick={() => setEditingInfo(true)}
              >
                お店の情報を変える
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="shop-campaign">
        <h2 id="shop-campaign" className={styles.heading}>
          キャンペーン
        </h2>
        {draft ? (
          <div className={styles.card}>
            <CampaignForm value={draft} onChange={setDraft} />
            <div className={styles.buttons}>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                やめる
              </Button>
              <Button
                disabled={Object.keys(campaignIssues(draft)).length > 0}
                loading={save.isPending}
                onClick={() => save.mutate(draft)}
              >
                保存する
              </Button>
            </div>
          </div>
        ) : (
          <>
            {campaign && phase && (
              <>
                <p className={styles.phase}>状態：{CampaignPhaseLabels[phase]}</p>
                {campaign.status === 'stopped' && (
                  <p className={styles.alert} role="alert">
                    {ShopMessages.stopped}
                  </p>
                )}
                <CampaignPanel campaign={campaign} />
                <div className={styles.stats} aria-label="実績">
                  <p>
                    出した特典 <strong>{shop.rewardCount}</strong>
                  </p>
                  <p>
                    使用済み <strong>{shop.usedRewardCount}</strong>
                  </p>
                </div>
              </>
            )}
            {!campaign && <p className={styles.text}>今はキャンペーンがありません</p>}
            <div className={styles.buttons}>
              {canEdit && campaign && (
                <>
                  <Button
                    variant="secondary"
                    icon={ActionIcons.edit}
                    onClick={() => setDraft(campaignToInput(campaign, campaignImagePath(campaign)))}
                  >
                    変える
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmEnd(true)}>
                    終える
                  </Button>
                </>
              )}
              {canCreate && (
                <Button icon={ActionIcons.add} onClick={() => setDraft(emptyCampaignInput(today))}>
                  キャンペーンを作る
                </Button>
              )}
            </div>
          </>
        )}
        <p className={styles.sub}>{ShopMessages.spotPositionNotice}</p>
      </section>

      <ConfirmDialog
        open={confirmEnd}
        title="キャンペーンを終える"
        message={ShopMessages.endConfirm}
        confirmLabel="終える"
        danger
        loading={end.isPending}
        onConfirm={() => end.mutate()}
        onCancel={() => setConfirmEnd(false)}
      />
    </main>
  );
}
