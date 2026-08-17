import { Archive, Check, FileText, Pencil, Plus, Star, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { CreateResumeInput, Resume } from './types';

interface ResumesSectionProps {
  resumes: Resume[];
  primaryResumeId: string | null;
  onCreate: (input: CreateResumeInput) => Promise<void>;
  onUpdate: (id: string, input: CreateResumeInput) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onSetPrimary: (id: string | null) => Promise<void>;
}

interface ResumeFormState {
  title: string;
  languageCode: string;
  plainText: string;
}

const emptyForm: ResumeFormState = {
  title: '',
  languageCode: 'ru',
  plainText: '',
};

function formFromResume(resume: Resume): ResumeFormState {
  return {
    title: resume.title,
    languageCode: resume.languageCode,
    plainText: resume.plainText ?? '',
  };
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось выполнить действие с резюме.';
}

function serializeResume(form: ResumeFormState): CreateResumeInput {
  const title = form.title.trim();
  const languageCode = form.languageCode.trim();
  const plainText = form.plainText.trim();

  if (!title) throw new Error('Укажите название резюме.');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(languageCode)) {
    throw new Error('Код языка должен выглядеть как ru, en или en-US.');
  }

  return {
    title,
    languageCode,
    plainText: plainText || null,
  };
}

function ResumeForm({
  resume,
  onCancel,
  onSubmit,
}: {
  resume: Resume | null;
  onCancel: () => void;
  onSubmit: (input: CreateResumeInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ResumeFormState>(() =>
    resume ? formFromResume(resume) : emptyForm,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    try {
      const input = serializeResume(form);
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
          <p className="profile-card-kicker">{resume ? 'Редактирование' : 'Новое резюме'}</p>
          <h2>{resume ? resume.title : 'Внутреннее резюме FIELD'}</h2>
        </div>
        <button className="profile-icon-button" type="button" aria-label="Закрыть форму" onClick={onCancel}>
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="profile-form-grid">
        <label className="profile-field">
          <span>Название *</span>
          <input
            value={form.title}
            maxLength={200}
            placeholder="Frontend Resume"
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>

        <label className="profile-field">
          <span>Код языка *</span>
          <input
            value={form.languageCode}
            maxLength={10}
            placeholder="ru или en-US"
            onChange={(event) => setForm((current) => ({ ...current, languageCode: event.target.value }))}
          />
        </label>

        <label className="profile-field profile-field-wide">
          <span>Текст резюме</span>
          <textarea
            value={form.plainText}
            maxLength={100000}
            rows={14}
            placeholder="Опыт, достижения, образование и навыки…"
            onChange={(event) => setForm((current) => ({ ...current, plainText: event.target.value }))}
          />
          <small>{form.plainText.length.toLocaleString('ru-RU')} / 100 000</small>
        </label>
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

export function ResumesSection({
  resumes,
  primaryResumeId,
  onCreate,
  onUpdate,
  onArchive,
  onSetPrimary,
}: ResumesSectionProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingResume = useMemo(
    () => resumes.find((resume) => resume.id === editingId) ?? null,
    [editingId, resumes],
  );

  const submit = async (input: CreateResumeInput) => {
    if (editingId === 'new') await onCreate(input);
    else if (editingId) await onUpdate(editingId, input);
    setEditingId(null);
  };

  const archive = async (id: string) => {
    setPendingId(id);
    setError(null);
    try {
      await onArchive(id);
      setConfirmArchiveId(null);
    } catch (archiveError) {
      setError(readableError(archiveError));
    } finally {
      setPendingId(null);
    }
  };

  const choosePrimary = async (id: string | null) => {
    setPendingId(id ?? 'clear-primary');
    setError(null);
    try {
      await onSetPrimary(id);
    } catch (primaryError) {
      setError(readableError(primaryError));
    } finally {
      setPendingId(null);
    }
  };

  if (editingId) {
    return (
      <div id="profile-panel-resumes" role="tabpanel" aria-labelledby="profile-tab-resumes">
        <ResumeForm
          key={editingId}
          resume={editingResume}
          onCancel={() => setEditingId(null)}
          onSubmit={submit}
        />
      </div>
    );
  }

  return (
    <section
      className="profile-section"
      id="profile-panel-resumes"
      role="tabpanel"
      aria-labelledby="profile-tab-resumes"
    >
      <div className="profile-section-head">
        <div>
          <p className="profile-card-kicker">FIELD Resume</p>
          <h2 id="resumes-title">Внутренние резюме</h2>
          <p>Текстовые версии без загрузки файлов. Primary Resume используется как основное.</p>
        </div>
        <button className="profile-primary-button" type="button" onClick={() => setEditingId('new')}>
          <Plus aria-hidden="true" /> Новое резюме
        </button>
      </div>

      {error && <p className="profile-message is-error" role="alert">{error}</p>}

      {resumes.length === 0 ? (
        <div className="profile-empty">
          <FileText aria-hidden="true" />
          <strong>Резюме пока нет</strong>
          <p>Создайте первую текстовую версию резюме внутри FIELD.</p>
          <button className="profile-secondary-button" type="button" onClick={() => setEditingId('new')}>
            Создать резюме
          </button>
        </div>
      ) : (
        <div className="profile-list">
          {resumes.map((resume) => {
            const isPrimary = resume.id === primaryResumeId;
            return (
              <article className={`profile-card profile-list-card${isPrimary ? ' is-primary' : ''}`} key={resume.id}>
                <div className="profile-card-head">
                  <div>
                    <p className="profile-card-kicker">
                      {isPrimary ? 'Основное резюме' : `Версия ${resume.contentVersion}`}
                    </p>
                    <h3>{resume.title}</h3>
                    <small>{resume.languageCode}</small>
                  </div>
                  <div className="profile-card-actions">
                    <button
                      className={`profile-icon-button${isPrimary ? ' is-primary' : ''}`}
                      type="button"
                      aria-label={isPrimary ? 'Убрать основное резюме' : `Сделать ${resume.title} основным`}
                      title={isPrimary ? 'Убрать отметку основного' : 'Сделать основным'}
                      disabled={pendingId !== null}
                      onClick={() => void choosePrimary(isPrimary ? null : resume.id)}
                    >
                      <Star aria-hidden="true" />
                    </button>
                    <button className="profile-icon-button" type="button" aria-label={`Изменить ${resume.title}`} onClick={() => setEditingId(resume.id)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    <button className="profile-icon-button is-danger" type="button" aria-label={`Архивировать ${resume.title}`} onClick={() => setConfirmArchiveId(resume.id)}>
                      <Archive aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="profile-resume-preview">
                  {resume.plainText || 'Текст резюме пока не добавлен.'}
                </p>

                {confirmArchiveId === resume.id && (
                  <div className="profile-confirm" role="alert">
                    <span>Архивировать резюме? Оно исчезнет из активного списка.</span>
                    <button type="button" onClick={() => void archive(resume.id)} disabled={pendingId === resume.id}>
                      {pendingId === resume.id ? 'Архивируем…' : 'Да, архивировать'}
                    </button>
                    <button type="button" onClick={() => setConfirmArchiveId(null)}>Отмена</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
