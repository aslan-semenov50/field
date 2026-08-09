import { App } from '../App';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthProvider';

export function AuthGate() {
  const { state, login, register, logout, retrySession } = useAuth();

  if (state.status === 'checking') {
    return (
      <main className="auth-shell" aria-busy="true">
        <div className="auth-status">
          <span className="auth-spinner" aria-hidden="true" />
          <strong>FIELD</strong>
          <p>Восстанавливаем сессию…</p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="auth-shell">
        <section className="auth-status" role="alert">
          <strong>FIELD временно недоступен</strong>
          <p>{state.error}</p>
          <button className="auth-submit" type="button" onClick={() => void retrySession()}>
            Повторить
          </button>
        </section>
      </main>
    );
  }

  if (state.status === 'anonymous') {
    return <AuthScreen onLogin={login} onRegister={register} />;
  }

  return <App user={state.user} onLogout={logout} />;
}
