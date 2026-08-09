import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const cookieParser = require('cookie-parser');

type Actor = {
  email: string;
  accessToken: string;
};

describe('Professional domain e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];
  let actorA: Actor;
  let actorB: Actor;

  const runId = `${Date.now().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const createdEmails: string[] = [];

  const auth = (actor: Actor) => ({ Authorization: `Bearer ${actor.accessToken}` });

  const registerActor = async (label: string): Promise<Actor> => {
    const email = `field.domain.${runId}.${label}@example.com`;
    createdEmails.push(email);
    const response = await request(server)
      .post('/auth/register')
      .send({ email, password: 'password123', name: `Domain ${label}` })
      .expect(201);

    return { email, accessToken: response.body.accessToken };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer();
    actorA = await registerActor('actor-a');
    actorB = await registerActor('actor-b');
  });

  afterAll(async () => {
    try {
      if (prisma && createdEmails.length > 0) {
        await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
      }
    } finally {
      if (app) await app.close();
    }
  });

  describe('CandidateProfile', () => {
    it.each(['/profile', '/search-profiles', '/resumes'])('%s rejects unauthenticated access', async (url) => {
      await request(server).get(url).expect(401);
    });

    it('creates, updates, and gets the current user profile', async () => {
      const created = await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({
          displayName: '  Alice Candidate  ',
          locationText: '  Austin, Texas  ',
          countryCode: 'us',
          city: '  Austin  ',
          yearsOfExperience: 5,
          seniority: 'SENIOR',
          professionalSummary: '  Frontend engineer  ',
          skills: [' React ', 'TypeScript'],
          languages: [' English ', 'Russian'],
          preferredWorkFormats: ['REMOTE', 'HYBRID'],
        })
        .expect(200);

      expect(created.body).toMatchObject({
        displayName: 'Alice Candidate',
        countryCode: 'US',
        city: 'Austin',
        skills: ['React', 'TypeScript'],
        primaryResumeId: null,
      });

      const updated = await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({ displayName: 'Alice Updated', yearsOfExperience: 6 })
        .expect(200);

      expect(updated.body.id).toBe(created.body.id);
      expect(updated.body).toMatchObject({
        displayName: 'Alice Updated',
        yearsOfExperience: 6,
        countryCode: 'US',
      });

      const profile = await request(server).get('/profile').set(auth(actorA)).expect(200);
      expect(profile.body).toMatchObject({ id: created.body.id, displayName: 'Alice Updated' });
    });

    it('validates country code and rejects unknown ownership fields', async () => {
      await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({ displayName: 'Alice', countryCode: 'USA' })
        .expect(400);

      await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({ displayName: 'Alice', userId: 'forged-user' })
        .expect(400);
    });
  });

  describe('SearchProfile', () => {
    let ownId: string;
    let foreignId: string;

    it('creates search profiles for each current user', async () => {
      const own = await request(server)
        .post('/search-profiles')
        .set(auth(actorA))
        .send({
          name: '  Frontend EU  ',
          roleTitles: [' Frontend Developer ', 'Frontend Engineer'],
          seniorities: ['MID', 'SENIOR'],
          salaryMin: 100000,
          salaryCurrency: 'usd',
          salaryPeriod: 'YEAR',
          requireKnownSalary: true,
          countryCodes: ['us', 'de'],
          cities: [' Berlin '],
          workFormats: ['REMOTE'],
          employmentTypes: ['FULL_TIME'],
          requiredSkills: [' TypeScript '],
          preferredSkills: [' React '],
        })
        .expect(201);
      ownId = own.body.id;

      expect(own.body).toMatchObject({
        name: 'Frontend EU',
        salaryCurrency: 'USD',
        countryCodes: ['US', 'DE'],
        requiredSkills: ['TypeScript'],
      });

      const foreign = await request(server)
        .post('/search-profiles')
        .set(auth(actorB))
        .send({ name: 'Backend', roleTitles: ['Backend Developer'] })
        .expect(201);
      foreignId = foreign.body.id;
    });

    it('lists and gets only the current user search profiles', async () => {
      const list = await request(server).get('/search-profiles').set(auth(actorA)).expect(200);
      expect(list.body.map((item: { id: string }) => item.id)).toContain(ownId);
      expect(list.body.map((item: { id: string }) => item.id)).not.toContain(foreignId);

      await request(server).get(`/search-profiles/${ownId}`).set(auth(actorA)).expect(200);
      await request(server).get(`/search-profiles/${foreignId}`).set(auth(actorA)).expect(404);
    });

    it('updates its own profile but cannot update another user profile', async () => {
      const updated = await request(server)
        .patch(`/search-profiles/${ownId}`)
        .set(auth(actorA))
        .send({ name: 'Frontend Remote', isActive: false })
        .expect(200);
      expect(updated.body).toMatchObject({ name: 'Frontend Remote', isActive: false });

      await request(server)
        .patch(`/search-profiles/${foreignId}`)
        .set(auth(actorA))
        .send({ name: 'Hijacked' })
        .expect(404);

      const untouched = await request(server)
        .get(`/search-profiles/${foreignId}`)
        .set(auth(actorB))
        .expect(200);
      expect(untouched.body.name).toBe('Backend');
    });

    it('validates salary/currency and rejects unknown fields', async () => {
      await request(server)
        .post('/search-profiles')
        .set(auth(actorA))
        .send({ name: 'Invalid', salaryMin: -1, salaryCurrency: 'US' })
        .expect(400);

      await request(server)
        .post('/search-profiles')
        .set(auth(actorA))
        .send({ name: 'Invalid', userId: 'forged-user' })
        .expect(400);
    });

    it('deletes its own search profile', async () => {
      await request(server).delete(`/search-profiles/${ownId}`).set(auth(actorA)).expect(204);
      await request(server).get(`/search-profiles/${ownId}`).set(auth(actorA)).expect(404);
    });
  });

  describe('Resume', () => {
    let ownId: string;
    let foreignId: string;

    it('creates resumes for each current user', async () => {
      const own = await request(server)
        .post('/resumes')
        .set(auth(actorA))
        .send({
          title: '  Frontend Resume  ',
          languageCode: '  en-US  ',
          structuredContent: { summary: 'Frontend engineer' },
          plainText: '  Frontend engineer with TypeScript  ',
          contentVersion: 1,
          storageProvider: '  s3  ',
          storageKey: '  resumes/alice/frontend.pdf  ',
          originalFileName: '  frontend.pdf  ',
          mimeType: '  application/pdf  ',
          fileSizeBytes: 2048,
          checksumSha256: 'a'.repeat(64),
        })
        .expect(201);
      ownId = own.body.id;
      expect(own.body).toMatchObject({
        title: 'Frontend Resume',
        languageCode: 'en-US',
        storageProvider: 's3',
        archivedAt: null,
      });

      const foreign = await request(server)
        .post('/resumes')
        .set(auth(actorB))
        .send({ title: 'Backend Resume', languageCode: 'en' })
        .expect(201);
      foreignId = foreign.body.id;
    });

    it('lists and gets only current user active resumes', async () => {
      const list = await request(server).get('/resumes').set(auth(actorA)).expect(200);
      expect(list.body.map((item: { id: string }) => item.id)).toContain(ownId);
      expect(list.body.map((item: { id: string }) => item.id)).not.toContain(foreignId);

      await request(server).get(`/resumes/${ownId}`).set(auth(actorA)).expect(200);
      await request(server).get(`/resumes/${foreignId}`).set(auth(actorA)).expect(404);
    });

    it('updates its own resume but cannot read or update another user resume', async () => {
      const updated = await request(server)
        .patch(`/resumes/${ownId}`)
        .set(auth(actorA))
        .send({ title: 'Frontend Resume v2', contentVersion: 2 })
        .expect(200);
      expect(updated.body).toMatchObject({ title: 'Frontend Resume v2', contentVersion: 2 });

      await request(server).get(`/resumes/${foreignId}`).set(auth(actorA)).expect(404);
      await request(server)
        .patch(`/resumes/${foreignId}`)
        .set(auth(actorA))
        .send({ title: 'Hijacked' })
        .expect(404);

      const untouched = await request(server).get(`/resumes/${foreignId}`).set(auth(actorB)).expect(200);
      expect(untouched.body.title).toBe('Backend Resume');
    });

    it('assigns only an active resume owned by the current user as primary', async () => {
      await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({ displayName: 'Alice Updated', primaryResumeId: ownId })
        .expect(200);

      await request(server)
        .put('/profile')
        .set(auth(actorA))
        .send({ displayName: 'Alice Updated', primaryResumeId: foreignId })
        .expect(400);

      const profile = await request(server).get('/profile').set(auth(actorA)).expect(200);
      expect(profile.body.primaryResumeId).toBe(ownId);
    });

    it('validates resume metadata and rejects unknown ownership fields', async () => {
      await request(server)
        .post('/resumes')
        .set(auth(actorA))
        .send({ title: '   ', languageCode: 'en', fileSizeBytes: -1 })
        .expect(400);

      await request(server)
        .post('/resumes')
        .set(auth(actorA))
        .send({ title: 'Forged', languageCode: 'en', userId: 'forged-user' })
        .expect(400);
    });

    it('soft archives its own resume and clears the primary pointer', async () => {
      await request(server).delete(`/resumes/${ownId}`).set(auth(actorA)).expect(204);

      const archived = await prisma.resume.findUnique({ where: { id: ownId } });
      expect(archived?.archivedAt).toBeInstanceOf(Date);

      await request(server).get(`/resumes/${ownId}`).set(auth(actorA)).expect(404);
      const list = await request(server).get('/resumes').set(auth(actorA)).expect(200);
      expect(list.body.map((item: { id: string }) => item.id)).not.toContain(ownId);

      const profile = await request(server).get('/profile').set(auth(actorA)).expect(200);
      expect(profile.body.primaryResumeId).toBeNull();
    });
  });
});
