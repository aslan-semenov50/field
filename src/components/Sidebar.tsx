import type { Ref } from 'react';
import {
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Compass,
  FileText,
  Gift,
  LayoutGrid,
  List,
  MessageSquare,
  Mic,
  Plug,
  Search,
  Send,
  Settings,
  Sparkle,
  TrendingUp,
} from 'lucide-react';

import type { ActiveSection, Stage } from '../types';
import {
  StageAccordion,
  type StageNavigationItem,
} from './StageAccordion';

const searchItems = [
  { section: 'overview', label: 'Обзор', icon: LayoutGrid, action: true },
  { section: 'resume', label: 'Резюме', icon: FileText, action: true },
  { section: 'vacancies', label: 'Вакансии', icon: Search, action: true },
  { section: 'applications', label: 'Отклики', icon: Send, action: true },
  { section: 'messages', label: 'Сообщения', icon: MessageSquare, action: true },
  { section: 'assistant', label: 'AI Ассистент', icon: Sparkle, action: true },
] as const satisfies readonly StageNavigationItem[];

const interviewItems = [
  {
    section: 'preparation',
    label: 'Подготовка',
    icon: ClipboardCheck,
    soonLabel: 'Подготовка',
  },
  {
    section: 'mock-interview',
    label: 'Mock Interview',
    icon: Mic,
    soonLabel: 'Mock Interview',
  },
  { section: 'questions', label: 'Вопросы', icon: CircleHelp, soonLabel: 'Вопросы' },
  { section: 'star', label: 'STAR', icon: Sparkle, soonLabel: 'STAR' },
  {
    section: 'interview-history',
    label: 'История интервью',
    icon: List,
    soonLabel: 'История интервью',
  },
] as const satisfies readonly StageNavigationItem[];

const careerItems = [
  { section: 'offers', label: 'Офферы', icon: Gift, soonLabel: 'Офферы' },
  { section: 'onboarding', label: 'Онбординг', icon: Compass, soonLabel: 'Онбординг' },
  {
    section: 'probation',
    label: 'Испытательный срок',
    icon: Clock3,
    soonLabel: 'Испытательный срок',
  },
  { section: 'growth', label: 'Развитие', icon: TrendingUp, soonLabel: 'Развитие' },
] as const satisfies readonly StageNavigationItem[];

export interface SidebarProps {
  expandedStages: Record<Stage, boolean>;
  activeSection: ActiveSection;
  inert: boolean;
  sidebarRef?: Ref<HTMLElement>;
  firstTriggerRef?: Ref<HTMLButtonElement>;
  onToggle: (stage: Stage) => void;
  onNavigate: (section: ActiveSection) => void;
  onOpenDialog: (opener: HTMLButtonElement) => void;
}

export function Sidebar({
  expandedStages,
  activeSection,
  inert,
  sidebarRef,
  firstTriggerRef,
  onToggle,
  onNavigate,
  onOpenDialog,
}: SidebarProps) {
  const settingsActive = activeSection === 'settings';
  const profileActive = activeSection === 'profile';

  return (
    <aside
      ref={sidebarRef}
      className="sidebar"
      id="sidebar"
      aria-label="Основная навигация"
      inert={inert ? '' : undefined}
    >
      <header className="brand">
        <span className="brand-name">FIELD</span>
        <span className="brand-tagline">YOUR CAREER SPACE</span>
      </header>

      <div className="stage-list">
        <StageAccordion
          stage="search"
          index=""
          title="Поиск"
          contentId="stage-search"
          expanded={expandedStages.search}
          activeSection={activeSection}
          items={searchItems}
          triggerRef={firstTriggerRef}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="interview"
          index=""
          title="Знакомство"
          contentId="stage-interview"
          expanded={expandedStages.interview}
          activeSection={activeSection}
          items={interviewItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />

        <StageAccordion
          stage="career"
          index=""
          title="Работа"
          contentId="stage-work"
          expanded={expandedStages.career}
          activeSection={activeSection}
          items={careerItems}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />
      </div>

      <footer className="sidebar-utility">
        <button
          className="utility-item"
          type="button"
          data-open-dialog=""
          onClick={(event) => onOpenDialog(event.currentTarget)}
        >
          <Plug className="icon" aria-hidden="true" />
          Интеграции
        </button>
        <button
          className="utility-item"
          type="button"
          data-soon="Настройки"
          aria-current={settingsActive ? 'page' : undefined}
          onClick={() => onNavigate('settings')}
        >
          <Settings className="icon" aria-hidden="true" />
          Настройки
        </button>
        <button
          className="utility-item"
          type="button"
          data-soon="Профиль"
          aria-current={profileActive ? 'page' : undefined}
          onClick={() => onNavigate('profile')}
        >
          <span className="profile-avatar">АВ</span>
          <span className="profile-copy">
            один бездельник <small>Product Designer</small>
          </span>
        </button>
      </footer>
    </aside>
  );
}
