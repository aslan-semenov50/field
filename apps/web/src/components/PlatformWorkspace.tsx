import {
  Bell,
  Check,
  Clock3,
  FileText,
  Link2,
  MessageSquare,
  RefreshCw,
  Sparkle,
} from 'lucide-react';
import type {
  BadgeTone,
  PlatformWorkspaceData,
  SummaryMetric,
  SyncStatus,
} from '../types';
import { Badge } from './Badge';
import { Header } from './Header';
import { RevealOnScroll } from './RevealOnScroll';
import { SummaryPanel } from './SummaryPanel';

interface PlatformWorkspaceProps {
  data: PlatformWorkspaceData;
  lastSync: string;
  syncStatus: SyncStatus;
  syncDisabled: boolean;
  vacanciesExpanded: boolean;
  onSync: () => void;
  onToggleVacancies: () => void;
  hhConnection?: {
    status: 'loading' | 'connected' | 'disconnected' | 'error';
    hhUserId: string | null;
    connectedAt: string | null;
    error: string | null;
    action: 'connect' | 'disconnect' | null;
    onConnect: () => void;
    onDisconnect: () => void;
    onRetry: () => void;
  };
}

function vacancyTone(status: string): BadgeTone {
  if (status === 'Интервью') return 'success';
  if (status === 'Ответ') return 'warm';
  return 'neutral';
}

function messageCount(count: number) {
  if (count === 0) return 'Нет новых';
  if (count === 1) return '1 сообщение';
  return `${count} сообщения`;
}

function formatConnectionDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function PlatformWorkspace({
  data,
  lastSync,
  syncStatus,
  syncDisabled,
  vacanciesExpanded,
  onSync,
  onToggleVacancies,
  hhConnection,
}: PlatformWorkspaceProps) {
  const syncLabel =
    syncStatus === 'syncing'
      ? 'Синхронизация…'
      : syncStatus === 'success'
        ? 'Обновлено'
        : 'Синхронизировать';
  const hhConnected = hhConnection?.status === 'connected';
  const hhBusy = hhConnection?.status === 'loading' || hhConnection?.action !== null;
  const hhStatusLabel =
    hhConnection?.status === 'loading'
      ? 'Проверяем…'
      : hhConnection?.status === 'error'
        ? 'Не удалось проверить'
        : hhConnected
          ? 'Активно'
          : 'Не подключено';
  const hhActionLabel =
    hhConnection?.status === 'loading'
      ? 'Проверяем…'
      : hhConnection?.action === 'connect'
        ? 'Подключаем…'
        : hhConnection?.action === 'disconnect'
          ? 'Отключаем…'
          : hhConnection?.status === 'error'
            ? 'Повторить'
            : hhConnected
              ? 'Отключить'
              : 'Подключить';
  const handleHhAction =
    hhConnection?.status === 'error'
      ? hhConnection.onRetry
      : hhConnected
        ? hhConnection?.onDisconnect
        : hhConnection?.onConnect;

  const metrics: SummaryMetric[] = [
    { label: 'Отклики', value: data.metrics[0], detail: data.details[0], icon: 'send' },
    { label: 'Ответы', value: data.metrics[1], detail: data.details[1], icon: 'inbox' },
    { label: 'Интервью', value: data.metrics[2], detail: data.details[2], icon: 'calendar' },
    {
      label: 'Отказы',
      value: data.metrics[3],
      detail: data.details[3],
      icon: 'x',
      mutedDetail: true,
    },
  ];

  return (
    <div className="content-view" id="platformView" aria-live="polite">
      <Header
        description=""
        eyebrow=""
        platformHeading
        title={data.name}
        action={
          hhConnection ? (
            <button
              className={`sync-button hh-connection-button${hhBusy ? ' is-loading' : ''}`}
              type="button"
              disabled={hhBusy}
              aria-label={hhActionLabel}
              onClick={handleHhAction}
            >
              <RefreshCw className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
              <span>{hhActionLabel}</span>
            </button>
          ) : (
            <button
              className={`sync-button${syncStatus === 'syncing' ? ' is-loading' : ''}`}
              type="button"
              disabled={syncDisabled}
              aria-label={syncLabel}
              onClick={onSync}
            >
              <RefreshCw className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
              <span>{syncLabel}</span>
            </button>
          )
        }
      />

      <section className="connection-strip" aria-label="Состояние подключения">
        <div className="connection-item">
          <span className="connection-icon">
            <Link2 className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
          </span>
          <span className="connection-copy">
            <small>Подключение</small>
            <strong
              className={!hhConnection || hhConnected ? 'connected' : undefined}
              title={hhConnection?.status === 'error' ? (hhConnection.error ?? undefined) : undefined}
            >
              {hhConnection ? hhStatusLabel : 'Активно'}
            </strong>
          </span>
        </div>
        <div className="connection-item">
          <span className="connection-icon">
            <Clock3 className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
          </span>
          <span className="connection-copy">
            <small>{hhConnection ? 'Аккаунт HH.ru' : 'Последняя синхронизация'}</small>
            <strong>{hhConnection ? (hhConnection.hhUserId ?? '—') : lastSync}</strong>
          </span>
        </div>
        <div className="connection-item">
          <span className="connection-icon">
            <Bell className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
          </span>
          <span className="connection-copy">
            <small>{hhConnection ? 'Подключено' : 'Новых событий'}</small>
            <strong>
              {hhConnection ? formatConnectionDate(hhConnection.connectedAt) : data.events}
            </strong>
          </span>
        </div>
      </section>

      <RevealOnScroll as="section" className="section">
        <div className="section-heading">
          <h2>Сводка площадки</h2>
          <p>Текущий цикл поиска</p>
        </div>
        <SummaryPanel metrics={metrics} />
      </RevealOnScroll>

      <section className="section platform-layout">
        <RevealOnScroll as="article" className="workspace-card">
          <div className="card-head">
            <h2>Последние вакансии</h2>
            <button
              className="text-button"
              type="button"
              hidden={data.vacancies.length <= 3}
              onClick={onToggleVacancies}
            >
              {vacanciesExpanded ? 'Свернуть' : 'Показать все'}
            </button>
          </div>
          <div className={`recent-list${vacanciesExpanded ? ' is-expanded' : ''}`}>
            {data.vacancies.map((vacancy, index) => (
              <div
                className={`recent-item${index > 2 ? ' is-extra' : ''}`}
                key={`${vacancy.company}-${vacancy.role}`}
              >
                <div className="recent-main">
                  <span className="company-mark">{vacancy.monogram}</span>
                  <span className="recent-copy">
                    <strong>{vacancy.role}</strong>
                    <small>
                      {vacancy.company} · {vacancy.location}
                    </small>
                  </span>
                </div>
                <div className="recent-meta">
                  <time>{vacancy.date}</time>
                  <Badge tone={vacancyTone(vacancy.status)}>{vacancy.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <div className="platform-side-column">
          <RevealOnScroll as="article" className="workspace-card">
            <div className="card-head">
              <h2>Выбранное резюме</h2>
              <span>Для откликов</span>
            </div>
            <div className="resume-selected">
              <span className="file-mark">
                <FileText className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
              </span>
              <span className="resume-selected-copy">
                <strong>{data.resume}</strong>
                <small>{data.resumeDate}</small>
              </span>
              <Badge
                aria-label="Выбранное резюме"
                icon={<Check className="icon selected-check" strokeWidth={1.7} aria-hidden="true" />}
              />
            </div>
            <div className="activity-note">
              <Sparkle className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
              <span>{data.note}</span>
            </div>
          </RevealOnScroll>

          <RevealOnScroll as="article" className="workspace-card" id="messagesSection">
            <div className="card-head">
              <h2>Последние сообщения</h2>
              <span>{messageCount(data.messages.length)}</span>
            </div>
            <div className="message-list">
              {data.messages.length ? (
                data.messages.map((message) => (
                  <div className="message-item" key={`${message.sender}-${message.date}`}>
                    <span className="message-avatar">{message.initials}</span>
                    <div className="message-copy">
                      <div className="message-top">
                        <strong>{message.sender}</strong>
                        <time>{message.date}</time>
                      </div>
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="activity-note empty-message-note">
                  <MessageSquare className="icon" strokeWidth={1.7} aria-hidden="true" focusable="false" />
                  <span>Новые сообщения появятся здесь после синхронизации.</span>
                </div>
              )}
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
