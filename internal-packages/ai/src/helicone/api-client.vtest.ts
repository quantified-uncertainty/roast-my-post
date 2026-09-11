import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeliconeAPIClient, type HeliconeClickhouseRequest } from './api-client';

const start = new Date('2026-09-11T12:35:00.075Z');
const end = new Date('2026-09-11T12:38:00.075Z');
const request = (id: string, cost = 0.1): HeliconeClickhouseRequest => ({ request_id: id, model: 'test', cost });

afterEach(() => vi.restoreAllMocks());

describe('Helicone request window pagination', () => {
  it('reads every page, keeps whole-second boundaries fixed, and deduplicates overlapping IDs', async () => {
    const client = new HeliconeAPIClient('test-key');
    const firstPage = Array.from({ length: 1000 }, (_, i) => request(String(i)));
    const query = vi.spyOn(client, 'queryRequestsClickhouse')
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({ data: [request('999', 0.2), request('1000')] });

    const requests = await client.getRequestsInTimeRange(start, end);

    expect(requests).toHaveLength(1001);
    expect(requests.find(row => row.request_id === '999')?.cost).toBe(0.2);
    expect(query).toHaveBeenCalledTimes(2);
    const options = query.mock.calls[0][0];
    expect(options).toEqual({
      filter: {
        left: { request_response_rmt: { request_created_at: { gte: '2026-09-11T12:35:00.000Z' } } },
        operator: 'and',
        right: { request_response_rmt: { request_created_at: { lt: '2026-09-11T12:38:01.000Z' } } },
      },
      offset: 0, limit: 1000, sort: { created_at: 'asc' }, includeInputs: false,
    });
    expect(query.mock.calls[1][0]).toEqual({ ...options, offset: 1000 });
  });

  it('does not return a partial result if a later page fails', async () => {
    const client = new HeliconeAPIClient('test-key');
    vi.spyOn(client, 'queryRequestsClickhouse')
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => request(String(i))) })
      .mockRejectedValueOnce(new Error('Helicone unavailable'));
    await expect(client.getRequestsInTimeRange(start, end)).rejects.toThrow('Helicone unavailable');
  });

  it('rejects rows without IDs instead of counting them more than once', async () => {
    const client = new HeliconeAPIClient('test-key');
    vi.spyOn(client, 'queryRequestsClickhouse').mockResolvedValue({ data: [{ model: 'test', cost: 0 }] });
    await expect(client.getRequestsInTimeRange(start, end)).rejects.toThrow('missing its ID');
  });

  it('bounds pagination rather than returning truncated costs', async () => {
    const client = new HeliconeAPIClient('test-key');
    const query = vi.spyOn(client, 'queryRequestsClickhouse').mockResolvedValue({
      data: Array.from({ length: 1000 }, (_, i) => request(String(i))),
    });
    await expect(client.getRequestsInTimeRange(start, end)).rejects.toThrow('pagination limit');
    expect(query).toHaveBeenCalledTimes(100);
  });

  it('rejects invalid dates before making a request', async () => {
    const client = new HeliconeAPIClient('test-key');
    const query = vi.spyOn(client, 'queryRequestsClickhouse');
    await expect(client.getRequestsInTimeRange(new Date('invalid'), end)).rejects.toThrow('Invalid');
    expect(query).not.toHaveBeenCalled();
  });
});
