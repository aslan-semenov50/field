import { Plus, X } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';
import type { AddablePlatform } from '../types';

interface AddableOption {
  id: AddablePlatform;
  monogram: string;
  name: string;
  description: string;
}

interface ConnectPlatformDialogProps {
  open: boolean;
  options: readonly AddableOption[];
  onClose: () => void;
  onConnect: (platform: AddablePlatform) => void;
}

export function ConnectPlatformDialog({
  open,
  options,
  onClose,
  onConnect,
}: ConnectPlatformDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) onClose();
  };

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-body">
        <div className="dialog-head">
          <div>
            <h2>Добавить площадку</h2>
            <p>Соберите все карьерные каналы в FIELD.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть" onClick={onClose}>
            <X className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
          </button>
        </div>
        <div className="platform-options">
          {options.map((option) => (
            <button
              className="platform-option"
              type="button"
              key={option.id}
              onClick={() => onConnect(option.id)}
            >
              <span className="platform-monogram">{option.monogram}</span>
              <span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              <Plus className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
