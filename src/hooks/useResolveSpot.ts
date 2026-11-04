import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { registerSpot } from '@/api/spots';
import type { SpotOrCandidate } from '@/types/models';

// （v11）S-16 で選んだものをスポットの id にする（BR-20）。
// 場所の候補なら、このとき登録する（リストに入れる・プランに加える・投稿するときに呼ぶ）。
// 同じ場所がすでにあれば、その id が返る（重複しない）
export function useResolveSpot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (result: SpotOrCandidate): Promise<{ spotId: number; reused: boolean }> => {
      if (result.kind === 'spot') return { spotId: result.spot.id, reused: true };
      return registerSpot(result.candidate);
    },
    onSuccess: (_data, result) => {
      if (result.kind === 'candidate')
        void queryClient.invalidateQueries({ queryKey: queryKeys.spots });
    },
  });
}
