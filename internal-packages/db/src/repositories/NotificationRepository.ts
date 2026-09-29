/**
 * Notification Repository
 *
 * Data access for notification-related queries.
 * Separated from JobRepository to keep persistence concerns distinct
 * from notification/workflow concerns.
 */

import { prisma as defaultPrisma } from '../client';
import { JobStatus } from '../types';

export interface BatchNotificationData {
  id: string;
  name: string | null;
  agentId: string;
  agentName: string;
  notifyOnComplete: boolean;
  notifiedAt: Date | null;
  userEmail: string | null;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  requestedDocumentIds: string[];
}

export interface DocumentNotificationData {
  id: string;
  title: string;
  notifyOnComplete: boolean;
  notifiedAt: Date | null;
  userEmail: string | null;
  completedCount: number;
  failedCount: number;
  totalCount: number;
}

export class NotificationRepository {
  private prisma: typeof defaultPrisma;

  constructor(prismaClient?: typeof defaultPrisma) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Fetch batch data needed for sending completion notifications.
   */
  async getBatchForNotification(batchId: string): Promise<BatchNotificationData | null> {
    const batch = await this.prisma.agentEvalBatch.findUnique({
      where: { id: batchId },
      include: {
        user: { select: { email: true } },
        agent: {
          include: {
            versions: { orderBy: { version: 'desc' as const }, take: 1, select: { name: true } },
          },
        },
        jobs: { select: { status: true } },
      },
    });

    if (!batch) return null;

    const completedCount = batch.jobs.filter(j => j.status === JobStatus.COMPLETED).length;
    const failedCount = batch.jobs.filter(j => j.status === JobStatus.FAILED).length;

    return {
      id: batch.id,
      name: batch.name,
      agentId: batch.agentId,
      agentName: batch.agent.versions[0]?.name || 'Unknown Agent',
      notifyOnComplete: batch.notifyOnComplete,
      notifiedAt: batch.notifiedAt,
      userEmail: batch.user.email,
      completedCount,
      failedCount,
      totalCount: batch.jobs.length,
      requestedDocumentIds: batch.requestedDocumentIds,
    };
  }

  /**
   * Atomically mark a batch as notified (prevents duplicate emails).
   */
  async markBatchNotified(batchId: string): Promise<void> {
    await this.prisma.$queryRaw`
      UPDATE "AgentEvalBatch"
      SET "notifiedAt" = NOW()
      WHERE id = ${batchId}
        AND "notifiedAt" IS NULL
    `;
  }

  /**
   * Fetch document data needed for sending completion notifications.
   */
  async getDocumentForNotification(documentId: string): Promise<DocumentNotificationData | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        submittedBy: { select: { email: true } },
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1,
          select: { title: true },
        },
        evaluations: {
          include: {
            jobs: { select: { status: true } },
          },
        },
      },
    });

    if (!doc) return null;

    const allJobs = doc.evaluations.flatMap(e => e.jobs);
    const completedCount = allJobs.filter(j => j.status === JobStatus.COMPLETED).length;
    const failedCount = allJobs.filter(j => j.status === JobStatus.FAILED).length;

    return {
      id: doc.id,
      title: doc.versions[0]?.title || 'Untitled Document',
      notifyOnComplete: doc.notifyOnComplete,
      notifiedAt: doc.notifiedAt,
      userEmail: doc.submittedBy.email,
      completedCount,
      failedCount,
      totalCount: allJobs.length,
    };
  }

  /**
   * Reset notifiedAt so a future job transition can re-trigger notification.
   * Used when email delivery fails after completion was already detected.
   */
  async resetDocumentNotification(documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { notifiedAt: null },
    });
  }
}
