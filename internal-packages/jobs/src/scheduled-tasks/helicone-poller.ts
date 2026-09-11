import { heliconeAPI, type HeliconeClickhouseRequest, type HeliconeSession } from '@roast/ai';
import { JobRepository, type JobEntity } from '@roast/db';
import { config } from '@roast/domain';
import { logger } from '../utils/logger';

const LOG_TAG = '[Helicone Cost Poller]';
const BATCH_SIZE = 10;
const LOGGING_GRACE_MS = 5 * 60 * 1000;
const jobRepository = new JobRepository();

interface JobSession {
  job: JobEntity;
  session: HeliconeSession;
}

/** Search is supported by Helicone; the structured session-ID filter returns 422. */
async function fetchHeliconeSession(job: JobEntity, now: Date): Promise<HeliconeSession | undefined> {
  const response = await heliconeAPI.querySessions({
    timeFilter: {
      startTimeUnixMs: Math.floor(job.createdAt.getTime() / 1000) * 1000,
      endTimeUnixMs: now.getTime(),
    },
    filter: 'all',
    search: job.id,
  });
  // Search can return partial matches. Never use another job's session.
  return response.data?.find(session => session.session_id === job.id);
}

/** Save only complete request totals that agree with Helicone's session aggregate. */
async function updateCost({ job, session }: JobSession, requests: HeliconeClickhouseRequest[]): Promise<void> {
  const expectedRequests = Number(session.total_requests);
  const jobRequests = requests.filter(request => request.request_properties?.['Helicone-Session-Id'] === job.id);
  if (!Number.isSafeInteger(expectedRequests) || expectedRequests <= 0 || jobRequests.length !== expectedRequests) {
    logger.debug(`${LOG_TAG} [${job.id}] request count does not match the session yet. Will retry next cycle.`);
    return;
  }

  let totalCost = 0;
  for (const request of jobRequests) {
    if (typeof request.cost !== 'number' || !Number.isFinite(request.cost) || request.cost < 0) {
      logger.debug(`${LOG_TAG} [${job.id}] request cost is not available yet. Will retry next cycle.`);
      return;
    }
    totalCost += request.cost;
  }
  if (!Number.isFinite(session.total_cost) || Math.abs(totalCost - session.total_cost) > 1e-9) {
    logger.debug(`${LOG_TAG} [${job.id}] request costs do not match the session yet. Will retry next cycle.`);
    return;
  }

  await jobRepository.updateCost(job.id, totalCost);
  logger.info(`${LOG_TAG} [${job.id}] updated price to $${totalCost.toFixed(6)} from ${jobRequests.length} requests.`);
}

/**
 * Fetch a complete, paginated request window for jobs still awaiting prices.
 * Each retry reads the window again, so failed pages and delayed logs are not skipped.
 */
export async function updateJobCostsFromHelicone() {
  logger.debug(`${LOG_TAG} Running...`);
  try {
    const now = new Date();
    const jobs = await jobRepository.findJobsForCostUpdate(BATCH_SIZE, config.jobs.costUpdateStaleHours);
    const sessions: JobSession[] = [];
    for (const job of jobs) {
      if (!job.completedAt || job.completedAt.getTime() > now.getTime() - LOGGING_GRACE_MS) continue;
      try {
        const session = await fetchHeliconeSession(job, now);
        if (!session) continue;
        const latestRequest = Date.parse(session.latest_request_created_at);
        if (!Number.isFinite(latestRequest) || latestRequest > now.getTime() - LOGGING_GRACE_MS) continue;
        sessions.push({ job, session });
      } catch (error) {
        logger.error(`${LOG_TAG} [${job.id}] Error fetching session:`, error);
      }
    }
    if (sessions.length === 0) return;

    const start = new Date(Math.min(...sessions.map(({ job }) => job.createdAt.getTime())));
    const requests = await heliconeAPI.getRequestsInTimeRange(start, now);
    for (const jobSession of sessions) {
      try {
        await updateCost(jobSession, requests);
      } catch (error) {
        logger.error(`${LOG_TAG} [${jobSession.job.id}] Error updating price:`, error);
      }
    }
  } catch (error) {
    logger.error(`${LOG_TAG} Error updating job costs:`, error);
  } finally {
    logger.debug(`${LOG_TAG} Finished.`);
  }
}
