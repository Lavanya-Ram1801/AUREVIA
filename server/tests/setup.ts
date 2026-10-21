// Runs before every test file. The suite TRUNCATES tables, so it only ever runs against TEST_DATABASE_URL,
// and refuses any database whose name does not contain "test" (protects your development data).
import 'dotenv/config';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error('TEST_DATABASE_URL is not set. Create a separate database (e.g. aurevia_test), apply migrations to it, and set TEST_DATABASE_URL in server/.env. See README → Testing.');
}
const dbName = new URL(url).pathname.replace(/^\//, '');
if (!/test/i.test(dbName)) {
  throw new Error(`Refusing to run tests against database "${dbName}": the name must contain "test" because tests wipe all tables.`);
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123456';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
