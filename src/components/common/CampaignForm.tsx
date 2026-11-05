import { useRef, useState, type ChangeEvent } from 'react';
import { isApiError } from '@/api/errors';
import { uploadCampaignImage } from '@/api/storage';
import { Button } from '@/components/common/Button';
import { TextAreaField } from '@/components/common/TextAreaField';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { ShopMessages, UiMessages } from '@/constants/messages';
import { CAMPAIGN_LIMITS, campaignIssues, type CampaignField } from '@/lib/campaign';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons } from '@/lib/icons';
import type { CampaignInput } from '@/types/models';
import styles from './CampaignForm.module.css';

type Props = {
  value: CampaignInput;
  onChange: (value: CampaignInput) => void;
};

function len(s: string): number {
  return Array.from(s.trim()).length;
}

// キャンペーンの入力欄（7.6、BR-27）。S-19 の最初のキャンペーンと S-20 で使う。
// 誤りは、触った項目から出す。送る前の確かめは画面の側で campaignIssues を使う
export function CampaignForm({ value, onChange }: Props) {
  const toast = useToast();
  const [touched, setTouched] = useState<Partial<Record<CampaignField, boolean>>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const issues = campaignIssues(value);
  const errorOf = (f: CampaignField) => (touched[f] ? (issues[f] ?? null) : null);

  const set = (field: CampaignField, next: Partial<CampaignInput>) => {
    setTouched((t) => ({ ...t, [field]: true }));
    onChange({ ...value, ...next });
  };

  // 縮小して撮影場所などの情報を消してから上げる（BR-13）
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { path, url } = await uploadCampaignImage(file);
      setPreview(url);
      onChange({ ...value, imagePath: path });
    } catch (err) {
      const unreadable = isApiError(err) && err.code === 'VALIDATION';
      toast.show({
        type: 'error',
        message: unreadable ? UiMessages.imageUnreadable : errorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.form}>
      <TextField
        label="題名"
        value={value.title}
        maxLength={CAMPAIGN_LIMITS.title + 10}
        placeholder="例：投稿で抹茶ラテ割引"
        counter={{ current: len(value.title), max: CAMPAIGN_LIMITS.title }}
        error={errorOf('title')}
        onChange={(e) => set('title', { title: e.target.value })}
      />
      <TextField
        label="特典の内容"
        value={value.benefit}
        maxLength={CAMPAIGN_LIMITS.benefit + 10}
        placeholder="例：お会計から10%引き"
        counter={{ current: len(value.benefit), max: CAMPAIGN_LIMITS.benefit }}
        error={errorOf('benefit')}
        onChange={(e) => set('benefit', { benefit: e.target.value })}
      />
      <TextAreaField
        label="お知らせ文（任意）"
        value={value.notice}
        rows={3}
        counter={{ current: len(value.notice), max: CAMPAIGN_LIMITS.notice }}
        error={errorOf('notice')}
        onChange={(e) => set('notice', { notice: e.target.value })}
      />
      <TextAreaField
        label="説明（任意。条件や注意）"
        value={value.description}
        counter={{ current: len(value.description), max: CAMPAIGN_LIMITS.description }}
        error={errorOf('description')}
        onChange={(e) => set('description', { description: e.target.value })}
      />
      <div className={styles.period}>
        <TextField
          label="開始日"
          type="date"
          value={value.startsOn}
          onChange={(e) => set('period', { startsOn: e.target.value })}
        />
        <TextField
          label="終了日"
          type="date"
          value={value.endsOn}
          error={errorOf('period')}
          hint={`開始日から${CAMPAIGN_LIMITS.maxDays}日以内`}
          onChange={(e) => set('period', { endsOn: e.target.value })}
        />
      </div>
      <div className={styles.imageField}>
        <span className={styles.label}>画像（任意。サムネイル）</span>
        {preview && <img src={preview} alt="キャンペーンの画像" className={styles.preview} />}
        {!preview && value.imagePath && <p className={styles.sub}>画像を設定しています</p>}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void onFile(e)}
        />
        <div className={styles.imageButtons}>
          <Button
            variant="secondary"
            icon={ActionIcons.addImage}
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {value.imagePath ? '画像を変える' : '画像を選ぶ'}
          </Button>
          {value.imagePath && (
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(null);
                onChange({ ...value, imagePath: null });
              }}
            >
              画像を外す
            </Button>
          )}
        </div>
        {/* 画像はお店が撮ったもの・権利を持つものだけ。生成AIで作った画像は使わない（BR-27） */}
        <p className={styles.sub}>{ShopMessages.imageNotice}</p>
      </div>
      <p className={styles.sub}>{ShopMessages.noContentRequest}</p>
    </div>
  );
}
