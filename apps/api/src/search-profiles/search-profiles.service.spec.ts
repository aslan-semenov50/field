import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProfilesService } from './search-profiles.service';

describe('SearchProfilesService', () => {
  let service: SearchProfilesService;
  let prisma: {
    searchProfile: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      searchProfile: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchProfilesService>(SearchProfilesService);
  });

  it('creates a profile for the authenticated user only', async () => {
    prisma.searchProfile.create.mockResolvedValue({ id: 'profile-1' });

    await service.create('user-a', { name: 'Frontend roles' });

    expect(prisma.searchProfile.create).toHaveBeenCalledWith({
      data: { name: 'Frontend roles', userId: 'user-a' },
    });
  });

  it('lists only the authenticated user profiles', async () => {
    prisma.searchProfile.findMany.mockResolvedValue([]);

    await service.findAll('user-a');

    expect(prisma.searchProfile.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('reads by both id and authenticated user id', async () => {
    prisma.searchProfile.findFirst.mockResolvedValue({ id: 'profile-1' });

    await service.findOne('user-a', 'profile-1');

    expect(prisma.searchProfile.findFirst).toHaveBeenCalledWith({
      where: { id: 'profile-1', userId: 'user-a' },
    });
  });

  it('returns 404 when reading another user profile', async () => {
    prisma.searchProfile.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-a', 'profile-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates by both id and authenticated user id', async () => {
    prisma.searchProfile.update.mockResolvedValue({ id: 'profile-1' });

    await service.update('user-a', 'profile-1', { isActive: false });

    expect(prisma.searchProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1', userId: 'user-a' },
      data: { isActive: false },
    });
  });

  it('rejects an empty patch', async () => {
    await expect(service.update('user-a', 'profile-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.searchProfile.update).not.toHaveBeenCalled();
  });

  it('returns 404 when updating another user profile', async () => {
    prisma.searchProfile.update.mockRejectedValue(notFoundPrismaError());

    await expect(
      service.update('user-a', 'profile-b', { name: 'Forbidden update' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes by both id and authenticated user id', async () => {
    prisma.searchProfile.delete.mockResolvedValue({ id: 'profile-1' });

    await service.remove('user-a', 'profile-1');

    expect(prisma.searchProfile.delete).toHaveBeenCalledWith({
      where: { id: 'profile-1', userId: 'user-a' },
    });
  });

  it('returns 404 when deleting another user profile', async () => {
    prisma.searchProfile.delete.mockRejectedValue(notFoundPrismaError());

    await expect(service.remove('user-a', 'profile-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: '5.22.0',
  });
}
