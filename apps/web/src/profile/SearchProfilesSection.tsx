import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { TagInput } from './TagInput';
import type {
  CreateSearchProfileInput,
  EmploymentType,
  SearchProfile,
  Seniority,
  WorkFormat,
} from './types';

interface SearchProfilesSectionProps {
  profiles: SearchProfile[];
  onCreate: (input: CreateSearchProfileInput) => Promise<void>;
  onUpdate: (id: string, input: CreateSearchProfileInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface SearchFormState {
  name: string;
  roleTitles: string[];
  seniorities: Seniority[];
  salaryMin: string;
  salaryCurrency: string;
  countryCodes: string[];
  cities: string[];
  workFormats: WorkFormat[];
  employmentTypes: EmploymentType[];
  requiredSkills: string[];
  preferredSkills: string[];
}

const seniorityOptions: readonly { value: Seniority; label: string }[] = [
  { value: 'INTERN', label: 'Стажёр' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'MID', label: 'Middle' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

const workFormatOptions: readonly { value: WorkFormat; label: string }[] = [
  { value: 'REMOTE', label: 'Удалённо' },
  { value: 'HYBRID', label: 'Гибрид' },
  { value: 'ONSITE', label: 'В офисе' },
];

const employmentOptions: readonly { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Полная занятость' },
  { value: 'PART_TIME', label: 'Частичная' },
  { value: 'CONTRACT', label: 'Контракт' },
  { value: 'TEMPORARY', label: 'Временная' },
  { value: 'INTERNSHIP', label: 'Стажировка' },
  { value: 'FREELANCE', label: 'Фриланс' },
];

const emptyForm: SearchFormState = {
  name: '',
  roleTitles: [],
  seniorities: [],
  salaryMin: '',
  salaryCurrency: '',
  countryCodes: [],
  cities: [],
  workFormats: [],
  employmentTypes: [],
  requiredSkills: [],
  preferredSkills: [],
};

function formFromProfile(profile: SearchProfile): SearchFormState {
  return {
    name: profile.name,
    roleTitles: profile.roleTitles,
    seniorities: profile.seniorities,
    salaryMin: profile.salaryMin ?? '',
    salaryCurrency: profile.salaryCurrency ?? '',
    countryCodes: profile.countryCodes,
    cities: profile.cities,
    workFormats: profile.workFormats,
    employmentTypes: profile.employmentTypes,
    requiredSkills: profile.requiredSkills,
    preferredSkills: profile.preferredSkills,
  };
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось сохранить профиль поиска.';
}

function validateAndSerialize(form: SearchFormState): CreateSearchProfileInput {
  const name = form.name.trim();
  if (!name) throw new Error('Укажите название профиля поиска.');

  const salaryText = form.salaryMin.trim();
  if (salaryText && !/^\d+(?:\.\d{1,2})?$/.test(salaryText)) {
    throw new Error('Зарплата должна быть положительным числом, максимум с двумя знаками после точки.');
  }

  const salaryMin = salaryText ? Number(salaryText) : null;
  if (salaryMin !== null && (!Number.isFinite(salaryMin) || salaryMin < 0)) {
    throw new Error('Минимальная зарплата не может быть отрицательной.');
  }

  const salaryCurrency = form.salaryCurrency.trim().toUpperCase();
  if (salaryCurrency && !/^[A-Z]{3}$/.test(salaryCurrency)) {
    throw new Error('Валюта должна состоять из трёх букв, например EUR или RUB.');
  }

  const countryCodes = form.countryCodes.map((code) => code.toUpperCase());
  if (countryCodes.some((code) => !/^[A-Z]{2}$/.test(code))) {
    throw new Error('Коды стран должны состоять из двух букв, например DE или RU.');
  }

  return {
    name,
    roleTitles: form.roleTitles,
    seniorities: form.seniorities,
    salaryMin,
    salaryCurrency: salaryCurrency || null,
    countryCodes,
    cities: form.cities,
    workFormats: form.workFormats,
    employmentTypes: form.employmentTypes,
    requiredSkills: form.requiredSkills,
    preferredSkills: form.preferredSkills,
  };
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
}

function ChoiceGroup<T extends string>({ label, options, values, onChange }: ChoiceGroupProps<T>) {
  return (
    <fieldset className="profile-choice-group">
      <legend>{label}</legend>
      <div className="profile-choice-list">
        {options.map((option) => (
          <label className="profile-choice" key={option.value}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => onChange(toggleValue(values, option.value))}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SearchProfileForm({
  profile,
  onCancel,
  onSubmit,
}: {
  profile: SearchProfile | null;
  onCancel: () => void;
  onSubmit: (input: CreateSearchProfileInput) => Promise<void>;
}) {
  const [form, setForm] = useState<SearchFormState>(() =>
    profile ? formFromProfile(profile) : emptyForm,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    try {
      const input = validateAndSerialize(form);
      setPending(true);
      await onSubmit(input);
    } catch (submitError) {
      setError(readableError(submitError));
      setPending(false);
    }
  };

  return (
    <form className="profile-card profile-editor" onSubmit={(event) => void submit(event)}>
      <div className="profile-card-head">
        <div>
          <p className="profile-card-kicker">{profile ? 'Редактирование' : 'Новый поиск'}</p>
          <h2>{profile ? profile.name : 'Профиль поиска'}</h2>
        </div>
        <button className="profile-icon-button" type="button" aria-label="Закрыть форму" onClick={onCancel}>
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="profile-form-grid">
        <label className="profile-field profile-field-wide">
          <span>Название *</span>
          <input
            value={form.name}
            maxLength={100}
            placeholder="Например, Frontend в Европе"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>

        <TagInput
          label="Желаемые роли"
          value={form.roleTitles}
          onChange={(roleTitles) => setForm((current) => ({ ...current, roleTitles }))}
          placeholder="Frontend developer + Enter"
          maxItems={20}
        />

        <ChoiceGroup
          label="Уровень"
          options={seniorityOptions}
          values={form.seniorities}
          onChange={(seniorities) => setForm((current) => ({ ...current, seniorities }))}
        />

        <label className="profile-field">
          <span>Минимальная зарплата</span>
          <input
            value={form.salaryMin}
            inputMode="decimal"
            placeholder="100000"
            onChange={(event) => setForm((current) => ({ ...current, salaryMin: event.target.value }))}
          />
        </label>

        <label className="profile-field">
          <span>Валюта</span>
          <input
            value={form.salaryCurrency}
            maxLength={3}
            placeholder="EUR"
            onChange={(event) =>
              setForm((current) => ({ ...current, salaryCurrency: event.target.value.toUpperCase() }))
            }
          />
        </label>

        <TagInput
          label="Коды стран"
          value={form.countryCodes}
          onChange={(countryCodes) => setForm((current) => ({ ...current, countryCodes }))}
          placeholder="DE + Enter"
          maxItems={50}
          transformValue={(value) => value.toUpperCase()}
        />

        <TagInput
          label="Города"
          value={form.cities}
          onChange={(cities) => setForm((current) => ({ ...current, cities }))}
          placeholder="Берлин + Enter"
          maxItems={50}
        />

        <ChoiceGroup
          label="Формат работы"
          options={workFormatOptions}
          values={form.workFormats}
          onChange={(workFormats) => setForm((current) => ({ ...current, workFormats }))}
        />

        <ChoiceGroup
          label="Тип занятости"
          options={employmentOptions}
          values={form.employmentTypes}
          onChange={(employmentTypes) => setForm((current) => ({ ...current, employmentTypes }))}
        />

        <TagInput
          label="Обязательные навыки"
          value={form.requiredSkills}
          onChange={(requiredSkills) => setForm((current) => ({ ...current, requiredSkills }))}
          placeholder="TypeScript + Enter"
          maxItems={100}
        />

        <TagInput
          label="Желательные навыки"
          value={form.preferredSkills}
          onChange={(preferredSkills) => setForm((current) => ({ ...current, preferredSkills }))}
          placeholder="Node.js + Enter"
          maxItems={100}
        />
      </div>

      {error && <p className="profile-message is-error" role="alert">{error}</p>}

      <div className="profile-form-actions">
        <button className="profile-secondary-button" type="button" onClick={onCancel}>Отмена</button>
        <button className="profile-primary-button" type="submit" disabled={pending}>
          <Check aria-hidden="true" />
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}

export function SearchProfilesSection({
  profiles,
  onCreate,
  onUpdate,
  onDelete,
}: SearchProfilesSectionProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingProfile = useMemo(
    () => profiles.find((profile) => profile.id === editingId) ?? null,
    [editingId, profiles],
  );

  const submit = async (input: CreateSearchProfileInput) => {
    if (editingId === 'new') await onCreate(input);
    else if (editingId) await onUpdate(editingId, input);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    setDeletePending(id);
    setError(null);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } catch (deleteError) {
      setError(readableError(deleteError));
    } finally {
      setDeletePending(null);
    }
  };

  if (editingId) {
    return (
      <div id="profile-panel-search" role="tabpanel" aria-labelledby="profile-tab-search">
        <SearchProfileForm
          key={editingId}
          profile={editingProfile}
          onCancel={() => setEditingId(null)}
          onSubmit={submit}
        />
      </div>
    );
  }

  return (
    <section
      className="profile-section"
      id="profile-panel-search"
      role="tabpanel"
      aria-labelledby="profile-tab-search"
    >
      <div className="profile-section-head">
        <div>
          <p className="profile-card-kicker">Цели поиска</p>
          <h2 id="search-profiles-title">Что вы ищете</h2>
          <p>Создавайте отдельные наборы критериев для разных направлений.</p>
        </div>
        <button className="profile-primary-button" type="button" onClick={() => setEditingId('new')}>
          <Plus aria-hidden="true" /> Новый профиль
        </button>
      </div>

      {error && <p className="profile-message is-error" role="alert">{error}</p>}

      {profiles.length === 0 ? (
        <div className="profile-empty">
          <strong>Профилей поиска пока нет</strong>
          <p>Добавьте первый, чтобы сохранить роли, локации и условия работы.</p>
          <button className="profile-secondary-button" type="button" onClick={() => setEditingId('new')}>
            Создать профиль поиска
          </button>
        </div>
      ) : (
        <div className="profile-list">
          {profiles.map((profile) => (
            <article className="profile-card profile-list-card" key={profile.id}>
              <div className="profile-card-head">
                <div>
                  <p className="profile-card-kicker">{profile.isActive ? 'Активный поиск' : 'Неактивный'}</p>
                  <h3>{profile.name}</h3>
                </div>
                <div className="profile-card-actions">
                  <button className="profile-icon-button" type="button" aria-label={`Изменить ${profile.name}`} onClick={() => setEditingId(profile.id)}>
                    <Pencil aria-hidden="true" />
                  </button>
                  <button className="profile-icon-button is-danger" type="button" aria-label={`Удалить ${profile.name}`} onClick={() => setConfirmDeleteId(profile.id)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="profile-summary-grid">
                <div><span>Роли</span><strong>{profile.roleTitles.join(', ') || 'Не указаны'}</strong></div>
                <div><span>Локации</span><strong>{[...profile.countryCodes, ...profile.cities].join(', ') || 'Любые'}</strong></div>
                <div><span>Формат</span><strong>{profile.workFormats.map((item) => workFormatOptions.find((option) => option.value === item)?.label ?? item).join(', ') || 'Любой'}</strong></div>
                <div><span>Зарплата</span><strong>{profile.salaryMin ? `от ${profile.salaryMin} ${profile.salaryCurrency ?? ''}`.trim() : 'Не указана'}</strong></div>
              </div>

              {confirmDeleteId === profile.id && (
                <div className="profile-confirm" role="alert">
                  <span>Удалить этот профиль поиска?</span>
                  <button type="button" onClick={() => void remove(profile.id)} disabled={deletePending === profile.id}>
                    {deletePending === profile.id ? 'Удаляем…' : 'Да, удалить'}
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)}>Отмена</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
