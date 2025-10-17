import { heliconeAPI, type HeliconeRequest, type HeliconeSession } from '@roast/ai';
import { JobRepository, type JobEntity } from '@roast/db';
import { logger } from '../utils/logger';

const BATCH_SIZE = 10;
const jobRepository = new JobRepository();

/**
 * Fetches the session details for a given job from Helicone.
 */
async function fetchHeliconeSession(job: JobEntity): Promise<HeliconeSession | null> {
  const sessionResponse = await heliconeAPI.querySessions({
    timeFilter: { startTimeUnixMs: job.createdAt.getTime(), endTimeUnixMs: Date.now() },
    filter: { sessions_request_response_rmt: { session_session_id: { equals: job.id } } },
  });

  if (!sessionResponse.data || sessionResponse.data.length === 0) {
    logger.info(`session ${job.id} not found in Helicone yet. Will retry next cycle.`);
    return null;
  }
  return sessionResponse.data[0];
}

/**
 * Calculates the total cost from a list of Helicone requests.
 */
function calculateTotalCost(requests: HeliconeRequest[]): number {
  return requests.reduce((sum, req) => sum + (req.costUSD || 0), 0);
}

/**
 * Processes a single job to fetch, calculate, and update its cost.
 */
async function processJobCostUpdate(job: JobEntity): Promise<void> {
  logger.info(`processing job ${job.id}`);

  const session = await fetchHeliconeSession(job);
  if (!session) return;

  const expectedRequests = parseInt(session.total_requests, 10);
  if (isNaN(expectedRequests)) {
    logger.warn(`session ${job.id} has invalid total_requests: ${session.total_requests}. Skipping.`);
    return;
  }

  const actualRequests = await heliconeAPI.getSessionRequests(job.id);
  logger.info(`session ${job.id}: expected ${expectedRequests}, found ${actualRequests.length} requests.`);

  if (actualRequests.length < expectedRequests) {
    logger.info(`session ${job.id} is not fully logged in Helicone yet. Will retry next cycle.`);
    return;
  }

  const totalCost = calculateTotalCost(actualRequests);
  logger.info(`session ${job.id} is complete. Total cost: $${totalCost.toFixed(6)}.`);

  await jobRepository.updateCost(job.id, totalCost);
  logger.info(`successfully updated price for job ${job.id}.`);
}

/**
 * Polls the database for completed jobs without a price, then fetches cost
 * data from Helicone and updates the job record.
 */
export async function updateJobCostsFromHelicone() {
  logger.info('[Job Cost Updater] Running...');

  try {
    const jobsToUpdate = await jobRepository.findJobsForCostUpdate(BATCH_SIZE);

    if (jobsToUpdate.length === 0) {
      logger.info('no completed jobs waiting for cost update.');
      return;
    }

    logger.info(`found ${jobsToUpdate.length} completed job(s) to update price for.`);

    for (const job of jobsToUpdate) {
      await processJobCostUpdate(job);
    }
  } catch (error) {
    logger.error('Error updating job costs from Helicone:', error);
  } finally {
    logger.info('[Job Cost Updater] Finished.');
  }
}
