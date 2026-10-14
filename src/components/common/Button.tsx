import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { StateIcons, type LucideIcon } from '@/lib/icons';
import styles from './Button.module.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: Props) {
  const Spinner = StateIcons.loading;
  const classes = [styles.button, styles[variant], fullWidth ? styles.full : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner size={20} aria-hidden="true" className={styles.spinner} />
      ) : (
        Icon && <Icon size={20} aria-hidden="true" />
      )}
      <span>{children}</span>
    </button>
  );
}
