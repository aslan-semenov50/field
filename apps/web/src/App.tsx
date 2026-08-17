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
import { ApiError, type AuthorizedRequest } from './auth/api';
import type { AuthUser } from './auth/types';
import { createDomainApi } from './profile/api';
import { ProfileWorkspace } from './profile/ProfileWorkspace';
import type { CandidateProfile } from './profile/types';
import type {
  ActiveSection,
  AddablePlatform,
  HhConnectionStatus,
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

const soonLabels: Partial<Record<string, string>> = {
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
};

const placeholderLabels: Partial<Record<ActiveSection, string>> = {
  applications: '\u041e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f',
  dialogue: '\u0414\u0438\u0430\u043b\u043e\u0433',
  interviews: '\u0418\u043d\u0442\u0435\u0440\u0432\u044c\u044e',
  offers: '\u041e\u0444\u0435\u0440\u044b',
  onboarding: '\u041e\u043d\u0431\u043e\u0440\u0434\u0438\u043d\u0433',
  aggregators: '\u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043e\u0440\u044b',
  organizations: '\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438',
};

interface SyncState {
  platform: WorkspacePlatform | null;
  status: SyncStatus;
}

type CandidateProfileResource =
  | { status: 'loading'; data: CandidateProfile | null; error: null }
  | { status: 'ready'; data: CandidateProfile | null; error: null }
  | { status: 'error'; data: CandidateProfile | null; error: string };

type HhConnectionResource =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: HhConnectionStatus; error: null }
  | { status: 'error'; data: null; error: string };

type HhConnectionAction = 'connect' | 'disconnect' | null;

function readableProfileError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось загрузить внутренний профиль FIELD.';
}

function readableHhError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось выполнить операцию с HH.ru.';
}

interface AppProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
  authorizedRequest: AuthorizedRequest;
}

export function App({ user, onLogout, authorizedRequest }: AppProps) {
  // Текущая активная вкладка шапки. Не влияет на состояние бокового меню.
  const [selectedPlatform, setSelectedPlatform] = useState<SelectedPlatform>('all');
  const [platformOrder, setPlatformOrder] = useState<SelectedPlatform[]>(readPlatformOrder);
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [expandedStages, setExpandedStages] = useState<Record<Stage, boolean>>({
    me: false,
    search: false,
    introduction: false,
    agreement: false,
    analytics: false,
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
  const [candidateProfileResource, setCandidateProfileResource] =
    useState<CandidateProfileResource>({ status: 'loading', data: null, error: null });
  const [candidateProfileReloadKey, setCandidateProfileReloadKey] = useState(0);
  const [hhConnectionResource, setHhConnectionResource] = useState<HhConnectionResource>({
    status: 'loading',
    data: null,
    error: null,
  });
  const [hhConnectionAction, setHhConnectionAction] = useState<HhConnectionAction>(null);

  const isMobile = useMediaQuery('(max-width: 880px)');
  const reducedMotion = useReducedMotion();
  const sidebarRef = useRef<HTMLElement>(null);
  const firstTriggerRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const dialogOpenerRef = useRef<HTMLButtonElement | null>(null);
  const hhConnectionRequestRef = useRef(0);

  const loadHhConnection = useCallback(async () => {
    const requestId = ++hhConnectionRequestRef.current;
    setHhConnectionResource({ status: 'loading', data: null, error: null });

    try {
      const data = await createDomainApi(authorizedRequest).hh.get();
      if (requestId !== hhConnectionRequestRef.current) return;
      setHhConnectionResource({ status: 'ready', data, error: null });
    } catch (error) {
      if (requestId !== hhConnectionRequestRef.current) return;
      setHhConnectionResource({
        status: 'error',
        data: null,
        error: readableHhError(error),
      });
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void loadHhConnection();
    return () => {
      hhConnectionRequestRef.current += 1;
    };
  }, [loadHhConnection]);

  useEffect(() => {
    let active = true;
    const profileApi = createDomainApi(authorizedRequest).profile;

    setCandidateProfileResource((current) => ({
      status: 'loading',
      data: current.data,
      error: null,
    }));

    void profileApi
      .get()
      .then((profile) => {
        if (active) {
          setCandidateProfileResource({ status: 'ready', data: profile, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          setCandidateProfileResource({ status: 'ready', data: null, error: null });
          return;
        }
        setCandidateProfileResource((current) => ({
          status: 'error',
          data: current.data,
          error: readableProfileError(error),
        }));
      });

    return () => {
      active = false;
    };
  }, [authorizedRequest, candidateProfileReloadKey]);

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
    const url = new URL(window.location.href);
    const hhResult = url.searchParams.get('hh');
    if (!hhResult) return;

    const message =
      hhResult === 'connected'
        ? 'HH.ru подключён к FIELD'
        : hhResult === 'denied'
          ? 'Подключение HH.ru отменено'
          : hhResult === 'failed'
            ? 'Не удалось подключить HH.ru'
            : null;

    if (message) showToast(message);
    url.searchParams.delete('hh');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [showToast]);

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
    const soonLabel = placeholderLabels[section] ?? soonLabels[section];
    if (soonLabel) {
      showToast(`Раздел «${soonLabel}» готовится`);
      closeDrawer();
      return;
    }

    closeDrawer();
  };

  const handleHome = () => {
    handleSelectPlatform('all');
    setExpandedStages({
      me: false,
      search: false,
      introduction: false,
      agreement: false,
      analytics: false,
    });
    handleNavigate('overview');
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

  const handleConnectHh = async () => {
    if (hhConnectionAction) return;
    setHhConnectionAction('connect');

    try {
      const { authorizationUrl } = await createDomainApi(authorizedRequest).hh.connect();
      window.location.assign(authorizationUrl);
    } catch (error) {
      setHhConnectionAction(null);
      showToast(readableHhError(error));
    }
  };

  const handleDisconnectHh = async () => {
    if (hhConnectionAction) return;
    hhConnectionRequestRef.current += 1;
    setHhConnectionAction('disconnect');

    try {
      await createDomainApi(authorizedRequest).hh.disconnect();
      setHhConnectionResource({
        status: 'ready',
        data: { connected: false },
        error: null,
      });
      showToast('HH.ru отключён от FIELD');
    } catch (error) {
      showToast(readableHhError(error));
    } finally {
      setHhConnectionAction(null);
    }
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

  const isProfileWorkspace =
    activeSection === 'profile' ||
    activeSection === 'resume' ||
    activeSection === 'search-profile';

  const hhConnection =
    hhConnectionResource.status === 'ready' && hhConnectionResource.data.connected
      ? hhConnectionResource.data
      : null;
  const hhConnectionStatus =
    hhConnectionResource.status === 'ready'
      ? hhConnectionResource.data.connected
        ? 'connected'
        : 'disconnected'
      : hhConnectionResource.status;

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
            onHome={handleHome}
            user={user}
            candidateDisplayName={candidateProfileResource.data?.displayName ?? null}
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
        {isProfileWorkspace ? (
          <ProfileWorkspace
            activeSection={activeSection}
            user={user}
            authorizedRequest={authorizedRequest}
            candidateProfile={candidateProfileResource.data}
            candidateProfileStatus={candidateProfileResource.status}
            candidateProfileError={candidateProfileResource.error}
            onCandidateProfileChange={(profile) =>
              setCandidateProfileResource({ status: 'ready', data: profile, error: null })
            }
            onRetryCandidateProfile={() => setCandidateProfileReloadKey((value) => value + 1)}
            onNotify={showToast}
          />
        ) : (
          <AnimatedPageContent
            targetKey={selectedPlatform}
            reducedMotion={reducedMotion}
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
                  hhConnection={
                    visiblePlatform === 'hh'
                      ? {
                          status: hhConnectionStatus,
                          hhUserId: hhConnection?.hhUserId ?? null,
                          connectedAt: hhConnection?.connectedAt ?? null,
                          error: hhConnectionResource.error,
                          action: hhConnectionAction,
                          onConnect: () => void handleConnectHh(),
                          onDisconnect: () => void handleDisconnectHh(),
                          onRetry: () => void loadHhConnection(),
                        }
                      : undefined
                  }
                />
              );
            }}
          />
        )}
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
