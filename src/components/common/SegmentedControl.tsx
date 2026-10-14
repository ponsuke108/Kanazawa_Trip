import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  label?: string; // 読み上げ用の名前
};

export function SegmentedControl<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div className={styles.control} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`${styles.option} ${o.value === value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
