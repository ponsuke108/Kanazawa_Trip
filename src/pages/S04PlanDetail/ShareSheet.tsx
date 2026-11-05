import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createShareLink, stopShareLink } from '@/api/plans';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { Messages, ShareMessages, Toasts } from '@/constants/messages';
import { errorMessage } from '@/lib/errorMessage';
import { formatTitle } from '@/lib/format';
import { ShareIcons } from '@/lib/icons';
import styles from './ShareSheet.module.css';

type Props = {
  open: boolean;
  planId: string;
  title: string;
  onClose: () => void;
};

// S-04 の「共有」（6.4、F-45、BR-30）。作成者だけに出す。下書きでも作れる。
// すでに共有していれば、同じリンクが返る（createShareLink）
export function ShareSheet({ open, planId, title, onClose }: Props) {
  const toast = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const create = useMutation({
    mutationFn: () => createShareLink(planId),
    onSuccess: ({ url: next }) => setUrl(next),
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const stop = useMutation({
    mutationFn: () => stopShareLink(planId),
    onSuccess: () => {
      setUrl(null);
      toast.show({ type: 'success', message: Toasts.shareStopped });
      onClose();
    },
    onError: (err) => toast.show({ type: 'error', message: errorMessage(err) }),
  });

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.show({ type: 'success', message: Toasts.linkCopied });
    } catch {
      toast.show({ type: 'error', message: Messages.unknown });
    }
  };

  // 端末の共有シート（LINE など）。使えないブラウザではリンクをコピーする（BR-30）
  const share = async (link: string) => {
    if (!canShare) return copy(link);
    try {
      await navigator.share({ title: ShareMessages.shareTitle(formatTitle(title)), url: link });
    } catch {
      // 共有シートを閉じただけのときは何もしない
    }
  };

  return (
    <BottomSheet open={open} title={ShareMessages.sheetTitle} onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.lead}>{ShareMessages.lead}</p>
        {url === null ? (
          <Button
            icon={ShareIcons.link}
            fullWidth
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            共有リンクを作る
          </Button>
        ) : (
          <>
            <TextField
              label="共有リンク"
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className={styles.buttons}>
              {canShare && (
                <Button icon={ShareIcons.share} fullWidth onClick={() => void share(url)}>
                  共有する
                </Button>
              )}
              <Button
                variant={canShare ? 'secondary' : 'primary'}
                icon={ShareIcons.link}
                fullWidth
                onClick={() => void copy(url)}
              >
                リンクをコピー
              </Button>
            </div>
            <div className={styles.stop}>
              <p className={styles.note}>{ShareMessages.stopLead}</p>
              <Button
                variant="danger"
                fullWidth
                loading={stop.isPending}
                onClick={() => stop.mutate()}
              >
                共有を止める
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
