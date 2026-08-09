import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    sign: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      sign: jest.fn().mockReturnValue('signed-refresh-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'unit-refresh-secret';
              if (key === 'JWT_REFRESH_TTL') return '30d';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('maps a missing refresh token to 401', async () => {
    await expect(service.refresh('')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it.each(['malformed', 'expired'])('maps a %s refresh token to 401', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('JWT verification failed');
    });

    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps a concurrent email P2002 to 409', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['email'] },
      }),
    );

    await expect(service.register('  USER@EXAMPLE.COM  ', 'password123')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a deleted user in me', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.me('deleted-user-id')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the configured refresh TTL for cookies and sessions', () => {
    expect(service.getRefreshTtlMs()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
