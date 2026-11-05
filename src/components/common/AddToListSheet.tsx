import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLists } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { PlanCardSkeletonList } from '@/components/common/PlanCardSkeleton';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { addedToListMessage, Messages, UiMessages } from '@/constants/messages';
import { listErrorMessage, useListMutations } from '@/hooks/useListMutations';
import { useResolveSpot } from '@/hooks/useResolveSpot';
import { errorMessage } from '@/lib/errorMessage';
import { ListIcons } from '@/lib/icons';
import type { SpotOrCandidate } from '@/types/models';
import styles from './AddToListSheet.module.css';

type Props = {
  spot: SpotOrCandidate;
  open: boolean;
  onClose: () => void;
};

const LIST_NAME_MAX = 30; // BR-18

// リストを選ぶシート（7.6、BR-18）。押したリストにその場で入れる。新しいリストを作って入れることもできる。
// 場所の候補は、入れるときにスポットとして登録する（BR-20）
export function AddToListSheet({ spot, open, onClose }: Props) {
  const toast = useToast();
  const lists = useQuery({ queryKey: queryKeys.lists.all, queryFn: getLists, enabled: open });
  const resolve = useResolveSpot();
  const { create, add } = useListMutations();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const spotId = spot.kind === 'spot' ? spot.spot.id : spot.candidate.existingSpotId;
  const busy = resolve.isPending || add.isPending || create.isPending;
  const nameLength = Array.from(newName.trim()).length;
  const nameOk = nameLength >= 1 && nameLength <= LIST_NAME_MAX;

  const putInto = async (listId: string, listName: string) => {
    try {
      const { spotId: id } = await resolve.mutateAsync(spot);
      const { added } = await add.mutateAsync({ listId, spotId: id });
      // すでに入っていれば知らせて何もしない（BR-18）
      toast.show(
        added
          ? { type: 'success', message: addedToListMessage(listName) }
          : { type: 'info', message: Messages.alreadyInList },
      );
      onClose();
    } catch (err) {
      toast.show({ type: 'error', message: listErrorMessage(err, 'spot') });
    }
  };

  const createAndPut = async () => {
    const name = newName.trim();
    try {
      const { id } = await create.mutateAsync(name);
      setNewName('');
      setCreating(false);
      await putInto(id, name);
    } catch (err) {
      toast.show({ type: 'error', message: listErrorMessage(err, 'list') });
    }
  };

  const Added = ListIcons.list;
  return (
    <BottomSheet open={open} title="リストに追加" onClose={onClose}>
      <div className={styles.body}>
        {lists.isPending ? (
          <PlanCardSkeletonList count={2} />
        ) : lists.isError ? (
          <ErrorState message={errorMessage(lists.error)} onRetry={() => lists.refetch()} />
        ) : (
          <ul className={styles.list}>
            {lists.data.map((l) => {
              const inList = spotId !== null && l.spotIds.includes(spotId);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    className={styles.row}
                    disabled={busy}
                    onClick={() => void putInto(l.id, l.name)}
                  >
                    <span className={styles.name}>{l.name}</span>
                    <span className={styles.meta}>
                      {inList ? (
                        <span className={styles.inList}>
                          <Added size={14} aria-hidden="true" />
                          {Messages.alreadyInList}
                        </span>
                      ) : (
                        `${l.spotCount}か所`
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {creating ? (
          <form
            className={styles.newForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (nameOk && !busy) void createAndPut();
            }}
          >
            <TextField
              label="新しいリストの名前"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              counter={{ current: nameLength, max: LIST_NAME_MAX }}
              hint={UiMessages.listNameRule}
              autoFocus
            />
            <Button type="submit" icon={ListIcons.newList} disabled={!nameOk} loading={busy}>
              作って入れる
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            icon={ListIcons.newList}
            fullWidth
            onClick={() => setCreating(true)}
          >
            新しいリスト
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
