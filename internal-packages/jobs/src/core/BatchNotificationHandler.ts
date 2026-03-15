/**
 * BatchNotificationHandler
 *
 * Implements the BatchCompletionHandler interface to send email
 * notifications when batches complete. Used by the worker process.
 */

import type { JobRepository } from '@roast/db';
import type { BatchCompletionHandler } from './JobService';
import type { EmailService } from './EmailService';
import type { Logger } from '../types';

export class BatchNotificationHandler implements BatchCompletionHandler {
  constructor(
    private jobRepository: JobRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async onBatchCompleted(batchId: string): Promise<void> {
    if (!this.emailService.isConfigured) return;

    try {
      const batch = await this.jobRepository.getBatchForNotification(batchId);
      if (!batch) return;
      if (!batch.notifyOnComplete) return;
      if (batch.notifiedAt) return;

      if (!batch.userEmail) {
        this.logger.warn(`Batch ${batchId} notification requested but user has no email`);
        return;
      }

      const emailSent = await this.emailService.sendBatchCompletionEmail({
        recipientEmail: batch.userEmail,
        batchName: batch.name,
        agentName: batch.agentName,
        agentId: batch.agentId,
        completedCount: batch.completedCount,
        failedCount: batch.failedCount,
        totalCount: batch.totalCount,
        batchId: batch.id,
        documentId: batch.requestedDocumentIds.length === 1 ? batch.requestedDocumentIds[0] : undefined,
      });

      if (emailSent) {
        await this.jobRepository.markBatchNotified(batchId);
      }
    } catch (error) {
      // Email notification failure must not affect job processing
      this.logger.error(`Failed to send notification for batch ${batchId}:`, error);
    }
  }
}
