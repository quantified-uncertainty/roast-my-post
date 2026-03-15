/**
 * DocumentNotificationHandler
 *
 * Implements the DocumentCompletionHandler interface to send email
 * notifications when all evaluations for a document complete.
 * Used by the worker process.
 */

import type { JobRepository } from '@roast/db';
import type { DocumentCompletionHandler } from './JobService';
import type { EmailService } from './EmailService';
import type { Logger } from '../types';

export class DocumentNotificationHandler implements DocumentCompletionHandler {
  constructor(
    private jobRepository: JobRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async onDocumentCompleted(documentId: string): Promise<void> {
    if (!this.emailService.isConfigured) return;

    try {
      const doc = await this.jobRepository.getDocumentForNotification(documentId);
      if (!doc) return;
      if (!doc.notifyOnComplete) return;
      if (doc.notifiedAt) return;

      if (!doc.userEmail) {
        this.logger.warn(`Document ${documentId} notification requested but user has no email`);
        return;
      }

      await this.emailService.sendBatchCompletionEmail({
        recipientEmail: doc.userEmail,
        batchName: null,
        agentName: '',
        agentId: '',
        completedCount: doc.completedCount,
        failedCount: doc.failedCount,
        totalCount: doc.totalCount,
        batchId: documentId,
        documentId,
      });

      // notifiedAt is already set atomically by tryMarkDocumentCompleted
      this.logger.info(`Document completion email sent for ${documentId} to ${doc.userEmail}`);
    } catch (error) {
      // Email notification failure must not affect job processing
      this.logger.error(`Failed to send notification for document ${documentId}:`, error);
    }
  }
}
