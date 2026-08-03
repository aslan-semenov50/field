import type { GeneralOverviewData, Period } from '../types';
import { Header } from './Header';
import { PlatformAnalytics } from './PlatformAnalytics';
import { RecommendationPanel } from './RecommendationPanel';
import { ResumeAnalytics } from './ResumeAnalytics';
import { RevealOnScroll } from './RevealOnScroll';
import { SummaryPanel } from './SummaryPanel';

interface GeneralOverviewProps {
  data: GeneralOverviewData;
  period: Period;
  periodLabel: string;
  onPeriodChange: () => void;
  onRecommendation: () => void;
}

export function GeneralOverview({
  data,
  period,
  periodLabel,
  onPeriodChange,
  onRecommendation,
}: GeneralOverviewProps) {
  return (
    <div className="content-view" id="generalView">
      <Header
        description=""
        eyebrow=""
        title="Аналитика"
      />

      <RevealOnScroll as="section" className="section" id="overviewSection">
        <div className="section-heading">
          <h2>Общая статистика</h2>
          <button
            className="period-filter"
            type="button"
            data-period={period}
            aria-label={`Изменить период. Сейчас: последние ${periodLabel}`}
            onClick={onPeriodChange}
          >
            За последние {periodLabel}
          </button>
        </div>
        <SummaryPanel metrics={data.metrics} />
      </RevealOnScroll>

      <RevealOnScroll as="section" className="section" id="resumeSection">
        <div className="section-heading">
          <h2>Версии резюме</h2>
          <p>{data.resumes.length} активные версии</p>
        </div>
        <ResumeAnalytics resumes={data.resumes} />
      </RevealOnScroll>

      <RevealOnScroll as="section" className="section" id="platformsSection">
        <div className="section-heading">
          <h2>Площадки</h2>
          <p>Единая картина по каналам</p>
        </div>
        <PlatformAnalytics rows={data.platforms} />
      </RevealOnScroll>

      <RevealOnScroll as="section" className="section" id="assistantSection">
        <RecommendationPanel
          recommendation={data.recommendation}
          onAction={onRecommendation}
        />
      </RevealOnScroll>
    </div>
  );
}
