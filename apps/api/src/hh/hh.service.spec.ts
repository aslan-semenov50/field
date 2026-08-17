import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HhService } from './hh.service';

describe('HhService', () => {
  let service: HhService;
  let prisma: {
    hhConnection: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    hhOAuthState: {
      upsert: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const encryptionKey = Buffer.alloc(32, 7).toString('base64');
  const configValues: Record<string, string> = {
    CORS_ORIGIN: 'http://localhost:5173',
    HH_CLIENT_ID: 'field-hh-client',
    HH_CLIENT_SECRET: 'field-hh-secret',
    HH_REDIRECT_URI: 'http://localhost:3000/integrations/hh/callback',
    HH_TOKEN_ENCRYPTION_KEY: encryptionKey,
    HH_USER_AGENT: 'FIELD tests (field@example.com)',
  };

  beforeEach(async () => {
    prisma = {
      hhConnection: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      hhOAuthState: {
        upsert: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({
          hhConnection: { upsert: prisma.hhConnection.upsert },
          hhOAuthState: { deleteMany: prisma.hhOAuthState.deleteMany },
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get(HhService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a disconnected status when the user has no connection', async () => {
    prisma.hhConnection.findUnique.mockResolvedValue(null);

    await expect(service.status('user-1')).resolves.toEqual({ connected: false });
    expect(prisma.hhConnection.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { hhUserId: true, connectedAt: true },
    });
  });

  it('returns only safe connection metadata', async () => {
    const connectedAt = new Date('2026-08-17T12:00:00.000Z');
    prisma.hhConnection.findUnique.mockResolvedValue({
      hhUserId: 'hh-user-1',
      connectedAt,
      accessTokenCiphertext: 'must-not-leak',
      refreshTokenCiphertext: 'must-not-leak',
    });

    await expect(service.status('user-1')).resolves.toEqual({
      connected: true,
      hhUserId: 'hh-user-1',
      connectedAt,
    });
  });

  it('creates a state-bound official HH authorization URL with PKCE', async () => {
    const result = await service.connect('user-1');
    const url = new URL(result.authorizationUrl);

    expect(url.origin + url.pathname).toBe('https://hh.ru/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('field-hh-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/integrations/hh/callback',
    );
    expect(url.searchParams.get('state')).toBe(result.state);
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('role')).toBe('applicant');
    expect(url.searchParams.get('force_role')).toBe('true');
    expect(url.searchParams.has('scope')).toBe(false);
    expect(result.authorizationUrl).not.toContain('field-hh-secret');

    expect(prisma.hhOAuthState.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: expect.objectContaining({
        userId: 'user-1',
        stateHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        codeVerifierCiphertext: expect.any(String),
        expiresAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        stateHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        codeVerifierCiphertext: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(prisma.hhOAuthState.upsert.mock.calls[0][0].create.stateHash).not.toBe(
      result.state,
    );
  });

  it('rejects a callback whose browser cookie does not match state', async () => {
    const { state } = await service.connect('user-1');

    await expect(
      service.handleCallback({ state, code: 'authorization-code' }, 'wrong-state'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hhOAuthState.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown or already consumed state', async () => {
    const { state } = await service.connect('user-1');
    prisma.hhOAuthState.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.22.0',
      }),
    );

    await expect(
      service.handleCallback({ state, code: 'authorization-code' }, state),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consumes valid state and handles access denial without calling HH APIs', async () => {
    const attempt = await startAttempt('user-1');
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'));

    await expect(
      service.handleCallback(
        { state: attempt.state, error: 'access_denied' },
        attempt.state,
      ),
    ).resolves.toBe('denied');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prisma.hhConnection.upsert).not.toHaveBeenCalled();
  });

  it('consumes and rejects an expired state before calling HH APIs', async () => {
    const attempt = await startAttempt('user-1');
    const create = prisma.hhOAuthState.upsert.mock.calls.at(-1)[0].create;
    prisma.hhOAuthState.update.mockImplementation(async ({ data }: { data: object }) => ({
      ...create,
      ...data,
      expiresAt: new Date(Date.now() - 1),
      createdAt: new Date(),
    }));
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'));

    await expect(
      service.handleCallback(
        { state: attempt.state, code: 'authorization-code' },
        attempt.state,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exchanges the code, reads /me, and upserts encrypted user-owned tokens', async () => {
    const attempt = await startAttempt('user-1');
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'));
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'hh-access-token',
          refresh_token: 'hh-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'hh-user-1', auth_type: 'applicant' }),
      );

    await expect(
      service.handleCallback(
        { state: attempt.state, code: 'authorization-code' },
        attempt.state,
      ),
    ).resolves.toBe('connected');

    const [tokenUrl, tokenInit] = fetchSpy.mock.calls[0];
    expect(tokenUrl).toBe('https://api.hh.ru/token');
    expect(tokenInit?.method).toBe('POST');
    expect(tokenInit?.headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded',
      'HH-User-Agent': 'FIELD tests (field@example.com)',
    });
    const tokenBody = tokenInit?.body as URLSearchParams;
    expect(Object.fromEntries(tokenBody.entries())).toMatchObject({
      grant_type: 'authorization_code',
      client_id: 'field-hh-client',
      client_secret: 'field-hh-secret',
      redirect_uri: 'http://localhost:3000/integrations/hh/callback',
      code: 'authorization-code',
    });
    expect(tokenBody.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(
      createHash('sha256')
        .update(tokenBody.get('code_verifier')!, 'ascii')
        .digest('base64url'),
    ).toBe(new URL(attempt.authorizationUrl).searchParams.get('code_challenge'));

    expect(fetchSpy.mock.calls[1][0]).toBe('https://api.hh.ru/me');
    expect(fetchSpy.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer hh-access-token',
      'HH-User-Agent': 'FIELD tests (field@example.com)',
    });

    const connection = prisma.hhConnection.upsert.mock.calls[0][0];
    expect(connection.where).toEqual({ userId: 'user-1' });
    expect(connection.create).toMatchObject({
      userId: 'user-1',
      hhUserId: 'hh-user-1',
      accessTokenExpiresAt: expect.any(Date),
      connectedAt: expect.any(Date),
    });
    expect(connection.create.accessTokenCiphertext).not.toContain('hh-access-token');
    expect(connection.create.refreshTokenCiphertext).not.toContain('hh-refresh-token');
    expect(connection.create).not.toHaveProperty('accessToken');
    expect(connection.create).not.toHaveProperty('refreshToken');
  });

  it('revokes and does not save when disconnect cancels the claimed state', async () => {
    const attempt = await startAttempt('user-1');
    prisma.hhOAuthState.deleteMany.mockResolvedValue({ count: 0 });
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'hh-cancelled-access-token',
          refresh_token: 'hh-cancelled-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'hh-user-1', auth_type: 'applicant' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      service.handleCallback(
        { state: attempt.state, code: 'authorization-code' },
        attempt.state,
      ),
    ).resolves.toBe('failed');
    expect(prisma.hhConnection.upsert).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls[2]).toEqual([
      'https://api.hh.ru/token',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer hh-cancelled-access-token',
        }),
      }),
    ]);
  });

  it('rejects a non-applicant /me response and best-effort revokes its token', async () => {
    const attempt = await startAttempt('user-1');
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'hh-orphan-access-token',
          refresh_token: 'hh-orphan-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'hh-employer-user', auth_type: 'employer' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      service.handleCallback(
        { state: attempt.state, code: 'authorization-code' },
        attempt.state,
      ),
    ).resolves.toBe('failed');
    expect(fetchSpy.mock.calls[2]).toEqual([
      'https://api.hh.ru/token',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer hh-orphan-access-token',
        }),
      }),
    ]);
    expect(prisma.hhConnection.upsert).not.toHaveBeenCalled();
  });

  it('deletes local credentials when HH revocation fails', async () => {
    const attempt = await createSuccessfulConnection('user-1');
    prisma.hhConnection.findUnique.mockResolvedValue({
      accessTokenCiphertext: attempt.accessTokenCiphertext,
    });
    jest.restoreAllMocks();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }));

    await expect(service.disconnect('user-1')).resolves.toBeUndefined();
    expect(prisma.hhOAuthState.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.hhConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('cancels a pending OAuth state even without a completed connection', async () => {
    prisma.hhConnection.findUnique.mockResolvedValue(null);
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'));

    await service.disconnect('user-1');

    expect(prisma.hhOAuthState.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('revokes and deletes only the current user connection', async () => {
    const attempt = await createSuccessfulConnection('user-1');
    prisma.hhConnection.findUnique.mockResolvedValue({
      accessTokenCiphertext: attempt.accessTokenCiphertext,
    });
    jest.restoreAllMocks();
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    await service.disconnect('user-1');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.hh.ru/token',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer hh-access-token',
        }),
      }),
    );
    expect(prisma.hhConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.hhOAuthState.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('rejects an invalid token encryption key before creating state', async () => {
    configValues.HH_TOKEN_ENCRYPTION_KEY = 'not-a-32-byte-key';

    await expect(service.connect('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.hhOAuthState.upsert).not.toHaveBeenCalled();

    configValues.HH_TOKEN_ENCRYPTION_KEY = encryptionKey;
  });

  async function startAttempt(userId: string) {
    const result = await service.connect(userId);
    const create = prisma.hhOAuthState.upsert.mock.calls.at(-1)[0].create;
    prisma.hhOAuthState.update.mockImplementation(async ({ data }: { data: object }) => ({
      ...create,
      ...data,
      createdAt: new Date(),
    }));
    return result;
  }

  async function createSuccessfulConnection(userId: string) {
    const attempt = await startAttempt(userId);
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected HH request'))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'hh-access-token',
          refresh_token: 'hh-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'hh-user-1', auth_type: 'applicant' }),
      );

    await service.handleCallback(
      { state: attempt.state, code: 'authorization-code' },
      attempt.state,
    );

    return {
      accessTokenCiphertext:
        prisma.hhConnection.upsert.mock.calls.at(-1)[0].create
          .accessTokenCiphertext,
      fetchSpy,
    };
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
