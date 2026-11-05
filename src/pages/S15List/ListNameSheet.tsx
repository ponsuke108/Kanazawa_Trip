import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createList, renameList } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { Toasts, UiMessages } from '@/constants/messages';
import { listErrorMessage } from '@/hooks/useListMutations';
import styles from './ListNameSheet.module.css';

type Props = {
  open: boolean;
  mode: 'create' | 'rename';
  listId?: string; // rename のとき
  initialName?: string;
  onClose: () => void;
  onDone?: (listId: string) => void;
};

const LIST_NAME_MAX = 30; // BR-18

// リストの名前を入れるシート（S-14 の「新しいリスト」、S-15 の「名前を変える」）。前後の空白は取り除く
export function ListNameSheet({ open, mode, listId, initialName = '', onClose, onDone }: Props) {
  return open ? (
    <NameForm
      mode={mode}
      listId={listId}
      initialName={initialName}
      onClose={onClose}
      onDone={onDone}
    />
  ) : null;
}

function NameForm({ mode, listId, initialName = '', onClose, onDone }: Omit<Props, 'open'>) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const length = Array.from(name.trim()).length;
  const ok = length >= 1 && length <= LIST_NAME_MAX;

  const save = useMutation({
    mutationFn: async () => {
      if (mode === 'create') return (await createList({ name: name.trim() })).id;
      await renameList(listId ?? '', name.trim());
      return listId ?? '';
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      if (mode === 'rename') toast.show({ type: 'success', message: Toasts.renamed });
      onClose();
      onDone?.(id);
    },
    onError: (err) => toast.show({ type: 'error', message: listErrorMessage(err, 'list') }),
  });

  return (
    <BottomSheet open title={mode === 'create' ? '新しいリスト' : '名前を変える'} onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) save.mutate();
        }}
      >
        <TextField
          label="リストの名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          counter={{ current: length, max: LIST_NAME_MAX }}
          hint={UiMessages.listNameRule}
          autoFocus
        />
        <Button type="submit" fullWidth disabled={!ok} loading={save.isPending}>
          {mode === 'create' ? '作る' : '変える'}
        </Button>
      </form>
    </BottomSheet>
  );
}
