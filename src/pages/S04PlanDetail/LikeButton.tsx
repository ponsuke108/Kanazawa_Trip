import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasLiked, likePlan, unlikePlan } from '@/api/likes';
import { queryKeys } from '@/api/queryKeys';
import { useToast } from '@/components/common/useToast';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons } from '@/lib/icons';
import type { PlanDetail } from '@/types/models';
import styles from './LikeButton.module.css';

type Props = { plan: PlanDetail; own: boolean };

// BR-08：押した瞬間に表示を切り替え、失敗したら戻す。自分のプランは数だけ
export function LikeButton({ plan, own }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const likedKey = queryKeys.likes.has(plan.id);
  const detailKey = queryKeys.plans.detail(plan.id);
  const Heart = ActionIcons.like;

  const liked = useQuery({
    queryKey: likedKey,
    queryFn: () => hasLiked(plan.id),
    enabled: !own,
  });

  const toggle = useMutation({
    mutationFn: (next: boolean) => (next ? likePlan(plan.id) : unlikePlan(plan.id)),
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: likedKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prevLiked = queryClient.getQueryData<boolean>(likedKey);
      const prevPlan = queryClient.getQueryData<PlanDetail | null>(detailKey);
      queryClient.setQueryData(likedKey, next);
      if (prevPlan) {
        queryClient.setQueryData(detailKey, {
          ...prevPlan,
          likeCount: prevPlan.likeCount + (next ? 1 : -1),
        });
      }
      return { prevLiked, prevPlan };
    },
    onError: (err, _next, ctx) => {
      queryClient.setQueryData(likedKey, ctx?.prevLiked);
      if (ctx?.prevPlan) queryClient.setQueryData(detailKey, ctx.prevPlan);
      toast.show({ type: 'error', message: errorMessage(err) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      void queryClient.invalidateQueries({ queryKey: likedKey });
    },
  });

  if (own) {
    return (
      <span className={styles.count}>
        <Heart size={20} aria-hidden="true" />
        <span aria-label={`いいね ${plan.likeCount}`}>{plan.likeCount}</span>
      </span>
    );
  }

  const isLiked = liked.data === true;
  return (
    <button
      type="button"
      className={`${styles.button} ${isLiked ? styles.liked : ''}`}
      aria-pressed={isLiked}
      aria-label={isLiked ? `いいねを取り消す（${plan.likeCount}）` : `いいね（${plan.likeCount}）`}
      disabled={liked.isPending || toggle.isPending}
      onClick={() => toggle.mutate(!isLiked)}
    >
      <Heart size={20} aria-hidden="true" fill={isLiked ? 'currentColor' : 'none'} />
      <span>{plan.likeCount}</span>
    </button>
  );
}
