/**
 * EmailService
 *
 * Sends transactional emails via Resend.
 * Used by the worker to notify users when batches complete.
 */

import { Resend } from 'resend';
import { config } from '@roast/domain';
import type { Logger } from '../types';

export interface BatchCompletionEmailData {
  recipientEmail: string;
  batchName: string | null;
  agentName: string;
  agentId: string;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  batchId: string;
}

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

  async sendBatchCompletionEmail(data: BatchCompletionEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      this.logger.warn('Email not configured, skipping batch completion notification');
      return false;
    }

    const baseUrl = config.auth.nextAuthUrl || 'https://roastmypost.com';
    const batchUrl = `${baseUrl}/evaluators/${data.agentId}`;
    const batchLabel = data.batchName || `Batch ${data.batchId.slice(0, 8)}`;
    const successRate = data.totalCount > 0
      ? Math.round((data.completedCount / data.totalCount) * 100)
      : 0;

    const subject = `Batch complete: ${batchLabel} (${successRate}% success)`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Batch Evaluation Complete</h2>
        <p style="color: #4a4a4a; margin-bottom: 24px;">
          Your evaluation batch <strong>${escapeHtml(batchLabel)}</strong> for agent <strong>${escapeHtml(data.agentName)}</strong> has finished.
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
          <tr>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0; background: #f9f9f9; font-weight: 600;">Success Rate</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">${successRate}%</td>
          </tr>
        </table>
        <a href="${batchUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Results
        </a>
        <p style="color: #9a9a9a; font-size: 12px; margin-top: 32px;">
          You received this email because you checked "Email me when this batch completes" when creating the batch.
        </p>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: config.auth.emailFrom!,
        to: data.recipientEmail,
        subject,
        html,
      });

      this.logger.info(`Batch completion email sent for batch ${data.batchId} to ${data.recipientEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send batch completion email for batch ${data.batchId}:`, error);
      return false;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
