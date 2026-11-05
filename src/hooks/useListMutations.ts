import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { addSpotToList, createList } from '@/api/lists';
import { queryKeys } from '@/api/queryKeys';
import { UiMessages } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';

// （v11）リストの上限（BR-18）のエラーを、何の上限かが分かる文言にする
export function listErrorMessage(err: unknown, kind: 'list' | 'spot'): string {
  if (isApiError(err) && err.code === 'LIMIT_REACHED') {
    return kind === 'list' ? UiMessages.listLimit : UiMessages.listSpotLimit;
  }
  return errorMessage(err);
}

// リストを作る・スポットを入れる。終わったら ['lists'] 全体を古くする（11.2）
export function useListMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
  const create = useMutation({
    mutationFn: (name: string) => createList({ name }),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: ({ listId, spotId }: { listId: string; spotId: number }) =>
      addSpotToList(listId, spotId),
    onSuccess: invalidate,
  });
  return { create, add };
}
