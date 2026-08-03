export type Platform =
  | 'all'
  | 'hh'
  | 'habr'
  | 'linkedin'
  | 'djinni'
  | 'telegram';

export type Stage = 'search' | 'interview' | 'career';

export type ActiveSection =
  | 'overview'
  | 'resume'
  | 'vacancies'
  | 'applications'
  | 'messages'
  | 'assistant'
  | 'preparation'
  | 'mock-interview'
  | 'questions'
  | 'star'
  | 'interview-history'
  | 'offers'
  | 'onboarding'
  | 'probation'
  | 'growth'
  | 'settings'
  | 'profile';

export type CorePlatform = Exclude<Platform, 'all'>;
export type AddablePlatform = 'indeed' | 'glassdoor';
export type SelectedPlatform = Platform | AddablePlatform;
export type WorkspacePlatform = CorePlatform | AddablePlatform;
export type Period = '7d' | '30d' | '90d';

export type SyncStatus = 'idle' | 'syncing' | 'success';
export type BadgeTone = 'success' | 'warm' | 'neutral' | 'danger';
export type MetricIcon = 'send' | 'inbox' | 'calendar' | 'trending' | 'x';

export interface SummaryMetric {
  label: string;
  value: string;
  detail: string;
  icon: MetricIcon;
  mutedDetail?: boolean;
}

export interface ResumeMetricValue {
  value: string;
  label: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  updated: string;
  applications: ResumeMetricValue;
  responses: ResumeMetricValue;
  interviews: ResumeMetricValue;
  responseRate: number;
  interviewRate: number;
  status: string;
  statusTone: BadgeTone;
  showStatusDot?: boolean;
}

export interface PlatformAnalyticsRow {
  platform: CorePlatform;
  name: string;
  monogram: string;
  applications: string;
  responses: string;
  interviews: string;
  conversion: string;
  conclusion: string;
  positive?: boolean;
}

export interface GeneralOverviewData {
  metrics: SummaryMetric[];
  resumes: ResumeVersion[];
  platforms: PlatformAnalyticsRow[];
  recommendation: {
    eyebrow: string;
    prefix: string;
    emphasis: string;
    suffix: string;
  };
}

export type VacancyStatus = 'Ответ' | 'Просмотрено' | 'Интервью' | 'Отклик';

export interface Vacancy {
  company: string;
  role: string;
  location: string;
  monogram: string;
  date: string;
  status: VacancyStatus;
}

export interface Message {
  sender: string;
  text: string;
  date: string;
  initials: string;
}

export interface PlatformWorkspaceData {
  name: string;
  sync: string;
  events: string;
  resume: string;
  resumeDate: string;
  note: string;
  metrics: [string, string, string, string];
  details: [string, string, string, string];
  vacancies: Vacancy[];
  messages: Message[];
}
