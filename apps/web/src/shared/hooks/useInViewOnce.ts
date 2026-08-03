import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { REVEAL_MOTION } from '../motion/motionTokens';
import { useReducedMotion } from './useReducedMotion';

export type RevealState = 'idle' | 'pending' | 'visible';

interface UseInViewOnceOptions {
  enabled?: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useInViewOnce<T extends HTMLElement>({
  enabled = true,
  rootMargin = REVEAL_MOTION.rootMargin,
  threshold = REVEAL_MOTION.threshold,
}: UseInViewOnceOptions = {}) {
  const elementRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const revealedRef = useRef(false);
  const [revealState, setRevealState] = useState<RevealState>('idle');
  const reducedMotion = useReducedMotion();

  const revealNow = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealState('visible');
  }, []);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    if (!enabled) {
      if (!revealedRef.current) setRevealState('idle');
      return;
    }

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealNow();
      return;
    }

    if (revealedRef.current) {
      setRevealState('visible');
      return;
    }

    const rect = element.getBoundingClientRect();
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
    );
    const initialIntersectionRatio = rect.height > 0 ? visibleHeight / rect.height : 0;

    if (initialIntersectionRatio >= threshold) {
      revealNow();
      return;
    }

    setRevealState('pending');

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= threshold,
          )
        ) {
          return;
        }
        revealNow();
      },
      { rootMargin, threshold },
    );

    observerRef.current = observer;
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [enabled, reducedMotion, revealNow, rootMargin, threshold]);

  return { elementRef, revealNow, revealState };
}
