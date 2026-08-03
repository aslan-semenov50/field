import type { ReactNode } from 'react';
import { useScrollDirection } from '../shared/hooks/useScrollDirection';

interface StickyHeaderProps {
  children: ReactNode;
}

export function StickyHeader({ children }: StickyHeaderProps) {
  const { direction, isPastThreshold } = useScrollDirection();
  const compact = isPastThreshold && direction === 'down';

  return (
    <div
      className="sticky-header"
      data-compact={compact}
      data-scroll-direction={direction}
    >
      {children}
    </div>
  );
}
