import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { deleteSpotPost, getSpotPost, saveSpotPost, spotPostImagePaths } from '@/api/spotPosts';
import { getSpot } from '@/api/spots';
import { uploadSpotPostImage } from '@/api/storage';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/common/useToast';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { Messages, Toasts, UiMessages } from '@/constants/messages';
import { SPOT_POST_BODY_MAX, SPOT_POST_IMAGES_MAX } from '@/constants/spots';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import type { SpotOrCandidate, SpotPost } from '@/types/models';
import styles from './SpotPostPage.module.css';

type Photo = { path: string; url: string };

// 選んだスポットの表示名
function nameOf(s: SpotOrCandidate): string {
  return s.kind === 'spot' ? s.spot.name : s.candidate.name;
}

// S-17 スポットの投稿（6.4、F-51、BR-13、BR-21）。/posts/new?spot=:spotId と /posts/:postId/edit。
// キャンペーン中のお店の位置の確認（BR-28）は I-37 で足す
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

  const [spot, setSpot] = useState<SpotOrCandidate | null>(initialSpot);
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
  const bodyLength = Array.from(body.trim()).length;
  const bodyOk = bodyLength >= 1 && bodyLength <= SPOT_POST_BODY_MAX;
  const hasSpot = editing || spot !== null;
  const canSubmit = hasSpot && !inactive && photos.length >= 1 && bodyOk && uploading === 0;

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

  const afterSave = async (spotId: number) => {
    allowLeave.current = true;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spots }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.mine }),
    ]);
    navigate(`/spots/${spotId}`, { replace: true });
  };

  const save = useMutation({
    mutationFn: async () => {
      // 場所の候補なら、ここでスポットとして登録する（BR-20）
      const spotId = post
        ? post.spot.id
        : (await resolveSpot.mutateAsync(spot as SpotOrCandidate)).spotId;
      await saveSpotPost({
        id: post?.id ?? null,
        spotId,
        body: body.trim(),
        imagePaths: photos.map((p) => p.path),
        position: null,
      });
      return spotId;
    },
    onSuccess: async (spotId) => {
      toast.show({ type: 'success', message: editing ? Toasts.updated : Toasts.posted });
      await afterSave(spotId);
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
        </section>

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
