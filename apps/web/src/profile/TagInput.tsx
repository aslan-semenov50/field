import { useId, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: string;
  maxItems?: number;
  maxItemLength?: number;
  transformValue?: (value: string) => string;
  disabled?: boolean;
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  hint = 'Введите значение и нажмите Enter',
  maxItems = 30,
  maxItemLength = 100,
  transformValue = (item) => item,
  disabled = false,
}: TagInputProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addTags = (candidates: string[]) => {
    const next = [...value];
    let nextError: string | null = null;

    for (const candidate of candidates) {
      const tag = transformValue(candidate.trim()).trim();
      if (!tag) continue;

      if (tag.length > maxItemLength) {
        nextError = `Не больше ${maxItemLength} символов в одном значении`;
        continue;
      }

      if (next.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
        nextError = `«${tag}» уже добавлено`;
        continue;
      }

      if (next.length >= maxItems) {
        nextError = `Можно добавить не больше ${maxItems} значений`;
        break;
      }

      next.push(tag);
    }

    setError(nextError);
    if (next.length !== value.length) onChange(next);
    return next.length !== value.length;
  };

  const commitDraft = () => {
    if (!draft.trim()) return;
    if (addTags([draft])) setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
      setError(null);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!/[\n,;]/.test(pasted)) return;

    event.preventDefault();
    const added = addTags(pasted.split(/[\n,;]+/));
    if (added) setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
    setError(null);
  };

  return (
    <div className="profile-field tag-field">
      <label htmlFor={inputId}>{label}</label>
      {value.length ? (
        <div className="tag-list" aria-label={`${label}: добавленные значения`}>
          {value.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
              <button
                type="button"
                aria-label={`Удалить ${tag}`}
                disabled={disabled}
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="tag-entry">
        <input
          id={inputId}
          value={draft}
          type="text"
          placeholder={placeholder}
          maxLength={maxItemLength}
          disabled={disabled || value.length >= maxItems}
          aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <button
          className="tag-add-button"
          type="button"
          disabled={disabled || !draft.trim() || value.length >= maxItems}
          onClick={commitDraft}
        >
          Добавить
        </button>
      </div>
      <small className="profile-hint" id={hintId}>
        {hint} · {value.length}/{maxItems}
      </small>
      {error ? (
        <small className="profile-field-error" id={errorId} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}
