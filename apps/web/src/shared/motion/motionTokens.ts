export const MOTION_DURATION = {
  fast: 160,
  base: 260,
  slow: 420,
  platformExit: 180,
  platformEnter: 320,
} as const;

export const SCROLL_MOTION = {
  directionDelta: 10,
  compactAt: 104,
  expandAt: 80,
} as const;

export const REVEAL_MOTION = {
  threshold: 0.15,
  rootMargin: '0px 0px -5% 0px',
} as const;
