import type { Ref } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

import type { ActiveSection, Stage } from '../types';

export interface StageNavigationItem {
  section: ActiveSection;
  label: string;
  icon: LucideIcon;
}

interface StageAccordionProps {
  stage: Stage;
  index: string;
  title: string;
  contentId: string;
  expanded: boolean;
  activeSection: ActiveSection;
  items: readonly StageNavigationItem[];
  triggerRef?: Ref<HTMLButtonElement>;
  onToggle: (stage: Stage) => void;
  onNavigate: (section: ActiveSection) => void;
}

export function StageAccordion({
  stage,
  index,
  title,
  contentId,
  expanded,
  activeSection,
  items,
  triggerRef,
  onToggle,
  onNavigate,
}: StageAccordionProps) {
  return (
    <section className={`stage${expanded ? ' is-open' : ''}`}>
      <button
        ref={triggerRef}
        className="stage-trigger"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => onToggle(stage)}
      >
        <span className="stage-index">{index}</span>
        <span className="stage-title">{title}</span>
        <ChevronDown className="icon chevron" aria-hidden="true" />
      </button>

      <div
        className="stage-content"
        id={contentId}
        data-open={expanded}
        inert={!expanded ? '' : undefined}
        aria-hidden={!expanded}
      >
        <div className="stage-content-inner">
          <nav className="nav-list" aria-label={title}>
            {items.map(({ section, label, icon: Icon }) => {
              const isActive = activeSection === section;

              return (
                <button
                  className={`nav-item${isActive ? ' is-active' : ''}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onNavigate(section)}
                  key={section}
                >
                  <Icon className="icon" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
