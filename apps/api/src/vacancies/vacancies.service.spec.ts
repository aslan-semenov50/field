import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, VacancyLifecycleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VacanciesService } from './vacancies.service';

describe('VacanciesService', () => {
  const vacancy = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = { vacancy } as unknown as PrismaService;
  const service = new VacanciesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only active vacancies by default', async () => {
    vacancy.findMany.mockResolvedValue([vacancyRecord({ id: 'vacancy-a' })]);

    const result = await service.findAll({});

    expect(vacancy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: VacancyLifecycleStatus.ACTIVE },
        orderBy: [
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
        take: 21,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual(['vacancy-a']);
    expect(result.nextCursor).toBeNull();
  });

  it('filters active vacancies by platform code', async () => {
    vacancy.findMany.mockResolvedValue([]);

    await service.findAll({ platform: 'hh' });

    expect(vacancy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: VacancyLifecycleStatus.ACTIVE,
          source: { code: 'hh' },
        },
      }),
    );
  });

  it('returns a cursor from the last visible item when another page exists', async () => {
    vacancy.findMany.mockResolvedValue([
      vacancyRecord({ id: 'vacancy-c' }),
      vacancyRecord({ id: 'vacancy-b' }),
      vacancyRecord({ id: 'vacancy-a' }),
    ]);

    const result = await service.findAll({ limit: 2 });

    expect(vacancy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([
      'vacancy-c',
      'vacancy-b',
    ]);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.nextCursor).not.toBe('vacancy-b');
  });

  it('uses both publishedAt and id from the cursor as the page boundary', async () => {
    vacancy.findMany.mockResolvedValue([]);
    const publishedAt = new Date('2026-08-17T12:00:00.000Z');
    const cursor = Buffer.from(
      JSON.stringify({ id: 'previous-id', publishedAt: publishedAt.toISOString() }),
    ).toString('base64url');

    await service.findAll({ cursor });

    expect(vacancy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: VacancyLifecycleStatus.ACTIVE,
          OR: [
            { publishedAt: { lt: publishedAt } },
            { publishedAt, id: { lt: 'previous-id' } },
            { publishedAt: null },
          ],
        },
      }),
    );
  });

  it('rejects a malformed cursor', async () => {
    await expect(service.findAll({ cursor: 'not-a-cursor' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(vacancy.findMany).not.toHaveBeenCalled();
  });

  it('serializes salary decimals as fixed two-decimal strings', async () => {
    vacancy.findUnique.mockResolvedValue(
      vacancyRecord({
        salaryMin: new Prisma.Decimal('123456.7'),
        salaryMax: new Prisma.Decimal('150000'),
      }),
    );

    const result = await service.findOne('vacancy-a');

    expect(result.salaryMin).toBe('123456.70');
    expect(result.salaryMax).toBe('150000.00');
  });

  it('returns 404 for an unknown vacancy', async () => {
    vacancy.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function vacancyRecord(overrides: Record<string, unknown> = {}) {
  const timestamp = new Date('2026-08-17T12:00:00.000Z');

  return {
    id: 'vacancy-a',
    sourceId: 'source-a',
    externalId: 'external-a',
    title: 'Senior TypeScript Engineer',
    companyName: 'FIELD Labs',
    description: 'Build FIELD.',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    locationText: null,
    countryCode: null,
    city: null,
    workFormat: null,
    employmentType: null,
    skills: ['TypeScript'],
    sourceUrl: 'https://example.com/vacancies/external-a',
    publishedAt: timestamp,
    lastSeenAt: timestamp,
    status: VacancyLifecycleStatus.ACTIVE,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: {
      id: 'source-a',
      code: 'hh',
      name: 'HH.ru',
    },
    ...overrides,
  };
}
