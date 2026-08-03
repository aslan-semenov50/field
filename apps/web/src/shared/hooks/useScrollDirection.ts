import { useEffect, useRef, useState } from 'react';
import { SCROLL_MOTION } from '../motion/motionTokens';

export type ScrollDirection = 'up' | 'down';

interface ScrollMotionState {
  direction: ScrollDirection;
  isPastThreshold: boolean;
}

interface UseScrollDirectionOptions {
  compactAt?: number;
  directionDelta?: number;
  expandAt?: number;
}

function getScrollPosition() {
  const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  return Math.min(Math.max(window.scrollY, 0), maximum);
}

export function useScrollDirection({
  compactAt = SCROLL_MOTION.compactAt,
  directionDelta = SCROLL_MOTION.directionDelta,
  expandAt = SCROLL_MOTION.expandAt,
}: UseScrollDirectionOptions = {}) {
  const initialPosition = typeof window === 'undefined' ? 0 : getScrollPosition();
  const initialState: ScrollMotionState = {
    direction: initialPosition >= compactAt ? 'down' : 'up',
    isPastThreshold: initialPosition >= compactAt,
  };

  const [scrollState, setScrollState] = useState<ScrollMotionState>(initialState);
  const scrollStateRef = useRef(initialState);
  const anchorPositionRef = useRef(initialPosition);
  const animationFrameRef = useRef(0);

  useEffect(() => {
    const initialY = getScrollPosition();
    anchorPositionRef.current = initialY;

    const updateScrollState = () => {
      animationFrameRef.current = 0;
      const currentY = getScrollPosition();
      const previous = scrollStateRef.current;
      const delta = currentY - anchorPositionRef.current;

      let direction = previous.direction;
      let isPastThreshold = previous.isPastThreshold;

      if (!isPastThreshold && currentY >= compactAt) isPastThreshold = true;
      else if (isPastThreshold && currentY <= expandAt) isPastThreshold = false;

      if (Math.abs(delta) >= directionDelta) {
        direction = delta > 0 ? 'down' : 'up';
        anchorPositionRef.current = currentY;
      }

      if (!isPastThreshold) direction = 'up';

      if (
        direction !== previous.direction ||
        isPastThreshold !== previous.isPastThreshold
      ) {
        const nextState = { direction, isPastThreshold };
        scrollStateRef.current = nextState;
        setScrollState(nextState);
      }
    };

    const handleScroll = () => {
      if (animationFrameRef.current) return;
      animationFrameRef.current = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [compactAt, directionDelta, expandAt]);

  return scrollState;
}
