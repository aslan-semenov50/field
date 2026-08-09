import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResumesService } from './resumes.service';

describe('ResumesService', () => {
  const resume = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const candidateProfile = {
    updateMany: jest.fn(),
  };
  const transactionClient = { resume, candidateProfile };
  const prisma = {
    resume,
    $transaction: jest.fn(
      (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    ),
  } as unknown as PrismaService;
  const service = new ResumesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a resume for the authenticated user only', async () => {
    const dto = {
      title: 'Frontend CV',
      languageCode: 'en',
      plainText: 'Experience',
    };
    resume.create.mockResolvedValue({ id: 'resume-a', userId: 'user-a', ...dto });

    await service.create('user-a', dto);

    expect(resume.create).toHaveBeenCalledWith({
      data: { ...dto, userId: 'user-a' },
    });
  });

  it('does not allow a runtime body userId or archivedAt to override ownership', async () => {
    resume.create.mockResolvedValue({ id: 'resume-a' });

    await service.create(
      'user-a',
      {
        title: 'Frontend CV',
        languageCode: 'en',
        userId: 'user-b',
        archivedAt: new Date(),
      } as never,
    );

    expect(resume.create).toHaveBeenCalledWith({
      data: {
        title: 'Frontend CV',
        languageCode: 'en',
        userId: 'user-a',
      },
    });
  });

  it('lists only active resumes owned by the authenticated user', async () => {
    resume.findMany.mockResolvedValue([]);

    await service.findAll('user-a');

    expect(resume.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-a', archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('reads by id, authenticated user id, and active state', async () => {
    resume.findFirst.mockResolvedValue({ id: 'resume-a' });

    await service.findOne('user-a', 'resume-a');

    expect(resume.findFirst).toHaveBeenCalledWith({
      where: { id: 'resume-a', userId: 'user-a', archivedAt: null },
    });
  });

  it('returns 404 when reading a foreign, missing, or archived resume', async () => {
    resume.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-a', 'unavailable')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only an active resume owned by the authenticated user', async () => {
    resume.update.mockResolvedValue({ id: 'resume-a', title: 'Updated CV' });

    await service.update('user-a', 'resume-a', { title: 'Updated CV' });

    expect(resume.update).toHaveBeenCalledWith({
      where: { id: 'resume-a', userId: 'user-a', archivedAt: null },
      data: { title: 'Updated CV' },
    });
  });

  it('rejects an empty patch', async () => {
    await expect(service.update('user-a', 'resume-a', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(resume.update).not.toHaveBeenCalled();
  });

  it('returns 404 when updating a foreign, missing, or archived resume', async () => {
    resume.update.mockRejectedValue(notFoundPrismaError());

    await expect(
      service.update('user-a', 'unavailable', { title: 'Forbidden update' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft archives and clears only the current user matching primary resume', async () => {
    resume.update.mockResolvedValue({ id: 'resume-a' });
    candidateProfile.updateMany.mockResolvedValue({ count: 1 });

    await service.remove('user-a', 'resume-a');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(resume.update).toHaveBeenCalledWith({
      where: { id: 'resume-a', userId: 'user-a', archivedAt: null },
      data: { archivedAt: expect.any(Date) },
    });
    expect(candidateProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-a', primaryResumeId: 'resume-a' },
      data: { primaryResumeId: null },
    });
  });

  it('returns 404 without clearing a profile when the resume is unavailable', async () => {
    resume.update.mockRejectedValue(notFoundPrismaError());

    await expect(service.remove('user-a', 'unavailable')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(candidateProfile.updateMany).not.toHaveBeenCalled();
  });

  it('maps explicit structuredContent null to a database null', async () => {
    resume.update.mockResolvedValue({ id: 'resume-a' });

    await service.update('user-a', 'resume-a', { structuredContent: null });

    expect(resume.update).toHaveBeenCalledWith({
      where: { id: 'resume-a', userId: 'user-a', archivedAt: null },
      data: { structuredContent: Prisma.DbNull },
    });
  });
});

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: '5.22.0',
  });
}
