import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const cookieParser = require('cookie-parser');

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];
  let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch> | undefined;

  const runId = `${Date.now().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const createdEmails = new Set<string>();

  const testEmail = (scenario: string) => {
    const email = `field.e2e.${runId}.${scenario}@example.com`;
    createdEmails.add(email);
    return email;
  };

  const refreshCookieFrom = (response: { headers: Record<string, string | string[] | undefined> }) => {
    const header = response.headers['set-cookie'];
    const cookies = Array.isArray(header) ? header : header ? [header] : [];
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    expect(refreshCookie).toBeDefined();
    return refreshCookie!.split(';')[0];
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    try {
      const emails = [...createdEmails];
      if (prisma && emails.length > 0) {
        await prisma.hhOAuthState.deleteMany({ where: { user: { email: { in: emails } } } });
        await prisma.hhConnection.deleteMany({ where: { user: { email: { in: emails } } } });
        await prisma.refreshSession.deleteMany({ where: { user: { email: { in: emails } } } });
        await prisma.user.deleteMany({ where: { email: { in: emails } } });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = undefined;
  });

  it('register -> me', async () => {
    const email = testEmail('register-me');
    const registerResponse = await request(server)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'Register User' })
      .expect(201);

    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    refreshCookieFrom(registerResponse);

    const meResponse = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({ email, name: 'Register User' });
  });

  it('duplicate normalized email -> 409', async () => {
    const email = testEmail('duplicate');

    await request(server)
      .post('/auth/register')
      .send({ email: `  ${email.toUpperCase()}  `, password: 'password123' })
      .expect(201);

    await request(server).post('/auth/register').send({ email, password: 'password123' }).expect(409);
  });

  it('invalid password -> 401', async () => {
    const email = testEmail('invalid-password');

    await request(server).post('/auth/register').send({ email, password: 'password123' }).expect(201);

    await request(server).post('/auth/login').send({ email, password: 'x' }).expect(401);
  });

  it('login -> me', async () => {
    const email = testEmail('login-me');
    const password = 'password123';

    await request(server).post('/auth/register').send({ email, password, name: 'Login User' }).expect(201);

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ email: `  ${email.toUpperCase()}  `, password })
      .expect(201);

    const meResponse = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body.email).toBe(email);
  });

  it('refresh cookie -> new access token', async () => {
    const email = testEmail('refresh-access');
    const agent = request.agent(server);
    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    const firstRefreshCookie = refreshCookieFrom(registerResponse);

    const refreshResponse = await agent.post('/auth/refresh').send({}).expect(201);
    const nextRefreshCookie = refreshCookieFrom(refreshResponse);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.accessToken).not.toBe(registerResponse.body.accessToken);
    expect(nextRefreshCookie).not.toBe(firstRefreshCookie);

    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .expect(200);
  });

  it('old refresh cookie after rotation -> 401', async () => {
    const email = testEmail('old-refresh');
    const agent = request.agent(server);
    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    const oldRefreshCookie = refreshCookieFrom(registerResponse);

    await agent.post('/auth/refresh').send({}).expect(201);

    await request(server).post('/auth/refresh').set('Cookie', oldRefreshCookie).send({}).expect(401);
  });

  it('rotation keeps another session active', async () => {
    const email = testEmail('parallel-sessions');
    const password = 'password123';
    const firstAgent = request.agent(server);
    const secondAgent = request.agent(server);

    await firstAgent.post('/auth/register').send({ email, password }).expect(201);
    await secondAgent.post('/auth/login').send({ email, password }).expect(201);

    await firstAgent.post('/auth/refresh').send({}).expect(201);
    const secondRefreshResponse = await secondAgent.post('/auth/refresh').send({}).expect(201);

    expect(secondRefreshResponse.body.accessToken).toEqual(expect.any(String));
  });

  it('logout revokes refresh cookie session', async () => {
    const email = testEmail('logout');
    const agent = request.agent(server);
    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    const refreshCookie = refreshCookieFrom(registerResponse);

    await agent.post('/auth/logout').send({}).expect(201);

    await request(server).post('/auth/refresh').set('Cookie', refreshCookie).send({}).expect(401);
  });

  it('missing refresh token -> 401', async () => {
    await request(server).post('/auth/refresh').expect(401);
  });

  it('invalid refresh token -> 401', async () => {
    await request(server)
      .post('/auth/refresh')
      .set('Cookie', 'refreshToken=not-a-valid-jwt')
      .send({})
      .expect(401);
  });

  it('deleted user is rejected by me', async () => {
    const email = testEmail('deleted-user');
    const registerResponse = await request(server)
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await prisma.user.delete({ where: { email } });

    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(401);
  });

  it('protects all user-owned HH connection endpoints', async () => {
    await request(server).get('/integrations/hh').expect(401);
    await request(server).post('/integrations/hh/connect').expect(401);
    await request(server).delete('/integrations/hh').expect(401);
  });

  it('rejects an HH callback with mismatched browser state before any network call', async () => {
    const email = testEmail('hh-invalid-state');
    const agent = request.agent(server);
    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await agent
      .post('/integrations/hh/connect')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(200);

    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected external request in HH e2e'));

    await agent
      .get('/integrations/hh/callback')
      .query({ state: 'A'.repeat(43), code: 'invalid-state-code' })
      .expect(400);

    expect(fetchSpy).not.toHaveBeenCalled();

    const disconnectResponse = await agent
      .delete('/integrations/hh')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(204);
    const disconnectCookies = Array.isArray(disconnectResponse.headers['set-cookie'])
      ? disconnectResponse.headers['set-cookie']
      : [disconnectResponse.headers['set-cookie']];
    expect(
      disconnectCookies.some((cookie: string | undefined) =>
        cookie?.startsWith('hhOAuthState=;'),
      ),
    ).toBe(true);
    await expect(
      prisma.hhOAuthState.count({ where: { user: { email } } }),
    ).resolves.toBe(0);
  });

  it('does not reconnect after disconnect wins an in-flight HH callback', async () => {
    const email = testEmail('hh-callback-disconnect-race');
    const agent = request.agent(server);
    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);
    const connectResponse = await agent
      .post('/integrations/hh/connect')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(200);
    const state = new URL(connectResponse.body.authorizationUrl).searchParams.get('state');

    let markTokenRequestStarted!: () => void;
    let resolveTokenRequest!: (response: Response) => void;
    const tokenRequestStarted = new Promise<void>((resolve) => {
      markTokenRequestStarted = resolve;
    });
    const tokenResponse = new Promise<Response>((resolve) => {
      resolveTokenRequest = resolve;
    });

    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected external request in HH e2e'));
    fetchSpy
      .mockImplementationOnce(() => {
        markTokenRequestStarted();
        return tokenResponse;
      })
      .mockResolvedValueOnce(
        jsonResponse({ id: `hh-race-${runId}`, auth_type: 'applicant' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const callbackPromise = agent
      .get('/integrations/hh/callback')
      .query({ state, code: 'hh-race-authorization-code' })
      .timeout({ response: 15_000, deadline: 20_000 })
      .expect(302)
      .then((response) => response);

    let tokenRequestWaitTimeout: ReturnType<typeof setTimeout> | undefined;
    const waitForTokenRequest = Promise.race([
      tokenRequestStarted,
      callbackPromise.then(() => {
        throw new Error('HH callback completed before token exchange started');
      }),
      new Promise<never>((_, reject) => {
        tokenRequestWaitTimeout = setTimeout(
          () => reject(new Error('Timed out waiting for HH token exchange')),
          10_000,
        );
      }),
    ]);

    try {
      await waitForTokenRequest;
      await request(server)
        .delete('/integrations/hh')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .timeout({ response: 5_000, deadline: 10_000 })
        .expect(204);
    } finally {
      if (tokenRequestWaitTimeout) {
        clearTimeout(tokenRequestWaitTimeout);
      }
      resolveTokenRequest(
        jsonResponse({
          access_token: 'hh-race-access-token',
          refresh_token: 'hh-race-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      );
      await callbackPromise.catch(() => undefined);
    }

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.headers.location).toBe('http://localhost:5173/?hh=failed');
    await request(server)
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(200, { connected: false });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[2][1]).toMatchObject({
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: 'Bearer hh-race-access-token',
      }),
    });
  });

  it('connects, isolates status, and disconnects only the current FIELD user', async () => {
    const firstEmail = testEmail('hh-first-user');
    const secondEmail = testEmail('hh-second-user');
    const firstAgent = request.agent(server);

    const firstRegister = await firstAgent
      .post('/auth/register')
      .send({ email: firstEmail, password: 'password123' })
      .expect(201);
    const secondRegister = await request(server)
      .post('/auth/register')
      .send({ email: secondEmail, password: 'password123' })
      .expect(201);

    await firstAgent
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${firstRegister.body.accessToken}`)
      .expect(200, { connected: false });

    const connectResponse = await firstAgent
      .post('/integrations/hh/connect')
      .set('Authorization', `Bearer ${firstRegister.body.accessToken}`)
      .expect(200);
    const authorizationUrl = new URL(connectResponse.body.authorizationUrl);
    const state = authorizationUrl.searchParams.get('state');

    expect(authorizationUrl.origin + authorizationUrl.pathname).toBe(
      'https://hh.ru/oauth/authorize',
    );
    expect(authorizationUrl.searchParams.get('response_type')).toBe('code');
    expect(authorizationUrl.searchParams.get('client_id')).toBe('field-e2e-hh-client');
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('role')).toBe('applicant');
    expect(authorizationUrl.searchParams.get('force_role')).toBe('true');
    expect(authorizationUrl.searchParams.has('scope')).toBe(false);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const connectCookies = Array.isArray(connectResponse.headers['set-cookie'])
      ? connectResponse.headers['set-cookie']
      : [connectResponse.headers['set-cookie']];
    const stateCookie = connectCookies.find((cookie: string | undefined) =>
      cookie?.startsWith('hhOAuthState='),
    );
    expect(stateCookie).toContain('HttpOnly');
    expect(stateCookie).toContain('SameSite=Lax');
    expect(stateCookie).toContain('Path=/integrations/hh/callback');

    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected external request in HH e2e'));
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'hh-e2e-access-token',
          refresh_token: 'hh-e2e-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: `hh-${runId}`, auth_type: 'applicant' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const callbackResponse = await firstAgent
      .get('/integrations/hh/callback')
      .query({ state, code: 'hh-e2e-authorization-code' })
      .expect(302);

    expect(callbackResponse.headers.location).toBe(
      'http://localhost:5173/?hh=connected',
    );
    const callbackCookies = Array.isArray(callbackResponse.headers['set-cookie'])
      ? callbackResponse.headers['set-cookie']
      : [callbackResponse.headers['set-cookie']];
    expect(
      callbackCookies.some((cookie: string | undefined) =>
        cookie?.startsWith('hhOAuthState=;'),
      ),
    ).toBe(true);

    const tokenRequest = fetchSpy.mock.calls[0];
    expect(tokenRequest[0]).toBe('https://api.hh.ru/token');
    expect(tokenRequest[1]?.method).toBe('POST');
    const tokenBody = tokenRequest[1]?.body as URLSearchParams;
    expect(Object.fromEntries(tokenBody.entries())).toMatchObject({
      grant_type: 'authorization_code',
      client_id: 'field-e2e-hh-client',
      client_secret: 'field-e2e-hh-secret',
      redirect_uri: 'http://localhost:3000/integrations/hh/callback',
      code: 'hh-e2e-authorization-code',
    });
    expect(tokenBody.get('code_verifier')).toEqual(expect.any(String));
    expect(
      createHash('sha256')
        .update(tokenBody.get('code_verifier')!, 'ascii')
        .digest('base64url'),
    ).toBe(authorizationUrl.searchParams.get('code_challenge'));
    expect(fetchSpy.mock.calls[1][0]).toBe('https://api.hh.ru/me');

    const firstStatus = await firstAgent
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${firstRegister.body.accessToken}`)
      .expect(200);

    expect(firstStatus.body).toMatchObject({
      connected: true,
      hhUserId: `hh-${runId}`,
      connectedAt: expect.any(String),
    });
    expect(firstStatus.body).not.toHaveProperty('accessToken');
    expect(firstStatus.body).not.toHaveProperty('refreshToken');
    expect(JSON.stringify(firstStatus.body)).not.toContain('hh-e2e-access-token');
    expect(JSON.stringify(firstStatus.body)).not.toContain('hh-e2e-refresh-token');

    await request(server)
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${secondRegister.body.accessToken}`)
      .expect(200, { connected: false });

    const secondUser = await prisma.user.findUniqueOrThrow({
      where: { email: secondEmail },
      select: { id: true },
    });
    await prisma.hhConnection.create({
      data: {
        userId: secondUser.id,
        hhUserId: `hh-second-${runId}`,
        accessTokenCiphertext: 'second-user-ciphertext',
        refreshTokenCiphertext: 'second-user-refresh-ciphertext',
        accessTokenExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    await firstAgent
      .delete('/integrations/hh')
      .set('Authorization', `Bearer ${firstRegister.body.accessToken}`)
      .expect(204);

    await firstAgent
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${firstRegister.body.accessToken}`)
      .expect(200, { connected: false });

    const secondStatus = await request(server)
      .get('/integrations/hh')
      .set('Authorization', `Bearer ${secondRegister.body.accessToken}`)
      .expect(200);
    expect(secondStatus.body).toMatchObject({
      connected: true,
      hhUserId: `hh-second-${runId}`,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
