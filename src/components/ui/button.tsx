import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  hierarchy?: 'primary' | 'secondary' | 'ghost';
  busy?: boolean;
  focusableWhenDisabled?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      hierarchy = 'primary',
      busy = false,
      focusableWhenDisabled = false,
      disabled,
      className,
      children,
      type = 'button',
      onClick,
      ...props
    },
    ref,
  ) {
    const isDisabled = Boolean(disabled || busy);

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={isDisabled && !focusableWhenDisabled}
        aria-disabled={
          (isDisabled && focusableWhenDisabled) || props['aria-disabled']
        }
        aria-busy={props['aria-busy'] ?? (busy || undefined)}
        data-busy={busy || undefined}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
        className={clsx('button', `button--${hierarchy}`, className)}
      >
        {children}
      </button>
    );
  },
);
