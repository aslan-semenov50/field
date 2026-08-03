import type { ElementType, FocusEvent, HTMLAttributes, ReactNode } from 'react';
import { useInViewOnce } from '../shared/hooks/useInViewOnce';

type RevealElement = 'article' | 'div' | 'section';

interface RevealOnScrollProps extends HTMLAttributes<HTMLElement> {
  as?: RevealElement;
  children: ReactNode;
  enabled?: boolean;
}

export function RevealOnScroll({
  as = 'div',
  children,
  className = '',
  enabled = true,
  onFocusCapture,
  ...props
}: RevealOnScrollProps) {
  const Component = as as ElementType;
  const { elementRef, revealNow, revealState } = useInViewOnce<HTMLElement>({ enabled });

  const handleFocusCapture = (event: FocusEvent<HTMLElement>) => {
    revealNow();
    onFocusCapture?.(event);
  };

  return (
    <Component
      {...props}
      ref={elementRef}
      className={`reveal-on-scroll${className ? ` ${className}` : ''}`}
      data-reveal={revealState}
      onFocusCapture={handleFocusCapture}
    >
      {children}
    </Component>
  );
}
