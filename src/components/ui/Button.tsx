import { CircleNotch } from '@phosphor-icons/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClass, type ButtonSize, type ButtonVariant } from './styles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? <CircleNotch className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function ButtonLink({ variant = 'secondary', size = 'md', icon, className = '', children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
