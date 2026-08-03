import type {
  AddablePlatform,
  GeneralOverviewData,
  Period,
  Platform,
  PlatformWorkspaceData,
  WorkspacePlatform,
} from '../types';

export const generalOverviewData: GeneralOverviewData = {
  metrics: [
    {
      label: 'Отклики',
      value: '42',
      detail: '12% к июню',
      icon: 'send',
    },
    {
      label: 'Ответы',
      value: '18',
      detail: '5 новых',
      icon: 'inbox',
    },
    {
      label: 'Интервью',
      value: '6',
      detail: '2 на неделе',
      icon: 'calendar',
    },
    {
      label: 'Конверсия',
      value: '14,3%',
      detail: '3,1 пункта',
      icon: 'trending',
    },
  ],
  resumes: [
    {
      id: 'product-designer',
      name: 'Product Designer',
      updated: 'Обновлено 28 июля',
      applications: { value: '21', label: 'отклик' },
      responses: { value: '8', label: 'ответов' },
      interviews: { value: '1', label: 'интервью' },
      responseRate: 38,
      interviewRate: 13,
      status: 'Основное',
      statusTone: 'success',
      showStatusDot: true,
    },
    {
      id: 'react-next',
      name: 'React / Next.js',
      updated: 'Обновлено 31 июля',
      applications: { value: '14', label: 'откликов' },
      responses: { value: '7', label: 'ответов' },
      interviews: { value: '4', label: 'интервью' },
      responseRate: 50,
      interviewRate: 57,
      status: 'Лучший рост',
      statusTone: 'warm',
      showStatusDot: true,
    },
    {
      id: 'project-manager',
      name: 'Project Manager',
      updated: 'Обновлено 19 июля',
      applications: { value: '7', label: 'откликов' },
      responses: { value: '3', label: 'ответа' },
      interviews: { value: '1', label: 'интервью' },
      responseRate: 43,
      interviewRate: 33,
      status: 'Наблюдаем',
      statusTone: 'neutral',
    },
  ],
  platforms: [
    {
      platform: 'hh',
      name: 'HH.ru',
      monogram: 'HH',
      applications: '18',
      responses: '9',
      interviews: '2',
      conversion: '11,1%',
      conclusion: 'Стабильный поток',
      positive: true,
    },
    {
      platform: 'habr',
      name: 'Habr',
      monogram: 'H',
      applications: '8',
      responses: '4',
      interviews: '1',
      conversion: '12,5%',
      conclusion: 'Точный отклик',
    },
    {
      platform: 'linkedin',
      name: 'LinkedIn',
      monogram: 'in',
      applications: '6',
      responses: '2',
      interviews: '1',
      conversion: '16,7%',
      conclusion: 'Есть потенциал',
    },
    {
      platform: 'djinni',
      name: 'Djinni',
      monogram: 'D',
      applications: '4',
      responses: '1',
      interviews: '0',
      conversion: '0%',
      conclusion: 'Мало данных',
    },
    {
      platform: 'telegram',
      name: 'Telegram',
      monogram: 'TG',
      applications: '6',
      responses: '2',
      interviews: '2',
      conversion: '33,3%',
      conclusion: 'Лучшая конверсия',
      positive: true,
    },
  ],
  recommendation: {
    eyebrow: 'Наблюдение FIELD',
    prefix: 'Telegram показывает самую высокую конверсию. Версия ',
    emphasis: 'React / Next.js',
    suffix: ' приводит к большему количеству интервью.',
  },
};

export const hhData: PlatformWorkspaceData = {
  name: 'HH.ru',
  sync: 'Сегодня, 10:42',
  events: '4 за сегодня',
  resume: 'React / Next.js',
  resumeDate: 'Версия от 31 июля',
  note: 'Это резюме получает на 18% больше ответов на HH.ru.',
  metrics: ['18', '9', '2', '7'],
  details: ['4 на неделе', '50% ответов', 'Одно завтра', 'Без изменений'],
  vacancies: [
    {
      company: 'Яндекс',
      role: 'Product Designer',
      location: 'Москва · гибрид',
      monogram: 'Я',
      date: 'Сегодня',
      status: 'Ответ',
    },
    {
      company: 'Ozon Tech',
      role: 'UX/UI Designer',
      location: 'Удалённо',
      monogram: 'O',
      date: 'Вчера',
      status: 'Просмотрено',
    },
    {
      company: 'Точка',
      role: 'Senior Product Designer',
      location: 'Удалённо',
      monogram: 'Т',
      date: '30 июл',
      status: 'Интервью',
    },
    {
      company: 'Avito',
      role: 'Product Designer, Growth',
      location: 'Москва · гибрид',
      monogram: 'A',
      date: '28 июл',
      status: 'Отклик',
    },
    {
      company: 'Miro',
      role: 'Product Designer',
      location: 'Удалённо',
      monogram: 'M',
      date: '26 июл',
      status: 'Отклик',
    },
  ],
  messages: [
    {
      sender: 'Анна, Яндекс',
      text: 'Хотим пригласить вас на короткое знакомство с командой.',
      date: '12:14',
      initials: 'АЯ',
    },
    {
      sender: 'Мария, Точка',
      text: 'Подтверждаю встречу завтра в 15:00.',
      date: 'Вчера',
      initials: 'МТ',
    },
    {
      sender: 'Команда Ozon Tech',
      text: 'Спасибо за отклик. Мы посмотрели ваше портфолио.',
      date: '30 июл',
      initials: 'OT',
    },
  ],
};

export const habrData: PlatformWorkspaceData = {
  name: 'Habr',
  sync: 'Сегодня, 09:18',
  events: '2 за сегодня',
  resume: 'React / Next.js',
  resumeDate: 'Версия от 31 июля',
  note: 'На Habr лучше отвечают на отклики с коротким техническим вступлением.',
  metrics: ['8', '4', '1', '3'],
  details: ['2 на неделе', '50% ответов', 'В пятницу', 'Один новый'],
  vacancies: [
    {
      company: 'СберТех',
      role: 'Frontend-разработчик',
      location: 'Удалённо',
      monogram: 'С',
      date: 'Сегодня',
      status: 'Ответ',
    },
    {
      company: 'Контур',
      role: 'React Developer',
      location: 'Екатеринбург · гибрид',
      monogram: 'К',
      date: 'Вчера',
      status: 'Просмотрено',
    },
    {
      company: 'Райффайзен',
      role: 'Frontend Engineer',
      location: 'Удалённо',
      monogram: 'Р',
      date: '29 июл',
      status: 'Интервью',
    },
    {
      company: 'Kaspersky',
      role: 'UI Engineer',
      location: 'Москва',
      monogram: 'K',
      date: '27 июл',
      status: 'Отклик',
    },
  ],
  messages: [
    {
      sender: 'Илья, Контур',
      text: 'Подскажите, когда вам удобно созвониться на этой неделе?',
      date: '11:02',
      initials: 'ИК',
    },
    {
      sender: 'Ольга, СберТех',
      text: 'Спасибо за тестовое — передали его команде.',
      date: 'Вчера',
      initials: 'ОС',
    },
  ],
};

export const linkedinData: PlatformWorkspaceData = {
  name: 'LinkedIn',
  sync: 'Вчера, 21:05',
  events: '1 новое',
  resume: 'Product Designer',
  resumeDate: 'Версия от 28 июля',
  note: 'Международные вакансии чаще отвечают на англоязычную версию резюме.',
  metrics: ['6', '2', '1', '2'],
  details: ['1 на неделе', '33% ответов', 'В понедельник', 'Без изменений'],
  vacancies: [
    {
      company: 'Miro',
      role: 'Product Designer',
      location: 'Remote · Europe',
      monogram: 'M',
      date: 'Вчера',
      status: 'Ответ',
    },
    {
      company: 'JetBrains',
      role: 'UX Designer',
      location: 'Remote',
      monogram: 'J',
      date: '29 июл',
      status: 'Просмотрено',
    },
    {
      company: 'Flo',
      role: 'Product Designer',
      location: 'Remote · EU',
      monogram: 'F',
      date: '26 июл',
      status: 'Интервью',
    },
  ],
  messages: [
    {
      sender: 'Kate, Miro',
      text: 'Your portfolio feels very relevant to the role.',
      date: 'Вчера',
      initials: 'KM',
    },
    {
      sender: 'Alex, JetBrains',
      text: 'Thank you for your interest in our product team.',
      date: '29 июл',
      initials: 'AJ',
    },
  ],
};

export const djinniData: PlatformWorkspaceData = {
  name: 'Djinni',
  sync: 'Сегодня, 08:31',
  events: 'Нет новых',
  resume: 'React / Next.js',
  resumeDate: 'Версия от 31 июля',
  note: 'Данных пока мало. Ещё 5–7 откликов помогут увидеть устойчивую динамику.',
  metrics: ['4', '1', '0', '2'],
  details: ['1 на неделе', '25% ответов', 'Пока нет', 'Без изменений'],
  vacancies: [
    {
      company: 'Readdle',
      role: 'Frontend Engineer',
      location: 'Remote',
      monogram: 'R',
      date: 'Сегодня',
      status: 'Просмотрено',
    },
    {
      company: 'MacPaw',
      role: 'Web Engineer',
      location: 'Remote',
      monogram: 'M',
      date: '28 июл',
      status: 'Ответ',
    },
    {
      company: 'Genesis',
      role: 'React Developer',
      location: 'Remote',
      monogram: 'G',
      date: '25 июл',
      status: 'Отклик',
    },
  ],
  messages: [
    {
      sender: 'Nina, MacPaw',
      text: 'Спасибо! Вернёмся с обратной связью до конца недели.',
      date: '28 июл',
      initials: 'NM',
    },
  ],
};

export const telegramData: PlatformWorkspaceData = {
  name: 'Telegram',
  sync: 'Сегодня, 11:07',
  events: '3 за сегодня',
  resume: 'Product Designer',
  resumeDate: 'Версия от 28 июля',
  note: 'Telegram даёт лучшую конверсию: продолжайте отвечать в первые два часа.',
  metrics: ['6', '2', '2', '1'],
  details: ['3 на неделе', '33% ответов', 'Два активных', 'Ниже среднего'],
  vacancies: [
    {
      company: 'Dodo Brands',
      role: 'Product Designer',
      location: 'Удалённо',
      monogram: 'D',
      date: 'Сегодня',
      status: 'Интервью',
    },
    {
      company: 'Самокат',
      role: 'UX Designer',
      location: 'Москва · гибрид',
      monogram: 'С',
      date: 'Вчера',
      status: 'Ответ',
    },
    {
      company: 'T-Банк',
      role: 'Product Designer',
      location: 'Москва',
      monogram: 'T',
      date: '30 июл',
      status: 'Интервью',
    },
    {
      company: 'Setters',
      role: 'Web Designer',
      location: 'Удалённо',
      monogram: 'S',
      date: '27 июл',
      status: 'Отклик',
    },
  ],
  messages: [
    {
      sender: 'Даша, Dodo',
      text: 'Сможете поговорить с дизайн-лидом завтра?',
      date: '10:24',
      initials: 'ДД',
    },
    {
      sender: 'Лена, Самокат',
      text: 'Отправляю детали по роли и команде.',
      date: 'Вчера',
      initials: 'ЛС',
    },
  ],
};

export const indeedData: PlatformWorkspaceData = {
  name: 'Indeed',
  sync: 'Только что',
  events: 'Импортировано 2',
  resume: 'Product Designer',
  resumeDate: 'Версия от 28 июля',
  note: 'Площадка подключена. FIELD начнёт собирать наблюдения после первых откликов.',
  metrics: ['2', '0', '0', '0'],
  details: ['Первые данные', 'Ожидаем', 'Пока нет', 'Пока нет'],
  vacancies: [
    {
      company: 'North Star',
      role: 'Product Designer',
      location: 'Remote',
      monogram: 'N',
      date: 'Сегодня',
      status: 'Отклик',
    },
    {
      company: 'Bright Labs',
      role: 'UX Designer',
      location: 'Remote',
      monogram: 'B',
      date: 'Сегодня',
      status: 'Отклик',
    },
  ],
  messages: [],
};

export const glassdoorData: PlatformWorkspaceData = {
  name: 'Glassdoor',
  sync: 'Только что',
  events: 'Импортирована 1',
  resume: 'React / Next.js',
  resumeDate: 'Версия от 31 июля',
  note: 'Площадка подключена. Добавьте ещё несколько откликов для первых выводов.',
  metrics: ['1', '0', '0', '0'],
  details: ['Первые данные', 'Ожидаем', 'Пока нет', 'Пока нет'],
  vacancies: [
    {
      company: 'Acme Studio',
      role: 'Frontend Engineer',
      location: 'Remote',
      monogram: 'A',
      date: 'Сегодня',
      status: 'Отклик',
    },
  ],
  messages: [],
};

export const platformData: Record<WorkspacePlatform, PlatformWorkspaceData> = {
  hh: hhData,
  habr: habrData,
  linkedin: linkedinData,
  djinni: djinniData,
  telegram: telegramData,
  indeed: indeedData,
  glassdoor: glassdoorData,
};

export const platformTabs = [
  { id: 'all', label: 'Общая' },
  { id: 'hh', label: 'HH.ru' },
  { id: 'habr', label: 'Habr' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'djinni', label: 'Djinni' },
  { id: 'telegram', label: 'Telegram' },
] satisfies ReadonlyArray<{ id: Platform; label: string }>;

export const addablePlatformOptions = [
  {
    id: 'indeed',
    monogram: 'I',
    name: 'Indeed',
    description: 'Импорт откликов и сообщений',
  },
  {
    id: 'glassdoor',
    monogram: 'G',
    name: 'Glassdoor',
    description: 'Вакансии и статусы откликов',
  },
] satisfies ReadonlyArray<{
  id: AddablePlatform;
  monogram: string;
  name: string;
  description: string;
}>;

export const periodLabels: Record<Period, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  '90d': '90 дней',
};

export const defaultPeriod: Period = '30d';
