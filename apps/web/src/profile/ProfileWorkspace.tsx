import { Check, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AuthorizedRequest } from '../auth/api';
import type { AuthUser } from '../auth/types';
import { Header } from '../components/Header';
import type { ActiveSection } from '../types';
import { createDomainApi } from './api';
import { ResumesSection } from './ResumesSection';
import { SearchProfilesSection } from './SearchProfilesSection';
import { TagInput } from './TagInput';
import { SENIORITIES } from './types';
import type {
  CandidateProfile,
  CreateResumeInput,
  CreateSearchProfileInput,
  Resume,
  SearchProfile,
  Seniority,
  UpsertCandidateProfileInput,
  WorkFormat,
} from './types';

interface ProfileWorkspaceProps {
  activeSection: Extract<ActiveSection, 'profile' | 'resume' | 'search-profile'>;
  user: AuthUser;
  authorizedRequest: AuthorizedRequest;
  candidateProfile: CandidateProfile | null;
  candidateProfileStatus: 'loading' | 'ready' | 'error';
  candidateProfileError: string | null;
  onCandidateProfileChange: (profile: CandidateProfile | null) => void;
  onRetryCandidateProfile: () => void;
  onNotify: (message: string) => void;
}

function readableLoadError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Не удалось загрузить профиль. Проверьте соединение с FIELD API.';
}

const seniorityOptions: readonly Seniority[] = SENIORITIES;

const workFormatOptions: readonly { value: WorkFormat; label: string }[] = [
  { value: 'REMOTE', label: 'Удалённо' },
  { value: 'HYBRID', label: 'Гибрид' },
  { value: 'ONSITE', label: 'В офисе' },
];

interface ProfileFormState {
  displayName: string;
  locationText: string;
  countryCode: string;
  city: string;
  yearsOfExperience: string;
  seniority: Seniority | '';
  professionalSummary: string;
  skills: string[];
  languages: string[];
  preferredWorkFormats: WorkFormat[];
}

function profileFormState(profile: CandidateProfile | null, user: AuthUser): ProfileFormState {
  return {
    displayName: profile?.displayName ?? user.name?.trim() ?? user.email,
    locationText: profile?.locationText ?? '',
    countryCode: profile?.countryCode ?? '',
    city: profile?.city ?? '',
    yearsOfExperience: profile?.yearsOfExperience?.toString() ?? '',
    seniority: profile?.seniority ?? '',
    professionalSummary: profile?.professionalSummary ?? '',
    skills: profile?.skills ?? [],
    languages: profile?.languages ?? [],
    preferredWorkFormats: profile?.preferredWorkFormats ?? [],
  };
}

function toOptionalText(value: string) {
  return value.trim() || null;
}

function ProfileSettings({
  candidateProfile,
  user,
  onSave,
}: {
  candidateProfile: CandidateProfile | null;
  user: AuthUser;
  onSave: (input: UpsertCandidateProfileInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ProfileFormState>(() => profileFormState(candidateProfile, user));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const displayName = form.displayName.trim();
    const countryCode = form.countryCode.trim().toUpperCase();
    const yearsOfExperience = form.yearsOfExperience.trim();

    if (!displayName) {
      setError('Укажите, как к вам обращаться.');
      return;
    }
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      setError('Код страны должен состоять из двух букв, например RU.');
      return;
    }
    if (yearsOfExperience && !/^(?:[0-9]|[1-7][0-9]|80)$/.test(yearsOfExperience)) {
      setError('Опыт укажите целым числом от 0 до 80.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave({
        displayName,
        locationText: toOptionalText(form.locationText),
        countryCode: countryCode || null,
        city: toOptionalText(form.city),
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
        seniority: form.seniority || null,
        professionalSummary: toOptionalText(form.professionalSummary),
        skills: form.skills,
        languages: form.languages,
        preferredWorkFormats: form.preferredWorkFormats,
      });
    } catch (saveError) {
      setError(readableLoadError(saveError));
    } finally {
      setPending(false);
    }
  };

  const toggleWorkFormat = (format: WorkFormat) => {
    setForm((current) => ({
      ...current,
      preferredWorkFormats: current.preferredWorkFormats.includes(format)
        ? current.preferredWorkFormats.filter((item) => item !== format)
        : [...current.preferredWorkFormats, format],
    }));
  };

  return (
    <section className="profile-section" aria-labelledby="profile-settings-title">
      <div className="profile-section-head">
        <div>
          <p className="profile-card-kicker">Я</p>
          <h2 id="profile-settings-title">Профиль</h2>
          <p>Эти данные помогают настроить поиск и представить вас в FIELD.</p>
        </div>
      </div>

      <form className="profile-card profile-form" onSubmit={(event) => void submit(event)}>
        <div className="profile-form-grid">
          <label className="profile-field profile-field-wide">
            <span>Отображаемое имя *</span>
            <input
              value={form.displayName}
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </label>

          <label className="profile-field">
            <span>Страна</span>
            <input
              value={form.countryCode}
              maxLength={2}
              placeholder="RU"
              onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))}
            />
          </label>

          <label className="profile-field">
            <span>Город</span>
            <input
              value={form.city}
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </label>

          <label className="profile-field profile-field-wide">
            <span>Локация</span>
            <input
              value={form.locationText}
              maxLength={200}
              placeholder="Москва, Россия"
              onChange={(event) => setForm((current) => ({ ...current, locationText: event.target.value }))}
            />
          </label>

          <label className="profile-field">
            <span>Опыт, лет</span>
            <input
              value={form.yearsOfExperience}
              inputMode="numeric"
              onChange={(event) => setForm((current) => ({ ...current, yearsOfExperience: event.target.value }))}
            />
          </label>

          <label className="profile-field">
            <span>Уровень</span>
            <select
              value={form.seniority}
              onChange={(event) => setForm((current) => ({ ...current, seniority: event.target.value as Seniority | '' }))}
            >
              <option value="">Не указан</option>
              {seniorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <label className="profile-field profile-field-wide">
            <span>О себе</span>
            <textarea
              value={form.professionalSummary}
              maxLength={10_000}
              rows={6}
              onChange={(event) => setForm((current) => ({ ...current, professionalSummary: event.target.value }))}
            />
          </label>

          <TagInput
            label="Навыки"
            value={form.skills}
            onChange={(skills) => setForm((current) => ({ ...current, skills }))}
            placeholder="TypeScript + Enter"
            maxItems={100}
          />

          <TagInput
            label="Языки"
            value={form.languages}
            onChange={(languages) => setForm((current) => ({ ...current, languages }))}
            placeholder="Русский + Enter"
            maxItems={30}
          />

          <fieldset className="profile-choice-group">
            <legend>Предпочтительный формат работы</legend>
            <div className="profile-choice-list">
              {workFormatOptions.map((option) => (
                <label className="profile-choice" key={option.value}>
                  <input
                    type="checkbox"
                    checked={form.preferredWorkFormats.includes(option.value)}
                    onChange={() => toggleWorkFormat(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {error && <p className="profile-message is-error" role="alert">{error}</p>}

        <div className="profile-form-actions">
          <button className="profile-primary-button" type="submit" disabled={pending}>
            <Check aria-hidden="true" />
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ProfileWorkspace({
  activeSection,
  user,
  authorizedRequest,
  candidateProfile,
  candidateProfileStatus,
  candidateProfileError,
  onCandidateProfileChange,
  onRetryCandidateProfile,
  onNotify,
}: ProfileWorkspaceProps) {
  const api = useMemo(() => createDomainApi(authorizedRequest), [authorizedRequest]);
  const [searchProfiles, setSearchProfiles] = useState<SearchProfile[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    void Promise.all([api.searchProfiles.list(), api.resumes.list()])
      .then(([nextSearchProfiles, nextResumes]) => {
        if (!active) return;
        setSearchProfiles(nextSearchProfiles);
        setResumes(nextResumes);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(readableLoadError(error));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, reloadKey]);

  const createSearchProfile = async (input: CreateSearchProfileInput) => {
    const created = await api.searchProfiles.create(input);
    setSearchProfiles((current) => [created, ...current]);
    onNotify('Профиль поиска создан');
  };

  const updateSearchProfile = async (id: string, input: CreateSearchProfileInput) => {
    const updated = await api.searchProfiles.update(id, input);
    setSearchProfiles((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    onNotify('Профиль поиска сохранён');
  };

  const deleteSearchProfile = async (id: string) => {
    await api.searchProfiles.remove(id);
    setSearchProfiles((current) => current.filter((item) => item.id !== id));
    onNotify('Профиль поиска удалён');
  };

  const createResume = async (input: CreateResumeInput) => {
    const created = await api.resumes.create(input);
    setResumes((current) => [created, ...current]);
    onNotify('Резюме создано');
  };

  const updateResume = async (id: string, input: CreateResumeInput) => {
    const updated = await api.resumes.update(id, input);
    setResumes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    onNotify('Резюме сохранено');
  };

  const archiveResume = async (id: string) => {
    await api.resumes.remove(id);
    setResumes((current) => current.filter((item) => item.id !== id));
    onCandidateProfileChange(
      candidateProfile?.primaryResumeId === id
        ? { ...candidateProfile, primaryResumeId: null }
        : candidateProfile,
    );
    onNotify('Резюме перемещено в архив');
  };

  const setPrimaryResume = async (id: string | null) => {
    if (candidateProfileStatus !== 'ready') {
      throw new Error('Внутренний профиль ещё загружается. Повторите действие.');
    }
    const authDisplayName = user.name?.trim() || user.email;
    const saved = await api.profile.upsert({
      displayName: candidateProfile?.displayName || authDisplayName.slice(0, 120),
      primaryResumeId: id,
    });
    onCandidateProfileChange(saved);
    onNotify(id ? 'Основное резюме выбрано' : 'Отметка основного резюме снята');
  };

  const saveCandidateProfile = async (input: UpsertCandidateProfileInput) => {
    const saved = await api.profile.upsert(input);
    onCandidateProfileChange(saved);
    onNotify('Профиль сохранён');
  };

  const workspaceLoading = loading || candidateProfileStatus === 'loading';
  const workspaceError =
    loadError || (candidateProfileStatus === 'error' ? candidateProfileError : null);

  return (
    <div className="content-view profile-workspace">
      <Header
        eyebrow={
          activeSection === 'search-profile'
            ? 'Поиск'
            : activeSection === 'resume'
              ? 'Я'
              : 'Я'
        }
        title={
          activeSection === 'search-profile'
            ? 'Что я хочу'
            : activeSection === 'resume'
              ? 'Резюме'
              : 'Профиль'
        }
        description={
          activeSection === 'search-profile'
            ? 'Сохраните критерии для подходящих вакансий.'
            : activeSection === 'resume'
              ? 'Храните рабочие версии резюме в FIELD.'
              : 'Настройте сведения, которые FIELD использует о вас.'
        }
      />

      {workspaceLoading ? (
        <div className="profile-loading" aria-busy="true" role="status">
          <span className="profile-spinner" aria-hidden="true" />
          <div>
            <strong>Загружаем профиль</strong>
            <p>Получаем актуальные данные из FIELD…</p>
          </div>
        </div>
      ) : workspaceError ? (
        <div className="profile-load-error" role="alert">
          <strong>Не удалось открыть профиль</strong>
          <p>{workspaceError}</p>
          <button
            className="profile-secondary-button"
            type="button"
            onClick={() => {
              setReloadKey((value) => value + 1);
              onRetryCandidateProfile();
            }}
          >
            <RefreshCw aria-hidden="true" /> Повторить
          </button>
        </div>
      ) : (
        <div className="profile-tab-panel" key={activeSection}>
          {activeSection === 'profile' && (
            <ProfileSettings
              candidateProfile={candidateProfile}
              user={user}
              onSave={saveCandidateProfile}
            />
          )}
          {activeSection === 'search-profile' && (
            <SearchProfilesSection
              profiles={searchProfiles}
              onCreate={createSearchProfile}
              onUpdate={updateSearchProfile}
              onDelete={deleteSearchProfile}
            />
          )}
          {activeSection === 'resume' && (
            <ResumesSection
              resumes={resumes}
              primaryResumeId={candidateProfile?.primaryResumeId ?? null}
              onCreate={createResume}
              onUpdate={updateResume}
              onArchive={archiveResume}
              onSetPrimary={setPrimaryResume}
            />
          )}
        </div>
      )}
    </div>
  );
}
