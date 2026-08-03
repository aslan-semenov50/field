import { GripVertical, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { SelectedPlatform } from '../types';
import { Tooltip } from './Tooltip';

export interface PlatformSwitcherItem {
  id: SelectedPlatform;
  label: string;
}

interface PlatformSwitcherProps {
  items: readonly PlatformSwitcherItem[];
  selectedPlatform: SelectedPlatform;
  reducedMotion: boolean;
  onSelect: (platform: SelectedPlatform) => void;
  onReorder: (source: SelectedPlatform, target: SelectedPlatform) => void;
  onOpenDialog: (opener: HTMLButtonElement) => void;
}

interface IndicatorGeometry {
  height: number;
  ready: boolean;
  width: number;
  x: number;
}

type IndicatorStyle = CSSProperties & { '--platform-indicator-x': string };

const initialIndicatorGeometry: IndicatorGeometry = {
  height: 0,
  ready: false,
  width: 0,
  x: 0,
};

export function PlatformSwitcher({
  items,
  selectedPlatform,
  reducedMotion,
  onSelect,
  onReorder,
  onOpenDialog,
}: PlatformSwitcherProps) {
  const dockRef = useRef<HTMLElement>(null);
  const tabRefs = useRef(new Map<SelectedPlatform, HTMLButtonElement>());
  const [indicator, setIndicator] = useState(initialIndicatorGeometry);
  const [indicatorCanAnimate, setIndicatorCanAnimate] = useState(false);
  const [draggedPlatform, setDraggedPlatform] = useState<SelectedPlatform | null>(null);
  const [dragTarget, setDragTarget] = useState<SelectedPlatform | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  // Синхронизируем визуальный индикатор активной вкладки с фактической кнопкой.
  const measureIndicator = useCallback(() => {
    const activeTab = tabRefs.current.get(selectedPlatform);
    if (!activeTab) return;

    const nextGeometry: IndicatorGeometry = {
      height: activeTab.offsetHeight,
      ready: true,
      width: activeTab.offsetWidth,
      x: activeTab.offsetLeft,
    };

    setIndicator((current) =>
      current.height === nextGeometry.height &&
      current.ready === nextGeometry.ready &&
      current.width === nextGeometry.width &&
      current.x === nextGeometry.x
        ? current
        : nextGeometry,
    );
  }, [selectedPlatform]);

  useLayoutEffect(() => {
    measureIndicator();

    const resizeObserver =
      'ResizeObserver' in window ? new ResizeObserver(measureIndicator) : null;

    if (dockRef.current) resizeObserver?.observe(dockRef.current);
    tabRefs.current.forEach((tab) => resizeObserver?.observe(tab));
    window.addEventListener('resize', measureIndicator);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureIndicator);
    };
  }, [items, measureIndicator]);

  useEffect(() => {
    const dock = dockRef.current;
    const activeTab = tabRefs.current.get(selectedPlatform);
    if (!dock || !activeTab) return;

    const dockRect = dock.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    let nextScrollLeft = dock.scrollLeft;

    if (tabRect.left < dockRect.left) nextScrollLeft -= dockRect.left - tabRect.left;
    else if (tabRect.right > dockRect.right) nextScrollLeft += tabRect.right - dockRect.right;
    else return;

    dock.scrollTo({
      left: nextScrollLeft,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [reducedMotion, selectedPlatform]);

  useEffect(() => {
    if (!indicator.ready) return;
    const animationFrame = window.requestAnimationFrame(() => setIndicatorCanAnimate(true));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [indicator.ready]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    },
    [],
  );

  // Сообщаем пользователю о перемещении вкладки после drag-and-drop или клавиатурной перестановки.
  const announceMove = (source: SelectedPlatform, target: SelectedPlatform) => {
    const sourceItem = items.find((item) => item.id === source);
    const targetIndex = items.findIndex((item) => item.id === target);
    if (!sourceItem || targetIndex < 0) return;
    setReorderAnnouncement(
      `Вкладка «${sourceItem.label}» перемещена на позицию ${targetIndex + 1} из ${items.length}`,
    );
  };

  const suppressClickAfterDrag = () => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 300);
  };

  // Завершаем перетаскивание и временно блокируем лишние клики после дропа.
  const finishDrag = () => {
    setDraggedPlatform(null);
    setDragTarget(null);
    suppressClickAfterDrag();
  };

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    platform: SelectedPlatform,
  ) => {
    setDraggedPlatform(platform);
    setDragTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', platform);
  };

  const handleDragOver = (
    event: DragEvent<HTMLButtonElement>,
    platform: SelectedPlatform,
  ) => {
    if (!draggedPlatform || draggedPlatform === platform) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragTarget(platform);
  };

  const handleDrop = (
    event: DragEvent<HTMLButtonElement>,
    target: SelectedPlatform,
  ) => {
    event.preventDefault();
    const storedSource = event.dataTransfer.getData('text/plain');
    const source =
      draggedPlatform ?? items.find((item) => item.id === storedSource)?.id ?? null;

    if (source && source !== target) {
      onReorder(source, target);
      announceMove(source, target);
    }
    finishDrag();
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    platform: SelectedPlatform,
    index: number,
  ) => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;

    const nextIndex = index + (event.key === 'ArrowLeft' ? -1 : 1);
    const target = items[nextIndex];
    if (!target) return;

    event.preventDefault();
    onReorder(platform, target.id);
    announceMove(platform, target.id);
    window.requestAnimationFrame(() => tabRefs.current.get(platform)?.focus());
  };

  const indicatorStyle: IndicatorStyle = {
    '--platform-indicator-x': `${indicator.x}px`,
    height: `${indicator.height}px`,
    width: `${indicator.width}px`,
  };

  return (
    <nav
      className={`platform-dock${indicator.ready ? ' has-active-indicator' : ''}`}
      ref={dockRef}
      aria-label="Площадки"
    >
      <span className="sr-only" id="platform-reorder-help">
        Перетащите вкладку, чтобы изменить порядок. С клавиатуры используйте Alt и стрелки
        влево или вправо.
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {reorderAnnouncement}
      </span>
      <span
        className={`platform-tab-indicator${indicator.ready ? ' is-ready' : ''}${indicatorCanAnimate ? ' can-animate' : ''}`}
        style={indicatorStyle}
        aria-hidden="true"
      />
      {items.map((item) => {
        const active = selectedPlatform === item.id;
        const itemIndex = items.findIndex(({ id }) => id === item.id);
        const draggedIndex = draggedPlatform
          ? items.findIndex(({ id }) => id === draggedPlatform)
          : -1;
        const isDragging = draggedPlatform === item.id;
        const isDropTarget = dragTarget === item.id && !isDragging;
        const dropClass = isDropTarget
          ? draggedIndex < itemIndex
            ? ' is-drop-after'
            : ' is-drop-before'
          : '';
        return (
          <button
            className={`platform-tab${active ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}${dropClass}`}
            key={item.id}
            ref={(node) => {
              if (node) tabRefs.current.set(item.id, node);
              else tabRefs.current.delete(item.id);
            }}
            type="button"
            draggable
            data-platform={item.id}
            aria-pressed={active}
            aria-describedby="platform-reorder-help"
            aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
            onClick={(event) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                return;
              }
              onSelect(item.id);
            }}
            onDragStart={(event) => handleDragStart(event, item.id)}
            onDragEnter={() => {
              if (draggedPlatform && draggedPlatform !== item.id) setDragTarget(item.id);
            }}
            onDragOver={(event) => handleDragOver(event, item.id)}
            onDrop={(event) => handleDrop(event, item.id)}
            onDragEnd={finishDrag}
            onKeyDown={(event) => handleKeyDown(event, item.id, itemIndex)}
          >
            <GripVertical
              className="platform-drag-handle"
              strokeWidth={1.7}
              aria-hidden="true"
              focusable="false"
            />
            <span>{item.label}</span>
          </button>
        );
      })}
      <Tooltip label="Добавить площадку">
        <button
          className="add-platform"
          type="button"
          aria-label="Добавить площадку"
          onClick={(event) => onOpenDialog(event.currentTarget)}
        >
          <Plus className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
        </button>
      </Tooltip>
    </nav>
  );
}
