const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST is required for e2e tests');
}

const parsedUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
  throw new Error('DATABASE_URL_TEST must use PostgreSQL');
}

if (!allowedHosts.has(parsedUrl.hostname)) {
  throw new Error('DATABASE_URL_TEST must point to a local PostgreSQL instance');
}

if (!/(test|e2e)/i.test(databaseName)) {
  throw new Error('DATABASE_URL_TEST database name must contain "test" or "e2e"');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'field-e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'field-e2e-refresh-secret';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '30m';
process.env.COOKIE_SECURE = 'false';
