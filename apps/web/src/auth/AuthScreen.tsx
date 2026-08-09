import { useState, type FormEvent } from 'react';
import type { LoginInput, RegisterInput } from './types';

interface AuthScreenProps {
  onLogin: (input: LoginInput) => Promise<void>;
  onRegister: (input: RegisterInput) => Promise<void>;
}

type AuthMode = 'login' | 'register';

function formError(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

export function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'register') {
        await onRegister({ email, password, name: name.trim() || undefined });
      } else {
        await onLogin({ email, password });
      }
    } catch (submitError) {
      setError(formError(submitError));
      setSubmitting(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand" aria-label="FIELD — Your Career Space">
          <strong>FIELD</strong>
          <span>YOUR CAREER SPACE</span>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Авторизация">
          <button
            className="auth-tab"
            type="button"
            role="tab"
            aria-selected={!isRegister}
            onClick={() => changeMode('login')}
          >
            Войти
          </button>
          <button
            className="auth-tab"
            type="button"
            role="tab"
            aria-selected={isRegister}
            onClick={() => changeMode('register')}
          >
            Регистрация
          </button>
        </div>

        <header className="auth-heading">
          <p className="auth-eyebrow">КАРЬЕРНОЕ ПРОСТРАНСТВО</p>
          <h1 id="auth-title">{isRegister ? 'Создать аккаунт' : 'Войти в FIELD'}</h1>
          <p>
            {isRegister
              ? 'Создайте профиль и продолжите работу в FIELD.'
              : 'Войдите, чтобы вернуться к своему карьерному пространству.'}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label className="auth-field">
              <span>Имя</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Как к вам обращаться"
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Пароль</span>
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </label>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}
