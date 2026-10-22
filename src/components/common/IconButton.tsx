import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from '@/lib/icons';
import styles from './IconButton.module.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  icon: LucideIcon;
  label: string; // aria-label
  filled?: boolean; // いいね済みのハートなど、塗りつぶして表示する
};

export function IconButton({
  icon: Icon,
  label,
  filled = false,
  type = 'button',
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`${styles.button} ${className ?? ''}`}
      {...rest}
    >
      <Icon size={20} aria-hidden="true" fill={filled ? 'currentColor' : 'none'} />
    </button>
  );
}
