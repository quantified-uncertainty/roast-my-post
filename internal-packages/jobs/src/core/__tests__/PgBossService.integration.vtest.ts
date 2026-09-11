import net, { type Socket } from 'node:net';
import { afterAll, afterEach, assert, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';
import { PgBoss } from 'pg-boss';
import type { PgBossService } from '../PgBossService';
import type { Logger } from '../../types';

interface ProxyConnection {
  client: Socket;
  upstream: Socket;
  drop: boolean;
}

let directUrl: URL;
const connections = new Set<ProxyConnection>();
const proxy = net.createServer(client => {
  const upstream = net.connect({ host: directUrl.hostname, port: Number(directUrl.port || 5432) });
  const connection = { client, upstream, drop: false };
  connections.add(connection);
  client.on('data', data => {
    if (!connection.drop) upstream.write(data);
  });
  upstream.on('data', data => {
    if (!connection.drop) client.write(data);
  });
  const close = () => {
    client.destroy();
    upstream.destroy();
    connections.delete(connection);
  };
  client.on('error', close);
  upstream.on('error', close);
  client.on('close', close);
  upstream.on('close', close);
});
const logger: Logger = { info() {}, warn() {}, error() {}, debug() {} };
let service: PgBossService;
let Service: typeof PgBossService;
let producer: PgBoss;

beforeAll(async () => {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must point to a local test database');
  directUrl = new URL(process.env.DATABASE_URL);
  expect(['localhost', '127.0.0.1']).toContain(directUrl.hostname);
  expect(directUrl.pathname).toMatch(/_test$/);

  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address() as net.AddressInfo;
  const proxyUrl = new URL(directUrl);
  proxyUrl.hostname = '127.0.0.1';
  proxyUrl.port = String(address.port);
  // Test mode hardcodes the domain's DB URL; load the actual config with our proxy URL.
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('DATABASE_URL', proxyUrl.toString());
  vi.stubEnv('AUTH_SECRET', 'local-test-only');
  for (const key of ['DATABASE_CA_CERT', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
    'OPENROUTER_API_KEY', 'AUTH_RESEND_KEY', 'EMAIL_FROM']) {
    vi.stubEnv(key, undefined);
  }
  ({ PgBossService: Service } = await import('../PgBossService'));
  producer = new PgBoss({ connectionString: directUrl.toString(), schedule: false, supervise: false });
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

afterAll(async () => {
  try {
    await producer?.stop({ graceful: false });
    if (proxy.listening) {
      await new Promise<void>(resolve => proxy.close(() => resolve()));
    }
  } finally {
    vi.unstubAllEnvs();
  }
});

test('normal SQL can exceed the 10-second connection-acquisition timeout', async () => {
  const started = Date.now();
  const result = await service.getBoss().getDb().executeSql('SELECT pg_sleep(11), 42 AS answer');
  expect(result.rows[0].answer).toBe(42);
  expect(Date.now() - started).toBeGreaterThanOrEqual(11000);
});

test('an evaluation handler can run longer than the 30-second SQL read timeout', async () => {
  let calls = 0;
  await service.work('document-evaluation', { pollingIntervalSeconds: 0.5 }, async () => {
    calls++;
    await sleep(31000);
  });
  const id = await service.send('document-evaluation', { synthetic: true });
  assert(id);
  await vi.waitFor(async () => {
    expect((await producer.getJobById('document-evaluation', id))?.state).toBe('completed');
  }, { timeout: 36000 });
  expect(calls).toBe(1);
});

test('replaces a connection with a hung query after 30 seconds and resumes queued work', async () => {
  let calls = 0;
  await service.work('document-evaluation', { pollingIntervalSeconds: 0.5 }, async () => { calls++; });
  const warm = await service.send('document-evaluation', { synthetic: true, phase: 'warm' });
  assert(warm);
  await vi.waitFor(async () => {
    expect((await producer.getJobById('document-evaluation', warm))?.state).toBe('completed');
  }, { timeout: 5000 });
  expect(connections.size).toBe(1);
  for (const connection of connections) connection.drop = true;

  const started = Date.now();
  let settled = false;
  const held = service.getBoss().getDb().executeSql('SELECT 1').then(
    () => {
      settled = true;
      return 'unexpected success';
    },
    error => {
      settled = true;
      return (error as Error).message;
    }
  );
  await sleep(100);
  const queued = await producer.send('document-evaluation', { synthetic: true, phase: 'after-failure' });
  assert(queued);
  // A fresh connection through the same proxy still works.
  const fresh = new PgBoss({ connectionString: process.env.DATABASE_URL, schedule: false, supervise: false });
  fresh.on('error', () => {});
  try {
    await fresh.start();
    expect((await fresh.getDb().executeSql('SELECT 1 AS ok')).rows[0].ok).toBe(1);
  } finally {
    await fresh.stop({ graceful: false });
  }

  await expect(service.getBoss().getDb().executeSql('SELECT 2'))
    .rejects.toThrow('timeout exceeded when trying to connect');
  expect(settled, 'Acquisition timeout does not release the hung query').toBe(false);
  expect((await producer.getJobById('document-evaluation', queued))?.state).toBe('created');
  // Before the fix this assertion fails: the first query never returns.
  await vi.waitFor(() => expect(settled).toBe(true), { timeout: 25000 });
  expect(await held).toBe('Query read timeout');
  const elapsed = Date.now() - started;
  expect(elapsed).toBeGreaterThanOrEqual(29000);
  expect(elapsed).toBeLessThan(35000);
  await vi.waitFor(async () => {
    expect((await producer.getJobById('document-evaluation', queued))?.state).toBe('completed');
  }, { timeout: 5000 });
  expect(calls, 'Warm and recovered jobs each ran exactly once').toBe(2);
  expect((await service.getBoss().getDb().executeSql('SELECT 3 AS ok')).rows[0].ok).toBe(3);
});
