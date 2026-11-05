import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import { UiMessages } from '@/constants/messages';
import { listErrorMessage } from '@/hooks/useListMutations';

describe('リストの上限のメッセージ（BR-18）', () => {
  it('リストを作るときの LIMIT_REACHED は「20個まで」', () => {
    expect(listErrorMessage(new ApiError('LIMIT_REACHED'), 'list')).toBe(UiMessages.listLimit);
  });

  it('スポットを入れるときの LIMIT_REACHED は「30か所まで」', () => {
    expect(listErrorMessage(new ApiError('LIMIT_REACHED'), 'spot')).toBe(UiMessages.listSpotLimit);
  });
});
