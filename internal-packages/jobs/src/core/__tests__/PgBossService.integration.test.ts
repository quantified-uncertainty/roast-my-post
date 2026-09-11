import assert from 'node:assert/strict';
import net, { type Socket } from 'node:net';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { PgBoss } from 'pg-boss';
import type { PgBossService } from '../PgBossService';
import type { Logger } from '../../types';

// Run via dev/scripts/test-pgboss-read-timeout.sh. The runner creates a new DB;
// these tests never load .env files or connect to the ordinary dev database.
const port = Number(process.env.PGBOSS_TEST_PORT);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'PGBOSS_TEST_PORT is required');
const directUrl = `postgresql://repro:local-test-only@127.0.0.1:${port}/repro`;
const connections = new Set<{ client: Socket; upstream: Socket; drop: boolean }>();
const proxy = net.createServer(client => {
  const upstream = net.connect({ host: '127.0.0.1', port });
  const connection = { client, upstream, drop: false };
  connections.add(connection);
  client.on('data', data => { if (!connection.drop) upstream.write(data); });
  upstream.on('data', data => { if (!connection.drop) client.write(data); });
  const close = () => { client.destroy(); upstream.destroy(); connections.delete(connection); };
  client.on('error', close);
  upstream.on('error', close);
  client.on('close', close);
  upstream.on('close', close);
});
const logger: Logger = { info() {}, warn() {}, error() {}, debug() {} };
let service: PgBossService;
let Service: typeof PgBossService;
let producer: PgBoss;

async function until(condition: () => Promise<boolean>, timeout = 5000) {
  const started = Date.now();
  while (!await condition()) {
    assert.ok(Date.now() - started < timeout, 'Expected condition before deadline');
    await sleep(50);
  }
}

before(async () => {
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address() as net.AddressInfo;
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = `postgresql://repro:local-test-only@127.0.0.1:${address.port}/repro`;
  process.env.AUTH_SECRET = 'local-test-only';
  for (const key of ['DATABASE_CA_CERT', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
    'OPENROUTER_API_KEY', 'AUTH_RESEND_KEY', 'EMAIL_FROM']) delete process.env[key];
  // Import the actual class and domain config after setting the local environment.
  ({ PgBossService: Service } = await import('../PgBossService'));
  producer = new PgBoss({ connectionString: directUrl, schedule: false, supervise: false });
  producer.on('error', () => {});
  await producer.start();
});

beforeEach(async () => {
  service = new Service(logger);
  await service.initialize();
});

afterEach(async () => {
  // Release any deliberately hung query, including if an assertion fails.
  for (const connection of connections) {
    connection.client.destroy();
    connection.upstream.destroy();
  }
  await service?.getBoss().stop({ graceful: false });
});

after(async () => {
  await producer?.stop({ graceful: false });
  await new Promise<void>(resolve => proxy.close(() => resolve()));
});

test('normal SQL can exceed the 10-second connection-acquisition timeout', { timeout: 20000 }, async () => {
  const started = Date.now();
  const result = await service.getBoss().getDb().executeSql('SELECT pg_sleep(11), 42 AS answer');
  assert.equal(result.rows[0].answer, 42);
  assert.ok(Date.now() - started >= 11000);
});

test('an evaluation handler can run longer than the 30-second SQL read timeout', { timeout: 45000 }, async () => {
  let calls = 0;
  await service.work('document-evaluation', { pollingIntervalSeconds: 0.5 }, async () => {
    calls++;
    await sleep(31000);
  });
  const id = await service.send('document-evaluation', { synthetic: true });
  assert.ok(id);
  await until(async () => (await producer.getJobById('document-evaluation', id))?.state === 'completed', 36000);
  assert.equal(calls, 1);
});

test('replaces a connection with a hung query after 30 seconds and resumes queued work', { timeout: 45000 }, async () => {
  let calls = 0;
  await service.work('document-evaluation', { pollingIntervalSeconds: 0.5 }, async () => { calls++; });
  const warm = await service.send('document-evaluation', { synthetic: true, phase: 'warm' });
  assert.ok(warm);
  await until(async () => (await producer.getJobById('document-evaluation', warm))?.state === 'completed');
  assert.equal(connections.size, 1, 'The actual service has one worker connection');
  for (const connection of connections) connection.drop = true;

  const started = Date.now();
  let settled = false;
  const held = service.getBoss().getDb().executeSql('SELECT 1').then(
    () => { settled = true; return 'unexpected success'; },
    error => { settled = true; return (error as Error).message; }
  );
  await sleep(100);
  const queued = await producer.send('document-evaluation', { synthetic: true, phase: 'after-failure' });
  assert.ok(queued);
  // A fresh connection through the same proxy still works.
  const fresh = new PgBoss({ connectionString: process.env.DATABASE_URL, schedule: false, supervise: false });
  fresh.on('error', () => {});
  try {
    await fresh.start();
    assert.equal((await fresh.getDb().executeSql('SELECT 1 AS ok')).rows[0].ok, 1);
  } finally { await fresh.stop({ graceful: false }); }

  await assert.rejects(service.getBoss().getDb().executeSql('SELECT 2'), /timeout exceeded when trying to connect/);
  assert.equal(settled, false, 'Acquisition timeout does not release the hung query');
  assert.equal((await producer.getJobById('document-evaluation', queued))?.state, 'created');
  // Before the fix this assertion fails: the first query never returns.
  await until(async () => settled, 25000);
  assert.equal(await held, 'Query read timeout');
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 29000 && elapsed < 35000, `Read timeout fired after ${elapsed}ms`);
  await until(async () => (await producer.getJobById('document-evaluation', queued))?.state === 'completed');
  assert.equal(calls, 2, 'Warm and recovered jobs each ran exactly once');
  assert.equal((await service.getBoss().getDb().executeSql('SELECT 3 AS ok')).rows[0].ok, 3);
});
