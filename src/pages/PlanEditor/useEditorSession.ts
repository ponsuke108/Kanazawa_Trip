// 作成画面の読み込み・一時保存・保存（要件定義書 6.4 S-06〜S-09、11.4、BR-06、BR-09、BR-15）
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, isApiError } from '@/api/errors';
import { getPlan, savePlan } from '@/api/plans';
import { queryKeys } from '@/api/queryKeys';
import { useToast } from '@/components/common/useToast';
import { Toasts } from '@/constants/messages';
import { useCurrentUser } from '@/hooks/useAuth';
import {
  emptyEditorState,
  planToEditorState,
  toSavePlanInput,
  validatePlan,
  type EditorState,
} from '@/lib/blocks';
import { errorMessage } from '@/lib/errorMessage';
import { editorReducer, initialEditorState } from '@/pages/PlanEditor/editorReducer';
import { clearDraft, loadDraft, saveDraft, storageKey } from '@/pages/PlanEditor/editorStorage';
import type { PlanStatus, ValidationIssue } from '@/types/models';

export type EditorPhase = 'loading' | 'restore' | 'ready' | 'notEditable' | 'error';

type Args = { planId: string | null; fromId: string | null };

export function useEditorSession({ planId, fromId }: Args) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  // 'pending' の間は読み込み中（読み込みに失敗したら 'error' を返す）
  const [settled, setSettled] = useState<'pending' | 'restore' | 'ready' | 'notEditable'>(
    'pending',
  );
  const [pendingRestore, setPendingRestore] = useState<{
    stored: EditorState;
    base: EditorState;
  } | null>(null);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const allowLeave = useRef(false);

  // 編集なら planId、コピーなら from のプランを読み込む
  const sourceId = planId ?? fromId;
  const key = storageKey(planId);
  const source = useQuery({
    queryKey: queryKeys.plans.detail(sourceId ?? ''),
    queryFn: () => getPlan(sourceId ?? ''),
    enabled: sourceId !== null,
    staleTime: 0,
  });

  // 最初の状態を決める（描画中に1回だけ）。一時保存が残っていれば復元するか聞く（BR-15）
  if (settled === 'pending' && (sourceId === null || source.isSuccess)) {
    const plan = sourceId === null ? null : source.data;
    let base: EditorState | null;
    if (sourceId === null) {
      base = emptyEditorState();
    } else if (!plan || (planId !== null && plan.author.id !== user.id)) {
      // 存在しないプラン、他人のプランの編集URLは開けない（6.4 S-06）
      base = null;
    } else {
      base = planToEditorState(plan, { copy: planId === null }); // コピーは BR-07
    }
    if (base === null) {
      setSettled('notEditable');
    } else {
      const stored = loadDraft(key);
      if (stored) {
        setPendingRestore({ stored, base });
        setSettled('restore');
      } else {
        dispatch({ type: 'LOAD', state: base });
        setSettled('ready');
      }
    }
  }

  const phase: EditorPhase =
    settled === 'pending' ? (source.isError ? 'error' : 'loading') : settled;

  const answerRestore = useCallback(
    (restore: boolean) => {
      if (!pendingRestore) return;
      if (restore) {
        dispatch({ type: 'LOAD', state: { ...pendingRestore.stored, dirty: true } });
      } else {
        clearDraft(key);
        dispatch({ type: 'LOAD', state: pendingRestore.base });
      }
      setPendingRestore(null);
      setSettled('ready');
    },
    [pendingRestore, key],
  );

  // 変更のたびに一時保存する（BR-15）
  useEffect(() => {
    if (phase === 'ready' && state.dirty) saveDraft(key, state);
  }, [phase, state, key]);

  // 保存せずに作成画面から離れようとしたら確認する。ステップの切り替えでは確認しない
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      phase === 'ready' &&
      state.dirty &&
      !allowLeave.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  const save = useMutation({
    mutationFn: async (status: PlanStatus) => {
      const input = toSavePlanInput(state, status);
      // 画面でも確認する（BR-06）。データベース側でも同じ確認をする
      const issues = validatePlan(input, status === 'published' ? 'publish' : 'draft');
      if (issues.length > 0) throw new ApiError('VALIDATION', issues[0].code, issues);
      return { status, result: await savePlan(input) };
    },
    onSuccess: async ({ status, result }) => {
      clearDraft(key);
      allowLeave.current = true;
      dispatch({ type: 'MARK_SAVED', planId: result.id });
      setServerIssues([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      if (status === 'draft') {
        toast.show({ type: 'success', message: Toasts.draftSaved });
        navigate('/mypage?tab=mine');
      } else {
        const updating = state.originalStatus === 'published';
        toast.show({ type: 'success', message: updating ? Toasts.updated : Toasts.published });
        // 履歴を置き換え、戻るで作成画面に戻らないようにする（6.4 S-09）
        navigate(`/plans/${result.id}`, { replace: true });
      }
    },
    onError: (err) => {
      if (isApiError(err) && err.code === 'VALIDATION') {
        setServerIssues(err.issues);
      }
      toast.show({ type: 'error', message: errorMessage(err) });
    },
  });

  return {
    state,
    dispatch,
    phase,
    answerRestore,
    retry: () => source.refetch(),
    blocker,
    save,
    serverIssues,
    isEdit: planId !== null,
  };
}
