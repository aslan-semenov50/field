import {
  ChevronUp,
  Calendar,
  Inbox,
  Send,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';

import type { MetricIcon, SummaryMetric } from '../types';

const metricIcons: Record<MetricIcon, LucideIcon> = {
  calendar: Calendar,
  inbox: Inbox,
  send: Send,
  trending: TrendingUp,
  x: X,
};

interface SummaryPanelProps {
  metrics: readonly SummaryMetric[];
}

export function SummaryPanel({ metrics }: SummaryPanelProps) {
  return (
    <div className="stats-panel">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.icon];

        return (
          <article className="stat" key={metric.label}>
            <div className="stat-label">
              {metric.label}
              <Icon className="icon" aria-hidden="true" />
            </div>
            <strong className="stat-value">{metric.value}</strong>
            <span
              className="stat-detail"
              style={metric.mutedDetail ? { color: 'var(--muted)' } : undefined}
            >
              {!metric.mutedDetail && (
                <ChevronUp className="icon" aria-hidden="true" />
              )}
              {metric.detail}
            </span>
          </article>
        );
      })}
    </div>
  );
}
