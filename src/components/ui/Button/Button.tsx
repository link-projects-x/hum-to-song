import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../cx';
import styles from './Button.module.scss';

type TButtonVariant = 'primary' | 'secondary' | 'ghost';
type TButtonSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

type TButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TButtonVariant;
  size?: TButtonSize;
  block?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  children,
  type = 'button',
  ...buttonProps
}: TButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
