import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipPosition {
  below: boolean;
  left: number;
  top: number;
}

interface TooltipProps {
  children: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  label: string;
}

const initialPosition: TooltipPosition = { below: false, left: 0, top: 0 };

export function Tooltip({ children, label }: TooltipProps) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(initialPosition);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const below = rect.top < 56;
    setPosition({
      below,
      left: Math.min(Math.max(rect.left + rect.width / 2, 86), window.innerWidth - 86),
      top: below ? rect.bottom : rect.top,
    });
  }, []);

  const schedulePositionUpdate = useCallback(() => {
    if (animationFrameRef.current) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = 0;
      updatePosition();
    });
  }, [updatePosition]);

  const showTooltip = useCallback(() => {
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    const scrollContainer = anchorRef.current?.closest('.platform-dock');
    window.addEventListener('resize', schedulePositionUpdate);
    window.addEventListener('scroll', schedulePositionUpdate, { passive: true });
    scrollContainer?.addEventListener('scroll', schedulePositionUpdate, { passive: true });
    return () => {
      window.removeEventListener('resize', schedulePositionUpdate);
      window.removeEventListener('scroll', schedulePositionUpdate);
      scrollContainer?.removeEventListener('scroll', schedulePositionUpdate);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [schedulePositionUpdate, updatePosition, visible]);

  const trigger = cloneElement(children, { 'aria-describedby': tooltipId });

  return (
    <>
      <span
        className="tooltip-anchor"
        ref={anchorRef}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setVisible(false)}
        onFocus={showTooltip}
        onBlur={() => setVisible(false)}
      >
        {trigger}
      </span>
      {createPortal(
        <span
          className={`field-tooltip${visible ? ' is-visible' : ''}${position.below ? ' is-below' : ''}`}
          id={tooltipId}
          role="tooltip"
          aria-hidden={!visible}
          style={{ left: `${position.left}px`, top: `${position.top}px` }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  );
}
