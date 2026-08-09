import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  const candidateProfile = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  };
  const resume = {
    findFirst: jest.fn(),
  };
  const transactionClient = { candidateProfile, resume };
  const prisma = {
    candidateProfile,
    $transaction: jest.fn(
      (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient),
    ),
  } as unknown as PrismaService;
  const service = new ProfileService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user profile', async () => {
    const profile = { id: 'profile-a', userId: 'user-a', displayName: 'Alice' };
    candidateProfile.findUnique.mockResolvedValue(profile);

    await expect(service.get('user-a')).resolves.toBe(profile);
    expect(candidateProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-a' } });
  });

  it('returns 404 when the current user has no profile', async () => {
    candidateProfile.findUnique.mockResolvedValue(null);

    await expect(service.get('user-a')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates or updates a profile without accepting a body user id', async () => {
    const dto = { displayName: 'Alice', skills: ['TypeScript'] };
    const profile = { id: 'profile-a', userId: 'user-a', ...dto };
    candidateProfile.upsert.mockResolvedValue(profile);

    await expect(service.upsert('user-a', dto)).resolves.toBe(profile);
    expect(resume.findFirst).not.toHaveBeenCalled();
    expect(candidateProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      create: { userId: 'user-a', ...dto },
      update: dto,
    });
  });

  it('assigns only an active resume owned by the current user', async () => {
    const dto = { displayName: 'Alice', primaryResumeId: 'resume-a' };
    resume.findFirst.mockResolvedValue({ id: 'resume-a' });
    candidateProfile.upsert.mockResolvedValue({ id: 'profile-a', userId: 'user-a', ...dto });

    await service.upsert('user-a', dto);

    expect(resume.findFirst).toHaveBeenCalledWith({
      where: { id: 'resume-a', userId: 'user-a', archivedAt: null },
      select: { id: true },
    });
  });

  it('rejects a missing, archived, or foreign primary resume with a generic 400', async () => {
    resume.findFirst.mockResolvedValue(null);

    const promise = service.upsert('user-a', {
      displayName: 'Alice',
      primaryResumeId: 'unavailable-resume',
    });

    await expect(promise).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'Primary resume is not available',
    });
    expect(candidateProfile.upsert).not.toHaveBeenCalled();
  });

  it('allows the primary resume to be cleared explicitly', async () => {
    const dto = { displayName: 'Alice', primaryResumeId: null };
    candidateProfile.upsert.mockResolvedValue({ id: 'profile-a', userId: 'user-a', ...dto });

    await service.upsert('user-a', dto);

    expect(resume.findFirst).not.toHaveBeenCalled();
    expect(candidateProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      create: { userId: 'user-a', ...dto },
      update: dto,
    });
  });
});
