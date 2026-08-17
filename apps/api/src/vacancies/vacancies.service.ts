import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VacancyLifecycleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListVacanciesQueryDto } from './dto/list-vacancies-query.dto';

const vacancySelect = {
  id: true,
  sourceId: true,
  externalId: true,
  title: true,
  companyName: true,
  description: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryPeriod: true,
  locationText: true,
  countryCode: true,
  city: true,
  workFormat: true,
  employmentType: true,
  skills: true,
  sourceUrl: true,
  publishedAt: true,
  lastSeenAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  source: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.VacancySelect;

type VacancyRecord = Prisma.VacancyGetPayload<{ select: typeof vacancySelect }>;

@Injectable()
export class VacanciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListVacanciesQueryDto) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const vacancies = await this.prisma.vacancy.findMany({
      where: {
        status: VacancyLifecycleStatus.ACTIVE,
        ...(query.platform ? { source: { code: query.platform } } : {}),
        ...(cursor ? cursorWhere(cursor) : {}),
      },
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit + 1,
      select: vacancySelect,
    });

    const hasNextPage = vacancies.length > limit;
    const visibleVacancies = vacancies.slice(0, limit);

    return {
      items: visibleVacancies.map(serializeVacancy),
      nextCursor: hasNextPage
        ? encodeCursor(visibleVacancies[visibleVacancies.length - 1])
        : null,
    };
  }

  async findOne(id: string) {
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id },
      select: vacancySelect,
    });

    if (!vacancy) {
      throw new NotFoundException('Vacancy not found');
    }

    return serializeVacancy(vacancy);
  }
}

function serializeVacancy(vacancy: VacancyRecord) {
  return {
    ...vacancy,
    salaryMin: vacancy.salaryMin?.toFixed(2) ?? null,
    salaryMax: vacancy.salaryMax?.toFixed(2) ?? null,
  };
}

type VacancyCursor = {
  id: string;
  publishedAt: Date | null;
};

function encodeCursor(vacancy: Pick<VacancyRecord, 'id' | 'publishedAt'>) {
  return Buffer.from(
    JSON.stringify({
      id: vacancy.id,
      publishedAt: vacancy.publishedAt?.toISOString() ?? null,
    }),
  ).toString('base64url');
}

function decodeCursor(value: string): VacancyCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      parsed.id.length === 0 ||
      parsed.id.length > 64 ||
      (parsed.publishedAt !== null && typeof parsed.publishedAt !== 'string')
    ) {
      throw new Error('Invalid cursor');
    }

    if (parsed.publishedAt === null) {
      return { id: parsed.id, publishedAt: null };
    }

    const publishedAt = new Date(parsed.publishedAt as string);
    if (Number.isNaN(publishedAt.getTime())) {
      throw new Error('Invalid cursor');
    }

    return { id: parsed.id, publishedAt };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

function cursorWhere(cursor: VacancyCursor): Prisma.VacancyWhereInput {
  if (!cursor.publishedAt) {
    return {
      publishedAt: null,
      id: { lt: cursor.id },
    };
  }

  return {
    OR: [
      { publishedAt: { lt: cursor.publishedAt } },
      { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
      { publishedAt: null },
    ],
  };
}
