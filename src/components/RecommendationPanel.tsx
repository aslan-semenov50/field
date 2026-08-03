import { ArrowRight, Sparkle } from 'lucide-react';

import type { GeneralOverviewData } from '../types';
import { Tooltip } from './Tooltip';

interface RecommendationPanelProps {
  recommendation: GeneralOverviewData['recommendation'];
  onAction: () => void;
}

export function RecommendationPanel({
  recommendation,
  onAction,
}: RecommendationPanelProps) {
  return (
    <div className="ai-card">
      <span className="ai-mark">
        <Sparkle
          className="icon"
          strokeWidth={1.7}
          aria-hidden="true"
          focusable="false"
        />
      </span>
      <div className="ai-copy">
        <small>{recommendation.eyebrow}</small>
        <p>
          {recommendation.prefix}
          <strong>{recommendation.emphasis}</strong>
          {recommendation.suffix}
        </p>
      </div>
      <Tooltip label="Открыть рекомендацию">
        <button
          className="ai-action"
          type="button"
          aria-label="Открыть рекомендацию"
          onClick={onAction}
        >
          <ArrowRight
            className="icon"
            strokeWidth={1.7}
            aria-hidden="true"
            focusable="false"
          />
        </button>
      </Tooltip>
    </div>
  );
}
