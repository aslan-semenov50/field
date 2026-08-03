import type { HTMLAttributes, ReactNode } from 'react';

import type { BadgeTone } from '../types';

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  tone?: BadgeTone;
}

export function Badge({
  children,
  className,
  dot = false,
  icon,
  tone = 'success',
  ...rest
}: BadgeProps) {
  const classes = ['status', tone, className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {dot && <span className="status-dot" aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}

