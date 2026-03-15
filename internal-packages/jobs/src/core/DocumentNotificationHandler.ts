/**
 * DocumentNotificationHandler
 *
 * Implements the DocumentCompletionHandler interface to send email
 * notifications when all evaluations for a document complete.
 * Used by the worker process.
 */

import type { NotificationRepository } from '@roast/db';
import type { DocumentCompletionHandler } from './JobService';
import type { EmailService } from './EmailService';
import type { Logger } from '../types';

export class DocumentNotificationHandler implements DocumentCompletionHandler {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async onDocumentCompleted(documentId: string): Promise<void> {
    try {
      const doc = await this.notificationRepository.getDocumentForNotification(documentId);
      if (!doc) return;
      if (!doc.notifyOnComplete) return;
      // notifiedAt check is intentionally omitted here — tryMarkDocumentCompleted
      // already sets notifiedAt atomically before this handler runs, so checking
      // it would always block. The atomic SQL provides the idempotency guarantee.

      if (!doc.userEmail) {
        this.logger.warn(`Document ${documentId} notification requested but user has no email`);
        return;
      }

      const emailSent = await this.emailService.sendCompletionEmail({
        type: 'document',
        recipientEmail: doc.userEmail,
        documentId,
        completedCount: doc.completedCount,
        failedCount: doc.failedCount,
        totalCount: doc.totalCount,
      });

      if (!emailSent) {
        // Reset notifiedAt so a future job transition can re-trigger notification
        await this.notificationRepository.resetDocumentNotification(documentId);
        this.logger.warn(`Document ${documentId} email failed, reset notifiedAt for retry`);
      }
    } catch (error) {
      // Email notification failure must not affect job processing
      this.logger.error(`Failed to send notification for document ${documentId}:`, error);
    }
  }
}
