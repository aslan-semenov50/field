import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from 'react';
import { MOTION_DURATION } from '../shared/motion/motionTokens';

type ContentPhase = 'idle' | 'exiting' | 'enter-from' | 'entering';

interface AnimatedPageContentProps<Key extends string> {
  targetKey: Key;
  reducedMotion: boolean;
  render: (displayedKey: Key) => ReactNode;
  onDisplayedKeyChange?: (key: Key) => void;
  onSettled?: (key: Key) => void;
}

export function AnimatedPageContent<Key extends string>({
  targetKey,
  reducedMotion,
  render,
  onDisplayedKeyChange,
  onSettled,
}: AnimatedPageContentProps<Key>) {
  const [displayedKey, setDisplayedKey] = useState(targetKey);
  const [phase, setPhase] = useState<ContentPhase>('idle');
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const displayedKeyRef = useRef(targetKey);
  const latestTargetRef = useRef(targetKey);
  const phaseRef = useRef<ContentPhase>('idle');
  const phaseTimerRef = useRef(0);
  const firstFrameRef = useRef(0);
  const secondFrameRef = useRef(0);

  const clearScheduledWork = useCallback(() => {
    if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
    if (firstFrameRef.current) window.cancelAnimationFrame(firstFrameRef.current);
    if (secondFrameRef.current) window.cancelAnimationFrame(secondFrameRef.current);
    phaseTimerRef.current = 0;
    firstFrameRef.current = 0;
    secondFrameRef.current = 0;
  }, []);

  const updatePhase = useCallback((nextPhase: ContentPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const finishEntering = useCallback(() => {
    if (phaseRef.current !== 'entering') return;
    clearScheduledWork();
    updatePhase('idle');
    setLockedHeight(null);
    onSettled?.(displayedKeyRef.current);
  }, [clearScheduledWork, onSettled, updatePhase]);

  const beginEntering = useCallback(() => {
    updatePhase('entering');
    phaseTimerRef.current = window.setTimeout(
      finishEntering,
      MOTION_DURATION.platformEnter + 80,
    );
  }, [finishEntering, updatePhase]);

  const queueEntering = useCallback(() => {
    firstFrameRef.current = window.requestAnimationFrame(() => {
      secondFrameRef.current = window.requestAnimationFrame(beginEntering);
    });
  }, [beginEntering]);

  const showLatestTarget = useCallback(() => {
    if (phaseRef.current !== 'exiting') return;
    clearScheduledWork();

    const nextKey = latestTargetRef.current;
    if (nextKey === displayedKeyRef.current) {
      beginEntering();
      return;
    }

    displayedKeyRef.current = nextKey;
    setDisplayedKey(nextKey);
    onDisplayedKeyChange?.(nextKey);
    updatePhase('enter-from');
  }, [beginEntering, clearScheduledWork, onDisplayedKeyChange, updatePhase]);

  useLayoutEffect(() => {
    latestTargetRef.current = targetKey;
    clearScheduledWork();

    if (reducedMotion) {
      if (displayedKeyRef.current !== targetKey) {
        displayedKeyRef.current = targetKey;
        setDisplayedKey(targetKey);
        onDisplayedKeyChange?.(targetKey);
      }
      onSettled?.(targetKey);
      updatePhase('idle');
      setLockedHeight(null);
      return;
    }

    if (phaseRef.current === 'enter-from' && targetKey !== displayedKeyRef.current) {
      displayedKeyRef.current = targetKey;
      setDisplayedKey(targetKey);
      onDisplayedKeyChange?.(targetKey);
      updatePhase('enter-from');
      return;
    }

    if (targetKey === displayedKeyRef.current) {
      if (phaseRef.current === 'exiting') beginEntering();
      else if (phaseRef.current === 'enter-from') queueEntering();
      return;
    }

    const currentHeight = frameRef.current?.getBoundingClientRect().height;
    if (currentHeight) setLockedHeight(currentHeight);
    updatePhase('exiting');
    phaseTimerRef.current = window.setTimeout(
      showLatestTarget,
      MOTION_DURATION.platformExit + 70,
    );
  }, [
    beginEntering,
    clearScheduledWork,
    onDisplayedKeyChange,
    onSettled,
    queueEntering,
    reducedMotion,
    showLatestTarget,
    targetKey,
    updatePhase,
  ]);

  useLayoutEffect(() => {
    if (phase !== 'enter-from') return;

    const nextHeight = frameRef.current?.scrollHeight;
    if (nextHeight) setLockedHeight(nextHeight);

    queueEntering();

    return () => {
      if (firstFrameRef.current) window.cancelAnimationFrame(firstFrameRef.current);
      if (secondFrameRef.current) window.cancelAnimationFrame(secondFrameRef.current);
    };
  }, [displayedKey, phase, queueEntering]);

  useEffect(() => clearScheduledWork, [clearScheduledWork]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;

    if (phaseRef.current === 'exiting') showLatestTarget();
    else if (phaseRef.current === 'entering') finishEntering();
  };

  const transitioning = phase !== 'idle';

  return (
    <div
      className={`animated-page-content${transitioning ? ' is-transitioning' : ''}`}
      style={lockedHeight ? { height: `${lockedHeight}px` } : undefined}
      aria-busy={transitioning}
    >
      <div
        className="animated-page-frame"
        key={displayedKey}
        ref={frameRef}
        data-phase={phase}
        inert={phase === 'exiting' || phase === 'enter-from' ? '' : undefined}
        onTransitionEnd={handleTransitionEnd}
      >
        {render(displayedKey)}
      </div>
    </div>
  );
}
