import { useState, type Ref } from 'react';
import {
  BarChart3,
  Building2,
  Compass,
  FileText,
  Gift,
  LogOut,
  MessageSquare,
  Mic,
  Search,
  Send,
  UserRound,
} from 'lucide-react';

import type { AuthUser } from '../auth/types';
import type { ActiveSection, Stage } from '../types';
import { StageAccordion, type StageNavigationItem } from './StageAccordion';

const meItems = [
  { section: 'resume', label: 'Резюме', icon: FileText },
  { section: 'profile', label: 'Профиль', icon: UserRound },
] as const satisfies readonly StageNavigationItem[];

const searchItems = [
  { section: 'search-profile', label: 'Что я хочу', icon: Search },
  { section: 'applications', label: 'Обращения', icon: Send },
] as const satisfies readonly StageNavigationItem[];

const introductionItems = [
  { section: 'dialogue', label: 'Диалог', icon: MessageSquare },
  { section: 'interviews', label: 'Интервью', icon: Mic },
] as const satisfies readonly StageNavigationItem[];

const agreementItems = [
  { section: 'offers', label: 'Оферы', icon: Gift },
  { section: 'onboarding', label: 'Онбординг', icon: Compass },
] as const satisfies readonly StageNavigationItem[];

const analyticsItems = [
  { section: 'aggregators', label: 'Агрегаторы', icon: BarChart3 },
  { section: 'organizations', label: 'Организации', icon: Building2 },
] as const satisfies readonly StageNavigationItem[];

export interface SidebarProps {
  expandedStages: Record<Stage, boolean>;
  activeSection: ActiveSection;
  inert: boolean;
  sidebarRef?: Ref<HTMLElement>;
  firstTriggerRef?: Ref<HTMLButtonElement>;
  onToggle: (stage: Stage) => void;
  onNavigate: (section: ActiveSection) => void;
  onHome: () => void;
  user: AuthUser;
  candidateDisplayName: string | null;
  onLogout: () => Promise<void>;
}

export function Sidebar({
  expandedStages,
  activeSection,
  inert,
  sidebarRef,
  firstTriggerRef,
  onToggle,
  onNavigate,
  onHome,
  user,
  candidateDisplayName,
  onLogout,
}: SidebarProps) {
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const profileActive = activeSection === 'profile';
  const profileName = candidateDisplayName?.trim() || user.name?.trim() || user.email;
  const initials = profileName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutFailed(false);

    try {
      await onLogout();
    } catch {
      setLogoutPending(false);
      setLogoutFailed(true);
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className="sidebar"
      id="sidebar"
      aria-label="Основная навигация"
      inert={inert ? '' : undefined}
    >
      <header className="brand">
        <button className="brand-home" type="button" onClick={onHome}>
          <span className="brand-name">FIELD</span>
          <span className="brand-tagline">YOUR CAREER SPACE</span>
        </button>
      </header>

      <div className="stage-list">
        <StageAccordion
          stage="me"
          index=""
          title="Я"
          contentId="stage-me"
          expanded={expandedStages.me}
          activeSection={activeSection}
          items={meItems}
          triggerRef={firstTriggerRef}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="search"
          index=""
          title="Поиск"
          contentId="stage-search"
          expanded={expandedStages.search}
          activeSection={activeSection}
          items={searchItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="introduction"
          index=""
          title="Знакомство"
          contentId="stage-introduction"
          expanded={expandedStages.introduction}
          activeSection={activeSection}
          items={introductionItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="agreement"
          index=""
          title="Договор"
          contentId="stage-agreement"
          expanded={expandedStages.agreement}
          activeSection={activeSection}
          items={agreementItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="analytics"
          index=""
          title="Аналитика"
          contentId="stage-analytics"
          expanded={expandedStages.analytics}
          activeSection={activeSection}
          items={analyticsItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />
      </div>

      <footer className="sidebar-utility">
        <button
          className="utility-item"
          type="button"
          aria-current={profileActive ? 'page' : undefined}
          onClick={() => onNavigate('profile')}
        >
          <span className="profile-avatar">{initials}</span>
          <span className="profile-copy">
            {profileName} <small>{user.email}</small>
          </span>
        </button>
        <button
          className="utility-item auth-logout"
          type="button"
          disabled={logoutPending}
          onClick={() => void handleLogout()}
        >
          <LogOut className="icon" aria-hidden="true" />
          {logoutPending ? 'Выходим…' : logoutFailed ? 'Повторить выход' : 'Выйти'}
        </button>
      </footer>
    </aside>
  );
}
