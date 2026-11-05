import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addSpotToList, deleteList, getList, removeSpotFromList } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { AppLayout } from '@/components/common/AppLayout';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DropdownMenu } from '@/components/common/DropdownMenu';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/common/IconButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { useToast } from '@/components/common/useToast';
import { LazyMapView } from '@/components/map/LazyMapView';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { addedToListMessage, Messages, Toasts, UiMessages } from '@/constants/messages';
import { SpotTypeLabels } from '@/constants/spots';
import { listErrorMessage } from '@/hooks/useListMutations';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, BlockIcons, MapIcons, StateIcons } from '@/lib/icons';
import { ListNameSheet } from '@/pages/S15List/ListNameSheet';
import type { ListDetail, SpotOrCandidate } from '@/types/models';
import styles from './ListPage.module.css';

const MAP_HEIGHT = '33dvh'; // 6.4 S-15：画面の約3分の1

// S-15 リスト詳細（6.4、BR-18）。/lists/:listId（本人のみ）
export function ListPage() {
  const { listId = '' } = useParams();
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: queryKeys.lists.detail(listId),
    queryFn: () => getList(listId),
  });
  const data = list.data;

  if (!data) {
    return (
      <AppLayout showTabBar>
        <PageHeader title="リスト" backTo="/lists" />
        <main className={styles.main}>
          {list.isPending ? (
            <PlanCardSkeletonList count={3} />
          ) : list.isError ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState
              icon={StateIcons.noResults}
              title={UiMessages.listNotFound}
              action={<Button onClick={() => navigate('/')}>ホームへ</Button>}
            />
          )}
        </main>
      </AppLayout>
    );
  }
  return <ListDetailView key={data.id} list={data} />;
}

function ListDetailView({ list }: { list: ListDetail }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const resolve = useResolveSpot();
  const [choosing, setChoosing] = useState(false);
  // 印：初めは全部（使用中止のスポットはプランに入れられないので除く。BR-18）
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });

  const add = useMutation({
    mutationFn: async (spotId: number) => addSpotToList(list.id, spotId),
    onSuccess: async ({ added }) => {
      await invalidate();
      toast.show(
        added
          ? { type: 'success', message: addedToListMessage(list.name) }
          : { type: 'info', message: Messages.alreadyInList },
      );
    },
    onError: (err) => toast.show({ type: 'error', message: listErrorMessage(err, 'spot') }),
  });

  // 「元に戻す」：外したスポットを入れ直す（知らせは出さない）。入れた順の最後に戻る
  const undo = useMutation({
    mutationFn: (spotId: number) => addSpotToList(list.id, spotId),
    onSuccess: invalidate,
    onError: (err) => toast.show({ type: 'error', message: listErrorMessage(err, 'spot') }),
  });

  // 確認なしで外し、トーストで「元に戻す」（6.4 S-15）
  const remove = useMutation({
    mutationFn: (spotId: number) => removeSpotFromList(list.id, spotId),
    onSuccess: async (_d, spotId) => {
      await invalidate();
      toast.show({
        type: 'info',
        message: Toasts.removedFromList,
        action: { label: '元に戻す', onClick: () => undo.mutate(spotId) },
      });
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const removeList = useMutation({
    mutationFn: () => deleteList(list.id),
    onSuccess: async () => {
      setConfirmDelete(false);
      toast.show({ type: 'success', message: Toasts.deleted });
      await invalidate();
      navigate('/create', { replace: true });
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const addFromSearch = async (r: SpotOrCandidate) => {
    setSearchOpen(false);
    try {
      const { spotId } = await resolve.mutateAsync(r);
      add.mutate(spotId);
    } catch (err) {
      toast.show({ type: 'error', message: errorMessage(err) });
    }
  };

  const startChoosing = () => {
    setChecked(new Set(list.spots.filter((s) => s.isActive).map((s) => s.id)));
    setChoosing(true);
  };
  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // 印を付けたスポットを、リストの並びのまま S-06 のブロックにする（BR-18）
  const create = () => {
    const ids = list.spots.filter((s) => checked.has(s.id)).map((s) => s.id);
    navigate(`/plans/new?step=blocks&list=${list.id}&spots=${ids.join(',')}`);
  };

  const empty = list.spots.length === 0;
  const Remove = ActionIcons.close;

  return (
    <AppLayout showTabBar bottomBar={!empty}>
      <PageHeader
        title={list.name}
        backTo="/lists"
        right={
          <DropdownMenu
            items={[
              { label: '名前を変える', icon: ActionIcons.edit, onSelect: () => setRenaming(true) },
              {
                label: 'リストを削除',
                icon: ActionIcons.delete,
                danger: true,
                onSelect: () => setConfirmDelete(true),
              },
            ]}
          />
        }
      />
      <main className={styles.main}>
        {empty ? (
          <EmptyState
            icon={BlockIcons.spot}
            title={UiMessages.noListSpots}
            action={
              <Button icon={ActionIcons.search} onClick={() => setSearchOpen(true)}>
                場所を探して追加
              </Button>
            }
          />
        ) : (
          <>
            {/* 写真がなくても色の丸で出す（BR-24）。番号は付けない */}
            <div className={styles.map}>
              <LazyMapView spots={list.spots} fitToSpots height={MAP_HEIGHT} />
            </div>
            <ul className={styles.rows}>
              {list.spots.map((s) => {
                const sub = s.description ?? s.address;
                return (
                  <li key={s.id} className={styles.row}>
                    {choosing && (
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={checked.has(s.id)}
                        disabled={!s.isActive}
                        onChange={() => toggle(s.id)}
                        aria-label={`${s.name}をプランに入れる`}
                      />
                    )}
                    <Link to={`/spots/${s.id}`} className={styles.rowLink}>
                      <span className={styles.nameRow}>
                        <span className={styles.name}>{s.name}</span>
                        <span className={styles.label}>{SpotTypeLabels[s.spotType]}</span>
                        {!s.isActive && (
                          <span className={styles.inactive}>{UiMessages.inactiveSpot}</span>
                        )}
                      </span>
                      {sub && <span className={styles.sub}>{sub}</span>}
                    </Link>
                    {!choosing && (
                      <IconButton
                        icon={Remove}
                        label={`${s.name}をリストから外す`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(s.id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!choosing && !empty && (
          <div className={styles.adds}>
            <Button
              variant="secondary"
              icon={ActionIcons.search}
              onClick={() => setSearchOpen(true)}
            >
              場所を探して追加
            </Button>
            <Button variant="secondary" icon={MapIcons.map} onClick={() => navigate('/map')}>
              地図で探す
            </Button>
          </div>
        )}
        {choosing && checked.size === 1 && <p className={styles.note}>{UiMessages.needTwoSpots}</p>}
      </main>

      {!empty && (
        <BottomActionBar aboveTabBar>
          {choosing ? (
            <>
              <Button variant="secondary" onClick={() => setChoosing(false)}>
                やめる
              </Button>
              <Button icon={ActionIcons.create} disabled={checked.size === 0} onClick={create}>
                作る（{checked.size}か所）
              </Button>
            </>
          ) : (
            <Button icon={ActionIcons.create} onClick={startChoosing}>
              このリストでプランを作る
            </Button>
          )}
        </BottomActionBar>
      )}

      <PlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(r) => void addFromSearch(r)}
      />
      <ListNameSheet
        open={renaming}
        mode="rename"
        listId={list.id}
        initialName={list.name}
        onClose={() => setRenaming(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="リストを削除"
        message={Messages.listDeleteConfirm}
        confirmLabel="削除する"
        danger
        loading={removeList.isPending}
        onConfirm={() => removeList.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppLayout>
  );
}
