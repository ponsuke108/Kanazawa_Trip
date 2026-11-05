import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkCampaignEligibility } from '@/api/campaigns';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { deleteSpotPost, getSpotPost, saveSpotPost, spotPostImagePaths } from '@/api/spotPosts';
import { getMyShop } from '@/api/shops';
import { getSpot } from '@/api/spots';
import { uploadSpotPostImage } from '@/api/storage';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { CampaignPanel } from '@/components/common/CampaignPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/common/useToast';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { Messages, RewardMessages, Toasts, UiMessages } from '@/constants/messages';
import { SPOT_POST_BODY_MAX, SPOT_POST_IMAGES_MAX } from '@/constants/spots';
import { useCurrentUser } from '@/hooks/useAuth';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { toEligibilityView, type EligibilityView } from '@/lib/campaign';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, MapIcons, StateIcons } from '@/lib/icons';
import { getCurrentPosition, type Position, type PositionError } from '@/lib/location';
import type { Campaign, SpotOrCandidate, SpotPost } from '@/types/models';
import styles from './SpotPostPage.module.css';

type Photo = { path: string; url: string };

// 位置の確認の状態（BR-28）
type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'done'; view: EligibilityView; campaign: Campaign | null }
  | { state: 'error'; error: PositionError | 'failed' };

// 選んだスポットの表示名
function nameOf(s: SpotOrCandidate): string {
  return s.kind === 'spot' ? s.spot.name : s.candidate.name;
}

// S-17 スポットの投稿（6.4、F-51、F-64、BR-13、BR-21、BR-28）。/posts/new?spot=:spotId と /posts/:postId/edit。
// キャンペーン中のお店では、押したときだけ現在地を取って確かめる。位置は保存しない
export function SpotPostPage() {
  const { postId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editing = postId !== undefined;
  const spotParam = Number(params.get('spot'));
  const initialSpotId = Number.isInteger(spotParam) && spotParam > 0 ? spotParam : null;

  const post = useQuery({
    queryKey: ['posts', 'edit', postId ?? ''],
    queryFn: () => getSpotPost(postId ?? ''),
    enabled: editing,
    staleTime: Infinity,
    gcTime: 0,
  });
  const initialSpot = useQuery({
    queryKey: queryKeys.spot.detail(initialSpotId ?? 0),
    queryFn: () => getSpot(initialSpotId ?? 0),
    enabled: !editing && initialSpotId !== null,
  });

  const title = editing ? '投稿を編集' : 'スポットを投稿';
  const loading = editing ? post.isPending : initialSpotId !== null && initialSpot.isPending;
  const error = editing ? post.error : initialSpot.error;

  if (loading || error || (editing && !post.data)) {
    return (
      <AppLayout showTabBar={false}>
        <PageHeader title={title} />
        <main className={styles.main}>
          {loading ? (
            <FullScreenLoading />
          ) : error ? (
            <ErrorState
              message={errorMessage(error)}
              onRetry={() => (editing ? post.refetch() : initialSpot.refetch())}
            />
          ) : (
            // 他人の投稿・見つからない投稿の編集URL
            <EmptyState
              icon={StateIcons.alert}
              title={UiMessages.postNotEditable}
              action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
            />
          )}
        </main>
      </AppLayout>
    );
  }

  const start: SpotOrCandidate | null = editing
    ? null
    : initialSpot.data
      ? { kind: 'spot', spot: initialSpot.data }
      : null;
  return <SpotPostForm key={postId ?? 'new'} post={post.data ?? null} initialSpot={start} />;
}

type FormProps = { post: SpotPost | null; initialSpot: SpotOrCandidate | null };

function SpotPostForm({ post, initialSpot }: FormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const resolveSpot = useResolveSpot();
  const editing = post !== null;
  const user = useCurrentUser();
  // お店は、自分のお店のスポットに投稿できない（BR-28）
  const myShop = useQuery({
    queryKey: queryKeys.shop.mine,
    queryFn: getMyShop,
    enabled: user.role === 'official',
  });

  const [spot, setSpot] = useState<SpotOrCandidate | null>(initialSpot);
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const [photos, setPhotos] = useState<Photo[]>(() => {
    if (!post) return [];
    const paths = spotPostImagePaths(post);
    return paths.map((path, i) => ({ path, url: post.imageUrls[i] ?? '' }));
  });
  const [body, setBody] = useState(post?.body ?? '');
  const [uploading, setUploading] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const allowLeave = useRef(false);

  // 使用中止のスポットには投稿できない（6.4 S-17）。編集のときはスポットを変えないので確かめない
  const inactive = !editing && spot?.kind === 'spot' && !spot.spot.isActive;
  const ownShop = !editing && spot?.kind === 'spot' && myShop.data?.spot.id === spot.spot.id;
  // キャンペーン中のお店のスポット（新しい投稿のときだけ。BR-28）
  const campaignSpot = !editing && !ownShop && spot?.kind === 'spot' && spot.spot.hasActiveCampaign;
  const eligible = check.state === 'done' && check.view.kind === 'eligible';
  const bodyLength = Array.from(body.trim()).length;
  const bodyOk = bodyLength >= 1 && bodyLength <= SPOT_POST_BODY_MAX;
  const hasSpot = editing || spot !== null;
  const canSubmit =
    hasSpot &&
    !inactive &&
    !ownShop &&
    check.state !== 'checking' &&
    photos.length >= 1 &&
    bodyOk &&
    uploading === 0;

  // 入力中に画面を離れようとしたら確認する
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const afterSave = async (spotId: number, rewardId: string | null = null) => {
    allowLeave.current = true;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spots }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.mine }),
      queryClient.invalidateQueries({ queryKey: queryKeys.shop.all }),
    ]);
    // キャンペーンの対象者なら特典の画面（S-23）、そうでなければ S-05（履歴を置き換え）
    navigate(rewardId ? `/rewards/${rewardId}` : `/spots/${spotId}`, { replace: true });
  };

  // 「現在地で確かめる」：押したときだけ現在地を取り、RPC で確かめる（BR-28）
  const runCheck = async () => {
    if (spot?.kind !== 'spot') return;
    setCheck({ state: 'checking' });
    let pos: Position;
    try {
      pos = await getCurrentPosition();
    } catch (e) {
      setCheck({ state: 'error', error: e as PositionError });
      return;
    }
    try {
      const result = await checkCampaignEligibility({ spotId: spot.spot.id, ...pos });
      setCheck({
        state: 'done',
        view: toEligibilityView(result, pos.accuracy),
        campaign: result.campaign,
      });
    } catch {
      setCheck({ state: 'error', error: 'failed' });
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      // 場所の候補なら、ここでスポットとして登録する（BR-20）
      const spotId = post
        ? post.spot.id
        : (await resolveSpot.mutateAsync(spot as SpotOrCandidate)).spotId;
      // 対象と分かっていたら、投稿するときにもう一度現在地を取って渡す（確かめてから移動した場合に備える。
      // 位置は保存しない。取れなければふつうの投稿になる。BR-28）
      let position: Position | null = null;
      if (eligible) {
        try {
          position = await getCurrentPosition();
        } catch {
          position = null;
        }
      }
      const { rewardId } = await saveSpotPost({
        id: post?.id ?? null,
        spotId,
        body: body.trim(),
        imagePaths: photos.map((p) => p.path),
        position,
      });
      return { spotId, rewardId };
    },
    onSuccess: async ({ spotId, rewardId }) => {
      toast.show({ type: 'success', message: editing ? Toasts.updated : Toasts.posted });
      await afterSave(spotId, rewardId);
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const remove = useMutation({
    mutationFn: () => deleteSpotPost(post?.id ?? ''),
    onSuccess: async () => {
      setConfirmDelete(false);
      toast.show({ type: 'success', message: Toasts.deleted });
      await afterSave(post?.spot.id ?? 0);
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  // 選んだ時点で縮小し、撮影場所などの情報を消してアップロードする（BR-13）
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, SPOT_POST_IMAGES_MAX - photos.length);
    e.target.value = '';
    if (files.length === 0) return;
    setDirty(true);
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const photo = await uploadSpotPostImage(file);
        setPhotos((prev) => (prev.length < SPOT_POST_IMAGES_MAX ? [...prev, photo] : prev));
      } catch (err) {
        const unreadable = isApiError(err) && err.code === 'VALIDATION';
        toast.show({
          type: 'error',
          message: unreadable ? UiMessages.imageUnreadable : errorMessage(err),
        });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const AddImage = ActionIcons.addImage;
  const Send = ActionIcons.publish;
  const canAddPhoto = photos.length + uploading < SPOT_POST_IMAGES_MAX;

  return (
    <AppLayout showTabBar={false} bottomBar>
      <PageHeader
        title={editing ? '投稿を編集' : 'スポットを投稿'}
        right={
          editing ? (
            <DropdownMenu
              items={[
                {
                  label: '削除',
                  icon: ActionIcons.delete,
                  danger: true,
                  onSelect: () => setConfirmDelete(true),
                },
              ]}
            />
          ) : undefined
        }
      />
      <main className={styles.main}>
        {/* 対象と分かったときだけ、上にキャンペーンを出す（BR-28） */}
        {eligible && check.state === 'done' && check.campaign && (
          <div className={styles.campaign}>
            <CampaignPanel campaign={check.campaign}>
              <p className={styles.campaignStrong}>{RewardMessages.showToShop}</p>
              <p className={styles.notice}>{RewardMessages.labelNotice}</p>
            </CampaignPanel>
          </div>
        )}

        <section className={styles.field} aria-labelledby="post-spot">
          <h2 id="post-spot" className={styles.label}>
            スポット
          </h2>
          {editing ? (
            // 編集のときはスポットを変えられない（BR-21）
            <p className={styles.spotName}>{post.spot.name}</p>
          ) : spot ? (
            <div className={styles.spotRow}>
              <p className={styles.spotName}>{nameOf(spot)}</p>
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
          {inactive && (
            <p className={styles.error} role="alert">
              {UiMessages.cannotPostSpot}
            </p>
          )}
          {ownShop && (
            <p className={styles.error} role="alert">
              {RewardMessages.ownShop}
            </p>
          )}
        </section>

        {campaignSpot && !eligible && (
          <section className={styles.checkBox} aria-label="位置の確認">
            <p className={styles.checkLead}>{RewardMessages.campaignShop}</p>
            <p className={styles.notice}>{RewardMessages.locationUse}</p>
            <Button
              variant="secondary"
              icon={MapIcons.locate}
              loading={check.state === 'checking'}
              onClick={() => void runCheck()}
            >
              {RewardMessages.checkButton}
            </Button>
            {check.state !== 'idle' && check.state !== 'checking' && (
              <p className={styles.checkResult} role="status">
                {checkMessage(check)}
              </p>
            )}
          </section>
        )}

        <section className={styles.field} aria-labelledby="post-photos">
          <div className={styles.labelRow}>
            <h2 id="post-photos" className={styles.label}>
              写真
            </h2>
            <span className={styles.counter}>
              {photos.length}/{SPOT_POST_IMAGES_MAX}
            </span>
          </div>
          {photos.length > 0 && (
            <ul className={styles.photos}>
              {photos.map((p, i) => (
                <li key={p.path} className={styles.photoItem}>
                  <img src={p.url} alt={`写真${i + 1}枚目`} className={styles.photo} />
                  <IconButton
                    icon={ActionIcons.delete}
                    label={`写真${i + 1}枚目を削除`}
                    className={styles.photoDelete}
                    onClick={() => {
                      setDirty(true);
                      setPhotos((prev) => prev.filter((x) => x.path !== p.path));
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e)}
          />
          <Button
            variant="secondary"
            icon={AddImage}
            fullWidth
            loading={uploading > 0}
            disabled={!canAddPhoto}
            onClick={() => fileInput.current?.click()}
          >
            写真を追加
          </Button>
          {/* 写真の注意（BR-21） */}
          <p className={styles.notice}>
            {Messages.photoNotice}。{UiMessages.photoShownOnMap}
          </p>
        </section>

        <section className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="post-body" className={styles.label}>
              ひとこと
            </label>
            <span
              className={`${styles.counter} ${bodyLength > SPOT_POST_BODY_MAX ? styles.over : ''}`}
            >
              {bodyLength}/{SPOT_POST_BODY_MAX}
            </span>
          </div>
          <textarea
            id="post-body"
            className={styles.textarea}
            rows={4}
            value={body}
            placeholder="行ってみてよかったこと、おすすめの時間など"
            onChange={(e) => {
              setDirty(true);
              setBody(e.target.value);
            }}
          />
        </section>
      </main>

      <BottomActionBar>
        <Button
          icon={Send}
          disabled={!canSubmit}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {editing ? '更新する' : '投稿する'}
        </Button>
      </BottomActionBar>

      <PlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(r) => {
          setSpot(r);
          setCheck({ state: 'idle' });
          setDirty(true);
          setSearchOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="削除"
        message={Messages.postDeleteConfirm}
        confirmLabel="削除する"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="未保存の変更"
        message={Messages.unsavedConfirm}
        confirmLabel="移動する"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </AppLayout>
  );
}

// 位置の確認の結果の文言（6.4 S-17、BR-28）
function checkMessage(check: Check): string {
  if (check.state === 'error') {
    return check.error === 'denied' ? RewardMessages.denied : RewardMessages.unavailable;
  }
  if (check.state !== 'done') return '';
  switch (check.view.kind) {
    case 'eligible':
      return RewardMessages.eligible;
    case 'far':
      return RewardMessages.far(check.view.distanceM);
    case 'inaccurate':
      return RewardMessages.inaccurate(check.view.accuracyM);
    case 'already':
      return RewardMessages.already;
    case 'noCampaign':
      return RewardMessages.noCampaign;
  }
}
