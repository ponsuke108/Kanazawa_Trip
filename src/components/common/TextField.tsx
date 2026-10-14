import { useId, type InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | null; // 入力欄の下に出す誤り（BR-05）
  hint?: string; // 補足（「8文字以上」など）
  counter?: { current: number; max: number }; // 「N/50」
};

// 入力欄（S-12、S-08 で使う）
export function TextField({ label, error, hint, counter, className, ...rest }: Props) {
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
      <input
        id={id}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
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
