import { FileText } from 'lucide-react';

import type { ResumeVersion } from '../types';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';

interface ResumeAnalyticsProps {
  resumes: readonly ResumeVersion[];
}

export function ResumeAnalytics({ resumes }: ResumeAnalyticsProps) {
  return (
    <div className="list-surface">
      {resumes.map((resume) => (
        <article className="resume-row" key={resume.id}>
          <div className="resume-name">
            <span className="file-mark">
              <FileText
                className="icon"
                strokeWidth={1.7}
                aria-hidden="true"
                focusable="false"
              />
            </span>
            <span className="resume-copy">
              <strong>{resume.name}</strong>
              <small>{resume.updated}</small>
            </span>
          </div>

          <div className="mini-metrics" aria-label={`Показатели резюме ${resume.name}`}>
            {[resume.applications, resume.responses, resume.interviews].map((metric) => (
              <span className="mini-metric" key={metric.label}>
                <b>{metric.value}</b>
                {metric.label}
              </span>
            ))}
          </div>

          <div className="progress-group">
            <ProgressBar label="Ответы" value={resume.responseRate} />
            <ProgressBar label="Интервью" value={resume.interviewRate} />
          </div>

          <Badge tone={resume.statusTone} dot={resume.showStatusDot}>
            {resume.status}
          </Badge>
        </article>
      ))}
    </div>
  );
}
