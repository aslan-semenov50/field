export const SENIORITIES = [
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'MANAGER',
  'DIRECTOR',
  'EXECUTIVE',
] as const;

export type Seniority = (typeof SENIORITIES)[number];

export const WORK_FORMATS = ['REMOTE', 'HYBRID', 'ONSITE'] as const;

export type WorkFormat = (typeof WORK_FORMATS)[number];

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'TEMPORARY',
  'INTERNSHIP',
  'FREELANCE',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SALARY_PERIODS = ['HOUR', 'MONTH', 'YEAR', 'PROJECT'] as const;

export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CandidateProfile {
  id: string;
  userId: string;
  displayName: string;
  locationText: string | null;
  countryCode: string | null;
  city: string | null;
  yearsOfExperience: number | null;
  seniority: Seniority | null;
  professionalSummary: string | null;
  skills: string[];
  languages: string[];
  preferredWorkFormats: WorkFormat[];
  primaryResumeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCandidateProfileInput {
  displayName: string;
  locationText?: string | null;
  countryCode?: string | null;
  city?: string | null;
  yearsOfExperience?: number | null;
  seniority?: Seniority | null;
  professionalSummary?: string | null;
  skills?: string[];
  languages?: string[];
  preferredWorkFormats?: WorkFormat[];
  primaryResumeId?: string | null;
}

export interface SearchProfile {
  id: string;
  userId: string;
  name: string;
  roleTitles: string[];
  seniorities: Seniority[];
  salaryMin: string | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  requireKnownSalary: boolean;
  countryCodes: string[];
  cities: string[];
  workFormats: WorkFormat[];
  employmentTypes: EmploymentType[];
  requiredSkills: string[];
  preferredSkills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSearchProfileInput {
  name: string;
  roleTitles?: string[];
  seniorities?: Seniority[];
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;
  requireKnownSalary?: boolean;
  countryCodes?: string[];
  cities?: string[];
  workFormats?: WorkFormat[];
  employmentTypes?: EmploymentType[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  isActive?: boolean;
}

export type UpdateSearchProfileInput = Partial<CreateSearchProfileInput>;

export interface Resume {
  id: string;
  userId: string;
  title: string;
  languageCode: string;
  structuredContent: JsonValue | null;
  plainText: string | null;
  contentVersion: number;
  storageProvider: string | null;
  storageKey: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  checksumSha256: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResumeInput {
  title: string;
  languageCode: string;
  structuredContent?: Record<string, JsonValue> | null;
  plainText?: string | null;
  contentVersion?: number;
  storageProvider?: string | null;
  storageKey?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
}

export type UpdateResumeInput = Partial<CreateResumeInput>;
