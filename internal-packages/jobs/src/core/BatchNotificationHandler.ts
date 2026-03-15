/**
 * BatchNotificationHandler
 *
 * Implements the BatchCompletionHandler interface to send email
 * notifications when batches complete. Used by the worker process.
 */

import type { NotificationRepository } from '@roast/db';
import type { BatchCompletionHandler } from './JobService';
import type { EmailService } from './EmailService';
import type { Logger } from '../types';

export class BatchNotificationHandler implements BatchCompletionHandler {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async onBatchCompleted(batchId: string): Promise<void> {
    try {
      const batch = await this.notificationRepository.getBatchForNotification(batchId);
      if (!batch) return;
      if (!batch.notifyOnComplete) return;
      if (batch.notifiedAt) return;

      if (!batch.userEmail) {
        this.logger.warn(`Batch ${batchId} notification requested but user has no email`);
        return;
      }

      const emailSent = await this.emailService.sendCompletionEmail({
        type: 'batch',
        recipientEmail: batch.userEmail,
        batchName: batch.name,
        agentName: batch.agentName,
        agentId: batch.agentId,
        completedCount: batch.completedCount,
        failedCount: batch.failedCount,
        totalCount: batch.totalCount,
        batchId: batch.id,
      });

      if (emailSent) {
        await this.notificationRepository.markBatchNotified(batchId);
      }
    } catch (error) {
      // Email notification failure must not affect job processing
      this.logger.error(`Failed to send notification for batch ${batchId}:`, error);
    }
  }
}
