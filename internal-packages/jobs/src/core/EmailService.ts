/**
 * EmailService
 *
 * Sends transactional emails via Resend.
 * Used by the worker to notify users when evaluations complete.
 */

import { Resend } from 'resend';
import { config } from '@roast/domain';
import { escapeXml } from '@roast/ai';
import type { Logger } from '../types';

interface CompletionCounts {
  recipientEmail: string;
  completedCount: number;
  failedCount: number;
  totalCount: number;
}

export interface BatchCompletionEmailData extends CompletionCounts {
  type: 'batch';
  batchId: string;
  batchName: string | null;
  agentName: string;
  agentId: string;
}

export interface DocumentCompletionEmailData extends CompletionCounts {
  type: 'document';
  documentId: string;
}

export type CompletionEmailData = BatchCompletionEmailData | DocumentCompletionEmailData;

export class EmailService {
  private resend: Resend | null = null;

  constructor(private logger: Logger) {
    const apiKey = config.auth.resendKey;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  get isConfigured(): boolean {
    return this.resend !== null && !!config.auth.emailFrom;
  }

  async sendCompletionEmail(data: CompletionEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      this.logger.warn('Email not configured, skipping completion notification');
      return false;
    }

    const baseUrl = config.auth.nextAuthUrl || 'https://roastmypost.com';
    const { subject, heading, description, resultsUrl, logId } = this.buildEmailContent(data, baseUrl);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">${heading}</h2>
        <p style="color: #4a4a4a; margin-bottom: 24px;">
          ${description}
        </p>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0; background: #f9f9f9; font-weight: 600;">Completed</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">${data.completedCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0; background: #f9f9f9; font-weight: 600;">Failed</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">${data.failedCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0; background: #f9f9f9; font-weight: 600;">Total</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">${data.totalCount}</td>
          </tr>
        </table>
        <a href="${resultsUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Results
        </a>
        <p style="color: #9a9a9a; font-size: 12px; margin-top: 32px;">
          You received this email because you opted in to evaluation completion notifications.
        </p>
      </div>
    `;

    try {
      const { error: sendError } = await this.resend.emails.send({
        from: config.auth.emailFrom!,
        to: data.recipientEmail,
        subject,
        html,
      });

      if (sendError) {
        this.logger.error(`Failed to send completion email for ${logId}:`, sendError);
        return false;
      }

      this.logger.info(`Completion email sent for ${logId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send completion email for ${logId}:`, error);
      return false;
    }
  }

  private buildEmailContent(data: CompletionEmailData, baseUrl: string) {
    if (data.type === 'document') {
      return {
        subject: `Your document evaluations are complete (${data.completedCount}/${data.totalCount} succeeded)`,
        heading: 'Document Evaluations Complete',
        description: `Your document evaluations have finished. ${data.completedCount} of ${data.totalCount} evaluations completed successfully.`,
        resultsUrl: `${baseUrl}/docs/${data.documentId}/reader`,
        logId: `document ${data.documentId}`,
      };
    }

    const batchLabel = data.batchName || `Batch ${data.batchId.slice(0, 8)}`;
    const successRate = data.totalCount > 0
      ? Math.round((data.completedCount / data.totalCount) * 100)
      : 0;

    return {
      subject: `Batch complete: ${batchLabel} (${successRate}% success)`,
      heading: 'Batch Evaluation Complete',
      description: `Your evaluation batch <strong>${escapeXml(batchLabel)}</strong> for agent <strong>${escapeXml(data.agentName)}</strong> has finished.`,
      resultsUrl: `${baseUrl}/evaluators/${data.agentId}`,
      logId: `batch ${data.batchId}`,
    };
  }
}
