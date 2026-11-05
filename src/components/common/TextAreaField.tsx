import { useId, type TextareaHTMLAttributes } from 'react';
import styles from './TextField.module.css';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  error?: string | null;
  hint?: string;
  counter?: { current: number; max: number };
};

// 複数行の入力欄（TextField と同じ見た目。v11 のお店の紹介、キャンペーンの説明など）
export function TextAreaField({ label, error, hint, counter, className, ...rest }: Props) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : '', hint ? `${id}-hint` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {counter && (
          <span className={`${styles.counter} ${counter.current > counter.max ? styles.over : ''}`}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      <textarea
        id={id}
        rows={4}
        className={`${styles.input} ${styles.textarea} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
