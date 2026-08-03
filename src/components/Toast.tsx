import { Check } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className={`toast${message ? ' is-visible' : ''}`} role="status" aria-live="polite">
      <Check className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
      <span>{message ?? 'Готово'}</span>
    </div>
  );
}
