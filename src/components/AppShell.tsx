import { Menu } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { StickyHeader } from './StickyHeader';

interface AppShellProps {
  sidebar: ReactNode;
  platformSwitcher: ReactNode;
  children: ReactNode;
  drawerOpen: boolean;
  workspaceInert: boolean;
  menuButtonRef: Ref<HTMLButtonElement>;
  workspaceRef: Ref<HTMLElement>;
  onToggleDrawer: () => void;
  onCloseDrawer: () => void;
}

export function AppShell({
  sidebar,
  platformSwitcher,
  children,
  drawerOpen,
  workspaceInert,
  menuButtonRef,
  workspaceRef,
  onToggleDrawer,
  onCloseDrawer,
}: AppShellProps) {
  return (
    <>
      <div className="drawer-backdrop" aria-hidden="true" onClick={onCloseDrawer} />
      <div className="app-shell">
        {sidebar}
        <main
          className="workspace"
          ref={workspaceRef}
          inert={workspaceInert ? '' : undefined}
        >
          <div className="workspace-inner">
            <div className="mobile-head">
              <span className="mobile-wordmark">FIELD</span>
              <button
                className="icon-button"
                ref={menuButtonRef}
                type="button"
                aria-label={drawerOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={drawerOpen}
                aria-controls="sidebar"
                onClick={onToggleDrawer}
              >
                <Menu className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
              </button>
            </div>
            <StickyHeader>{platformSwitcher}</StickyHeader>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
