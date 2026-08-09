import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedPageContent } from './components/AnimatedPageContent';
import { AppShell } from './components/AppShell';
import { ConnectPlatformDialog } from './components/ConnectPlatformDialog';
import { GeneralOverview } from './components/GeneralOverview';
import { PlatformSwitcher, type PlatformSwitcherItem } from './components/PlatformSwitcher';
import { PlatformWorkspace } from './components/PlatformWorkspace';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import {
  addablePlatformOptions,
  defaultPeriod,
  generalOverviewData,
  periodLabels,
  platformData,
  platformTabs,
} from './data/mockData';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useReducedMotion } from './shared/hooks/useReducedMotion';
import type { AuthUser } from './auth/types';
import type {
  ActiveSection,
  AddablePlatform,
  Period,
  SelectedPlatform,
  Stage,
  SyncStatus,
  WorkspacePlatform,
} from './types';

// Порядок доступных временных диапазонов для смены периода.
const periodOrder: readonly Period[] = ['7d', '30d', '90d'];
// Ключ локального хранилища для сохранения порядка вкладок платформ.
const platformOrderStorageKey = 'field-platform-order';
const defaultPlatformOrder: SelectedPlatform[] = platformTabs.map(({ id }) => id);
const validPlatformIds = new Set<SelectedPlatform>([
  ...defaultPlatformOrder,
  ...addablePlatformOptions.map(({ id }) => id),
]);

function readPlatformOrder(): SelectedPlatform[] {
  const fallback = [...defaultPlatformOrder];
  if (typeof window === 'undefined') return fallback;

  try {
    const storedOrder: unknown = JSON.parse(
      window.localStorage.getItem(platformOrderStorageKey) ?? '[]',
    );
    if (!Array.isArray(storedOrder)) return fallback;

    const savedPlatforms = storedOrder.filter(
      (platform): platform is SelectedPlatform =>
        typeof platform === 'string' && validPlatformIds.has(platform as SelectedPlatform),
    );

    return [...new Set<SelectedPlatform>([...savedPlatforms, ...fallback])];
  } catch {
    return fallback;
  }
}

const sectionTargets: Partial<Record<ActiveSection, string>> = {
  overview: 'overviewSection',
  resume: 'resumeSection',
  vacancies: 'platformsSection',
  applications: 'platformsSection',
  assistant: 'assistantSection',
  messages: 'messagesSection',
};

const soonLabels: Partial<Record<ActiveSection, string>> = {
  preparation: 'Подготовка',
  'mock-interview': 'Mock Interview',
  questions: 'Вопросы',
  star: 'STAR',
  'interview-history': 'История интервью',
  offers: 'Офферы',
  onboarding: 'Онбординг',
  probation: 'Испытательный срок',
  growth: 'Развитие',
  settings: 'Настройки',
  profile: 'Профиль',
};

interface SyncState {
  platform: WorkspacePlatform | null;
  status: SyncStatus;
}

interface AppProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
}

export function App({ user, onLogout }: AppProps) {
  // Текущая активная вкладка шапки. Не влияет на состояние бокового меню.
  const [selectedPlatform, setSelectedPlatform] = useState<SelectedPlatform>('all');
  const [settledPlatform, setSettledPlatform] = useState<SelectedPlatform>('all');
  const [platformOrder, setPlatformOrder] = useState<SelectedPlatform[]>(readPlatformOrder);
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [expandedStages, setExpandedStages] = useState<Record<Stage, boolean>>({
    search: true,
    interview: false,
    career: false,
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [syncState, setSyncState] = useState<SyncState>({ platform: null, status: 'idle' });
  const [lastSyncOverrides, setLastSyncOverrides] = useState<
    Partial<Record<WorkspacePlatform, string>>
  >({});
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<AddablePlatform[]>([]);
  const [vacanciesExpanded, setVacanciesExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width: 880px)');
  const reducedMotion = useReducedMotion();
  const sidebarRef = useRef<HTMLElement>(null);
  const firstTriggerRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const dialogOpenerRef = useRef<HTMLButtonElement | null>(null);

  // Формируем список вкладок с учётом пользовательского порядка и подключённых площадок.
  const visiblePlatformTabs = useMemo<PlatformSwitcherItem[]>(() => {
    const connected = connectedPlatforms.map((platform) => {
      const option = addablePlatformOptions.find((item) => item.id === platform)!;
      return { id: option.id, label: option.name };
    });
    const available: PlatformSwitcherItem[] = [...platformTabs, ...connected];
    const remaining = new Map<SelectedPlatform, PlatformSwitcherItem>(
      available.map((item) => [item.id, item] as const),
    );
    const ordered: PlatformSwitcherItem[] = [];

    platformOrder.forEach((platform) => {
      const item = remaining.get(platform);
      if (!item) return;
      ordered.push(item);
      remaining.delete(platform);
    });

    return [...ordered, ...remaining.values()];
  }, [connectedPlatforms, platformOrder]);

  useEffect(() => {
    try {
      window.localStorage.setItem(platformOrderStorageKey, JSON.stringify(platformOrder));
    } catch {
      // The current order still works for this session when storage is unavailable.
    }
  }, [platformOrder]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    document.body.classList.toggle('is-drawer-open', isMobile && mobileSidebarOpen);
    return () => document.body.classList.remove('is-drawer-open');
  }, [isMobile, mobileSidebarOpen]);

  useEffect(() => {
    if (!isMobile && mobileSidebarOpen) setMobileSidebarOpen(false);
  }, [isMobile, mobileSidebarOpen]);

  useEffect(() => {
    if (!scrollTarget || settledPlatform !== selectedPlatform) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(scrollTarget);
        if (!target) return;
        target.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        setScrollTarget((current) => (current === scrollTarget ? null : current));
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [reducedMotion, scrollTarget, selectedPlatform, settledPlatform]);

  const closeDrawer = useCallback(
    (returnFocus = true) => {
      const wasOpen = mobileSidebarOpen;
      setMobileSidebarOpen(false);
      if (wasOpen && returnFocus && isMobile) {
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    },
    [isMobile, mobileSidebarOpen],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!platformDialogOpen) closeDrawer();
        return;
      }
      if (event.key !== 'Tab' || !isMobile || !mobileSidebarOpen) return;

      const focusable = [...(sidebarRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled)',
      ) ?? [])].filter((element) => !element.closest('[inert]') && element.offsetParent !== null);

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!sidebarRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, isMobile, mobileSidebarOpen, platformDialogOpen]);

  const handleToggleDrawer = () => {
    if (mobileSidebarOpen) {
      closeDrawer();
      return;
    }
    setMobileSidebarOpen(true);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => firstTriggerRef.current?.focus()),
    );
  };

  const handleToggleStage = (stage: Stage) => {
    setExpandedStages((current) => ({ ...current, [stage]: !current[stage] }));
  };

  const handleSelectPlatform = (platform: SelectedPlatform) => {
    setScrollTarget(null);
    if (platform !== selectedPlatform) setSettledPlatform(selectedPlatform);
    setSelectedPlatform(platform);
  };

  const handleReorderPlatforms = useCallback(
    (source: SelectedPlatform, target: SelectedPlatform) => {
      if (source === target) return;

      setPlatformOrder((current) => {
        const next = [...current];
        visiblePlatformTabs.forEach(({ id }) => {
          if (!next.includes(id)) next.push(id);
        });

        const sourceIndex = next.indexOf(source);
        const targetIndex = next.indexOf(target);
        if (sourceIndex < 0 || targetIndex < 0) return current;

        next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, source);
        return next;
      });
    },
    [visiblePlatformTabs],
  );

  // Переход по левому меню обновляет активный раздел, но не меняет выбранную вкладку шапки.
  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    const soonLabel = soonLabels[section];
    if (soonLabel) {
      showToast(`Раздел «${soonLabel}» готовится`);
      closeDrawer();
      return;
    }

    closeDrawer();
    setScrollTarget(sectionTargets[section] ?? null);
  };

  const handlePeriodChange = () => {
    setPeriod((current) => {
      const index = periodOrder.indexOf(current);
      return periodOrder[(index + 1) % periodOrder.length];
    });
  };

  const handleSync = async (syncingPlatform: WorkspacePlatform) => {
    if (syncState.status !== 'idle') return;
    setSyncState({ platform: syncingPlatform, status: 'syncing' });
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setLastSyncOverrides((current) => ({ ...current, [syncingPlatform]: 'Только что' }));
    setSyncState({ platform: syncingPlatform, status: 'success' });
    showToast(`${platformData[syncingPlatform].name}: данные обновлены`);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    setSyncState({ platform: null, status: 'idle' });
  };

  const handleOpenDialog = (opener: HTMLButtonElement) => {
    dialogOpenerRef.current = opener;
    closeDrawer(false);
    setPlatformDialogOpen(true);
  };

  const restoreDialogFocus = (fallbackToMenu = false) => {
    window.requestAnimationFrame(() => {
      const opener = dialogOpenerRef.current;
      if (!fallbackToMenu && opener && !opener.closest('[inert]')) opener.focus();
      else menuButtonRef.current?.focus();
    });
  };

  const handleCloseDialog = () => {
    if (!platformDialogOpen) return;
    setPlatformDialogOpen(false);
    restoreDialogFocus();
  };

  const handleConnectPlatform = (platform: AddablePlatform) => {
    setScrollTarget(null);
    if (platform !== selectedPlatform) setSettledPlatform(selectedPlatform);
    setConnectedPlatforms((current) =>
      current.includes(platform) ? current : [...current, platform],
    );
    setPlatformDialogOpen(false);
    setSelectedPlatform(platform);
    showToast(`${platformData[platform].name} подключён к FIELD`);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>(`[data-platform="${platform}"]`)?.focus();
      }),
    );
  };

  const handlePlatformSettled = useCallback((platform: SelectedPlatform) => {
    setSettledPlatform(platform);
  }, []);

  return (
    <>
      <AppShell
        drawerOpen={mobileSidebarOpen}
        workspaceInert={isMobile && mobileSidebarOpen}
        menuButtonRef={menuButtonRef}
        workspaceRef={workspaceRef}
        onToggleDrawer={handleToggleDrawer}
        onCloseDrawer={() => closeDrawer()}
        sidebar={
          <Sidebar
            expandedStages={expandedStages}
            activeSection={activeSection}
            inert={isMobile && !mobileSidebarOpen}
            sidebarRef={sidebarRef}
            firstTriggerRef={firstTriggerRef}
            onToggle={handleToggleStage}
            onNavigate={handleNavigate}
            onOpenDialog={handleOpenDialog}
            user={user}
            onLogout={onLogout}
          />
        }
        platformSwitcher={
          <PlatformSwitcher
            items={visiblePlatformTabs}
            selectedPlatform={selectedPlatform}
            reducedMotion={reducedMotion}
            onSelect={handleSelectPlatform}
            onReorder={handleReorderPlatforms}
            onOpenDialog={handleOpenDialog}
          />
        }
      >
        <AnimatedPageContent
          targetKey={selectedPlatform}
          reducedMotion={reducedMotion}
          onSettled={handlePlatformSettled}
          render={(visiblePlatform) => {
            if (visiblePlatform === 'all') {
              return (
                <GeneralOverview
                  data={generalOverviewData}
                  period={period}
                  periodLabel={periodLabels[period]}
                  onPeriodChange={handlePeriodChange}
                  onRecommendation={() =>
                    showToast('Рекомендация сохранена в плане на неделю')
                  }
                />
              );
            }

            const visibleData = platformData[visiblePlatform];
            const visibleSyncStatus =
              syncState.platform === visiblePlatform ? syncState.status : 'idle';

            return (
              <PlatformWorkspace
                data={visibleData}
                lastSync={lastSyncOverrides[visiblePlatform] ?? visibleData.sync}
                syncStatus={visibleSyncStatus}
                syncDisabled={syncState.status !== 'idle'}
                vacanciesExpanded={vacanciesExpanded}
                onSync={() => handleSync(visiblePlatform)}
                onToggleVacancies={() => setVacanciesExpanded((current) => !current)}
              />
            );
          }}
        />
      </AppShell>

      <ConnectPlatformDialog
        open={platformDialogOpen}
        options={addablePlatformOptions}
        onClose={handleCloseDialog}
        onConnect={handleConnectPlatform}
      />
      <Toast message={toastMessage} />
    </>
  );
}
