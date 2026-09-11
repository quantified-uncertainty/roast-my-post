import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeliconeClickhouseRequest, HeliconeSession } from '@roast/ai';
import { JobStatus, type JobEntity } from '@roast/db';
import { updateJobCostsFromHelicone } from './helicone-poller';

const mocks = vi.hoisted(() => ({
  findJobs: vi.fn(), updateCost: vi.fn(), querySessions: vi.fn(), getRequests: vi.fn(), error: vi.fn(),
}));
vi.mock('@roast/ai', () => ({ heliconeAPI: { querySessions: mocks.querySessions, getRequestsInTimeRange: mocks.getRequests } }));
vi.mock('@roast/db', () => ({ JobStatus: { COMPLETED: 'COMPLETED', FAILED: 'FAILED' }, JobRepository: class {
  findJobsForCostUpdate = mocks.findJobs;
  updateCost = mocks.updateCost;
} }));
vi.mock('@roast/domain', () => ({ config: { jobs: { costUpdateStaleHours: 1 } } }));
vi.mock('../utils/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), error: mocks.error } }));

const now = new Date('2026-09-11T14:00:00Z');
function job(id: string): JobEntity {
  return {
    id, pgBossJobId: null, status: JobStatus.COMPLETED, evaluationId: 'evaluation', originalJobId: null,
    agentEvalBatchId: null, attempts: 1, createdAt: new Date('2026-09-11T13:00:00Z'),
    updatedAt: new Date('2026-09-11T13:30:00Z'), startedAt: new Date('2026-09-11T13:00:01Z'),
    completedAt: new Date('2026-09-11T13:30:00Z'), error: null, llmThinking: null,
    priceInDollars: null, durationInSeconds: null, logs: null, cancellationReason: null, cancelledAt: null,
  };
}
function session(id: string, count = 2, cost = 0.3): HeliconeSession {
  return {
    session_id: id, session_name: 'test', created_at: '2026-09-11T13:00:01Z',
    latest_request_created_at: '2026-09-11T13:29:00Z', total_requests: String(count), total_cost: cost,
    avg_latency: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
  };
}
function request(id: string, jobId: string, cost: number | undefined): HeliconeClickhouseRequest {
  return { request_id: id, model: 'test', cost, request_properties: { 'Helicone-Session-Id': jobId } };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mocks.findJobs.mockResolvedValue([job('job-a')]);
  mocks.querySessions.mockResolvedValue({ data: [session('job-a')] });
  mocks.getRequests.mockResolvedValue([request('1', 'job-a', 0.1), request('2', 'job-a', 0.2)]);
});
afterEach(() => vi.useRealTimers());

describe('Helicone cost poller', () => {
  it('sums exact job matches from one shared request window, including zero-cost failed jobs', async () => {
    mocks.findJobs.mockResolvedValue([job('job-a'), { ...job('job-b'), status: JobStatus.FAILED }]);
    mocks.querySessions.mockResolvedValueOnce({ data: [session('job-a-extra'), session('job-a')] })
      .mockResolvedValueOnce({ data: [session('job-b', 1, 0)] });
    mocks.getRequests.mockResolvedValue([
      request('1', 'job-a', 0.1), request('2', 'job-a', 0.2), request('3', 'job-b', 0), request('4', 'unrelated', 100),
    ]);
    await updateJobCostsFromHelicone();
    expect(mocks.querySessions).toHaveBeenCalledWith(expect.objectContaining({ filter: 'all', search: 'job-a' }));
    expect(mocks.getRequests).toHaveBeenCalledExactlyOnceWith(job('job-a').createdAt, now);
    expect(mocks.updateCost).toHaveBeenCalledWith('job-a', expect.closeTo(0.3, 9));
    expect(mocks.updateCost).toHaveBeenCalledWith('job-b', 0);
    expect(mocks.updateCost).toHaveBeenCalledTimes(2);
  });

  it('ignores partial session-ID search matches', async () => {
    mocks.querySessions.mockResolvedValue({ data: [session('job-a-extra')] });
    await updateJobCostsFromHelicone();
    expect(mocks.getRequests).not.toHaveBeenCalled();
    expect(mocks.updateCost).not.toHaveBeenCalled();
  });

  it('retries the full window next cycle when requests arrive late', async () => {
    mocks.getRequests.mockResolvedValueOnce([request('1', 'job-a', 0.1)]);
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).not.toHaveBeenCalled();
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).toHaveBeenCalledExactlyOnceWith('job-a', expect.closeTo(0.3, 9));
    expect(mocks.getRequests).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, NaN, -1])('does not save an unavailable or invalid request cost: %s', async cost => {
    mocks.getRequests.mockResolvedValue([request('1', 'job-a', cost), request('2', 'job-a', 0.2)]);
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).not.toHaveBeenCalled();
  });

  it('does not finalize a total while session and request costs disagree', async () => {
    mocks.getRequests.mockResolvedValue([request('1', 'job-a', 0), request('2', 'job-a', 0)]);
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).not.toHaveBeenCalled();
  });

  it('does not write any costs after a request-page failure', async () => {
    mocks.getRequests.mockRejectedValue(new Error('page 2 failed'));
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });

  it('continues with the other jobs after a session lookup fails', async () => {
    mocks.findJobs.mockResolvedValue([job('broken'), job('job-a')]);
    mocks.querySessions.mockRejectedValueOnce(new Error('session lookup failed'));
    await updateJobCostsFromHelicone();
    expect(mocks.updateCost).toHaveBeenCalledExactlyOnceWith('job-a', expect.closeTo(0.3, 9));
  });

  it('waits for recently completed jobs and recently logged requests to settle', async () => {
    mocks.findJobs.mockResolvedValue([{ ...job('new'), completedAt: now }, job('job-a')]);
    mocks.querySessions.mockResolvedValue({ data: [{ ...session('job-a'), latest_request_created_at: now.toISOString() }] });
    await updateJobCostsFromHelicone();
    expect(mocks.querySessions).toHaveBeenCalledTimes(1);
    expect(mocks.getRequests).not.toHaveBeenCalled();
    expect(mocks.updateCost).not.toHaveBeenCalled();
  });
});
