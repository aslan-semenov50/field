import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const cookieParser = require('cookie-parser');

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    try {
      const emails = [...createdEmails];
      if (prisma && emails.length > 0) {
        await prisma.refreshSession.deleteMany({ where: { user: { email: { in: emails } } } });
        await prisma.user.deleteMany({ where: { email: { in: emails } } });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
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
    await request(server).post('/auth/refresh').send({}).expect(401);
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
});
