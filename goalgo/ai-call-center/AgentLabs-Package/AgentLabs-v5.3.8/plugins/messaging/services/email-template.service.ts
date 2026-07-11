import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { sendEmail } from './email-sender.service';
import { messagingLogService } from './messaging-log.service';
import type { UserEmailTemplate } from '../types';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformRow<T>(row: Record<string, any>): T {
  const transformed: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    transformed[snakeToCamel(key)] = row[key];
  }
  return transformed as T;
}

export class EmailTemplateService {
  async getAll(userId: string): Promise<UserEmailTemplate[]> {
    const result = await db.execute(sql`
      SELECT * FROM user_email_templates WHERE user_id = ${userId} ORDER BY created_at DESC
    `);
    return (result as any).rows.map((row: any) => transformRow<UserEmailTemplate>(row));
  }

  async getById(userId: string, id: string): Promise<UserEmailTemplate | null> {
    const result = await db.execute(sql`
      SELECT * FROM user_email_templates WHERE id = ${id} AND user_id = ${userId} LIMIT 1
    `);
    const row = (result as any).rows[0];
    return row ? transformRow<UserEmailTemplate>(row) : null;
  }

  async getByName(userId: string, name: string): Promise<UserEmailTemplate | null> {
    const result = await db.execute(sql`
      SELECT * FROM user_email_templates WHERE name = ${name} AND user_id = ${userId} AND is_active = true LIMIT 1
    `);
    const row = (result as any).rows[0];
    return row ? transformRow<UserEmailTemplate>(row) : null;
  }

  async create(
    userId: string,
    data: { name: string; subject: string; htmlBody: string; variables?: string[] }
  ): Promise<UserEmailTemplate> {
    const variables = data.variables || [];
    const pgArray = `{${variables.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
    const result = await db.execute(sql`
      INSERT INTO user_email_templates (user_id, name, subject, html_body, variables)
      VALUES (${userId}, ${data.name}, ${data.subject}, ${data.htmlBody}, ${pgArray}::text[])
      RETURNING *
    `);
    return transformRow<UserEmailTemplate>((result as any).rows[0]);
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; subject?: string; htmlBody?: string; variables?: string[]; isActive?: boolean }
  ): Promise<UserEmailTemplate | null> {
    const existing = await this.getById(userId, id);
    if (!existing) return null;

    const name = data.name ?? existing.name;
    const subject = data.subject ?? existing.subject;
    const htmlBody = data.htmlBody ?? existing.htmlBody;
    const isActive = data.isActive ?? existing.isActive;
    const variables = data.variables ?? existing.variables ?? [];
    const pgArray = `{${variables.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;

    const result = await db.execute(sql`
      UPDATE user_email_templates
      SET name = ${name}, subject = ${subject}, html_body = ${htmlBody}, is_active = ${isActive},
          variables = ${pgArray}::text[],
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `);
    const row = (result as any).rows[0];
    return row ? transformRow<UserEmailTemplate>(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM user_email_templates WHERE id = ${id} AND user_id = ${userId}
    `);
    return (result as any).rowCount > 0;
  }

  private wrapAgentEmailTemplate(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{company_name}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-container {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .email-header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 32px;
      text-align: center;
    }
    .email-logo {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .email-tagline {
      color: #94a3b8;
      font-size: 14px;
      margin: 8px 0 0 0;
    }
    .email-body {
      padding: 40px 32px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 16px 0;
    }
    .email-text {
      font-size: 16px;
      color: #4b5563;
      margin: 0 0 24px 0;
    }
    .email-highlight-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .email-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .email-table td {
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 15px;
    }
    .email-table td:first-child {
      color: #6b7280;
    }
    .email-table td:last-child {
      text-align: right;
      font-weight: 500;
      color: #1f2937;
    }
    .email-table tr:last-child td {
      border-bottom: none;
      font-weight: 600;
    }
    .email-alert {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .email-alert-success {
      background: #dcfce7;
      border-left-color: #22c55e;
    }
    .email-alert-info {
      background: #dbeafe;
      border-left-color: #3b82f6;
    }
    .email-footer {
      background: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .email-footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0 0 12px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 12px;
      }
      .email-body {
        padding: 28px 20px;
      }
      .email-header {
        padding: 24px 20px;
      }
      .email-title {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="email-logo">{{company_name}}</h1>
      </div>
      ${content}
      <div class="email-footer">
        <p class="email-footer-text">
          &copy; {{company_name}}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async seedDefaultTemplates(userId: string): Promise<void> {
    const existing = await this.getAll(userId);
    const existingNames = new Set(existing.map(t => t.name));

    const defaults = [
      {
        name: 'Appointment Confirmation',
        subject: 'Your Appointment is Confirmed - {{company_name}}',
        bodyContent: `
      <div class="email-body">
        <h2 class="email-title">Appointment Confirmed</h2>
        <p class="email-text">Hi {{contact_name}},</p>
        <p class="email-text">Your appointment has been successfully booked. Here are the details:</p>
        <div class="email-highlight-box">
          <table class="email-table">
            <tr><td>Date</td><td>{{appointment_date}}</td></tr>
            <tr><td>Time</td><td>{{appointment_time}}</td></tr>
            <tr><td>Service</td><td>{{service_name}}</td></tr>
            <tr><td>Duration</td><td>{{duration}} minutes</td></tr>
          </table>
        </div>
        <div class="email-alert email-alert-success">
          <strong>You're all set!</strong> We look forward to seeing you.
        </div>
        <p class="email-text">{{notes}}</p>
        <p class="email-text" style="font-size: 14px; color: #6b7280;">
          If you need to reschedule or cancel, please contact us.
        </p>
      </div>`,
        variables: ['contact_name', 'company_name', 'appointment_date', 'appointment_time', 'service_name', 'duration', 'notes'],
      },
      {
        name: 'Appointment Reminder',
        subject: 'Reminder: Your Appointment is Coming Up - {{company_name}}',
        bodyContent: `
      <div class="email-body">
        <h2 class="email-title">Appointment Reminder</h2>
        <p class="email-text">Hi {{contact_name}},</p>
        <p class="email-text">This is a friendly reminder about your upcoming appointment:</p>
        <div class="email-highlight-box">
          <table class="email-table">
            <tr><td>Date</td><td>{{appointment_date}}</td></tr>
            <tr><td>Time</td><td>{{appointment_time}}</td></tr>
            <tr><td>Service</td><td>{{service_name}}</td></tr>
            <tr><td>Duration</td><td>{{duration}} minutes</td></tr>
          </table>
        </div>
        <div class="email-alert email-alert-info">
          <strong>Please arrive on time.</strong> If you need to reschedule, contact us as soon as possible.
        </div>
        <p class="email-text">{{notes}}</p>
      </div>`,
        variables: ['contact_name', 'company_name', 'appointment_date', 'appointment_time', 'service_name', 'duration', 'notes'],
      },
      {
        name: 'Call Follow-Up',
        subject: 'Thank You for Your Call - {{company_name}}',
        bodyContent: `
      <div class="email-body">
        <h2 class="email-title">Thank You for Your Call</h2>
        <p class="email-text">Hi {{contact_name}},</p>
        <p class="email-text">Thank you for speaking with us today. We appreciate your time and wanted to follow up with a summary of our conversation.</p>
        <div class="email-highlight-box">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b;">Call Summary</p>
          <p style="margin: 0; color: #4b5563;">{{call_summary}}</p>
        </div>
        <p class="email-text">{{next_steps}}</p>
        <p class="email-text" style="font-size: 14px; color: #6b7280;">
          If you have any questions or need further assistance, please don't hesitate to reach out.
        </p>
      </div>`,
        variables: ['contact_name', 'company_name', 'call_summary', 'next_steps'],
      },
      {
        name: 'Missed Call',
        subject: 'We Missed Your Call - {{company_name}}',
        bodyContent: `
      <div class="email-body">
        <h2 class="email-title">We Missed Your Call</h2>
        <p class="email-text">Hi {{contact_name}},</p>
        <p class="email-text">We noticed we weren't able to connect with you during our recent call attempt. We'd love to speak with you at a time that works better.</p>
        <div class="email-alert">
          <strong>We tried reaching you</strong> but were unable to connect. Please feel free to call us back or let us know a convenient time.
        </div>
        <p class="email-text">{{message}}</p>
        <p class="email-text" style="font-size: 14px; color: #6b7280;">
          We look forward to connecting with you soon.
        </p>
      </div>`,
        variables: ['contact_name', 'company_name', 'message'],
      },
      {
        name: 'Welcome / Inquiry Response',
        subject: 'Thank You for Your Inquiry - {{company_name}}',
        bodyContent: `
      <div class="email-body">
        <h2 class="email-title">Thank You for Your Inquiry</h2>
        <p class="email-text">Hi {{contact_name}},</p>
        <p class="email-text">Thank you for reaching out to us. We've received your inquiry and wanted to provide you with some helpful information.</p>
        <div class="email-highlight-box">
          <p style="margin: 0; color: #4b5563;">{{response_details}}</p>
        </div>
        <div class="email-alert email-alert-success">
          <strong>We're here to help!</strong> A member of our team will follow up with you shortly if needed.
        </div>
        <p class="email-text">{{additional_info}}</p>
        <p class="email-text" style="font-size: 14px; color: #6b7280;">
          If you have any further questions, don't hesitate to contact us.
        </p>
      </div>`,
        variables: ['contact_name', 'company_name', 'response_details', 'additional_info'],
      },
    ];

    const toSeed = defaults.filter(d => !existingNames.has(d.name));
    if (toSeed.length === 0) return;

    console.log(`[Messaging] Seeding ${toSeed.length} default email templates for user ${userId}`);
    for (const tmpl of toSeed) {
      try {
        await this.create(userId, {
          name: tmpl.name,
          subject: tmpl.subject,
          htmlBody: this.wrapAgentEmailTemplate(tmpl.bodyContent),
          variables: tmpl.variables,
        });
      } catch (err: any) {
        console.warn(`[Messaging] Failed to seed template "${tmpl.name}":`, err.message);
      }
    }
    console.log(`[Messaging] Default email templates seeded for user ${userId}`);
  }

  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  async sendEmail(
    userId: string,
    templateId: string,
    recipientEmail: string,
    variables: Record<string, string> = {},
    meta?: { callId?: string; agentId?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = await this.getById(userId, templateId);
    if (!template) {
      const error = `Email template not found: ${templateId}`;
      await messagingLogService.logMessage(userId, 'email', {
        callId: meta?.callId,
        agentId: meta?.agentId,
        recipientEmail,
        templateName: templateId,
        status: 'failed',
        errorMessage: error,
      });
      return { success: false, error };
    }

    const subject = this.substituteVariables(template.subject, variables);
    const htmlBody = this.substituteVariables(template.htmlBody, variables);

    try {
      const result = await sendEmail(recipientEmail, subject, htmlBody);

      await messagingLogService.logMessage(userId, 'email', {
        callId: meta?.callId,
        agentId: meta?.agentId,
        recipientEmail,
        templateName: template.name,
        status: result.success ? 'sent' : 'failed',
        responseData: result.success ? { messageId: result.messageId } : undefined,
        errorMessage: result.error,
      });

      if (result.success) {
        console.log(`✅ [Messaging] Email "${template.name}" sent to ${recipientEmail}`);
      } else {
        console.log(`❌ [Messaging] Email "${template.name}" failed to ${recipientEmail}: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown email error';
      await messagingLogService.logMessage(userId, 'email', {
        callId: meta?.callId,
        agentId: meta?.agentId,
        recipientEmail,
        templateName: template.name,
        status: 'failed',
        errorMessage: errorMsg,
      });
      console.log(`❌ [Messaging] Email "${template.name}" error to ${recipientEmail}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async sendEmailByName(
    userId: string,
    templateName: string,
    recipientEmail: string,
    variables: Record<string, string> = {},
    meta?: { callId?: string; agentId?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = await this.getByName(userId, templateName);
    if (!template) {
      const error = `Email template "${templateName}" not found`;
      await messagingLogService.logMessage(userId, 'email', {
        callId: meta?.callId,
        agentId: meta?.agentId,
        recipientEmail,
        templateName,
        status: 'failed',
        errorMessage: error,
      });
      return { success: false, error };
    }
    return this.sendEmail(userId, template.id, recipientEmail, variables, meta);
  }
}

export const emailTemplateService = new EmailTemplateService();
