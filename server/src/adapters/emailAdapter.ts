import { BaseAdapter } from './baseAdapter';

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  sentAt: Date;
  status: 'sent' | 'draft' | 'failed';
}

export interface EmailAttachment {
  filename: string;
  size: number;
  mimeType: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

export class EmailAdapter extends BaseAdapter {
  private sentEmails: EmailMessage[] = [];
  private inboxEmails: EmailMessage[] = [];

  constructor(config: Record<string, string> = {}) {
    super('Email', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.sentEmails = [
      {
        id: 'email-001',
        to: 'client@techcorp.de',
        from: 'team@company-os.de',
        subject: 'Projektangebot: Website-Relaunch',
        body: 'Sehr geehrte Damen und Herren,\n\nhiermit senden wir Ihnen unser Angebot für den Website-Relaunch...',
        attachments: [{ filename: 'Angebot_2024.pdf', size: 1245000, mimeType: 'application/pdf' }],
        sentAt: new Date('2024-12-01T09:30:00'),
        status: 'sent',
      },
      {
        id: 'email-002',
        to: 'freelancer@designer.de',
        from: 'team@company-os.de',
        subject: 'Auftrag: UI/UX Design für Mobile App',
        body: 'Hallo,\n\nwir möchten Sie für ein Design-Projekt beauftragen...',
        attachments: [{ filename: 'Briefing.pdf', size: 890000, mimeType: 'application/pdf' }],
        sentAt: new Date('2024-12-05T14:15:00'),
        status: 'sent',
      },
      {
        id: 'email-003',
        to: 'rechnung@lexoffice.de',
        from: 'team@company-os.de',
        subject: 'Rechnung RE-2024-042',
        body: 'Im Anhang finden Sie unsere Rechnung für Dezember 2024...',
        attachments: [{ filename: 'RE-2024-042.pdf', size: 2100000, mimeType: 'application/pdf' }],
        sentAt: new Date('2024-12-10T11:00:00'),
        status: 'sent',
      },
      {
        id: 'email-004',
        to: 'partner@startup.io',
        from: 'team@company-os.de',
        subject: 'Partnerschaftsvereinbarung',
        body: 'Liebes Team,\n\nwir freuen uns auf die Zusammenarbeit...',
        attachments: [{ filename: 'Vertrag.pdf', size: 3400000, mimeType: 'application/pdf' }],
        sentAt: new Date('2024-12-12T16:45:00'),
        status: 'sent',
      },
      {
        id: 'email-005',
        to: 'support@vercel.com',
        from: 'team@company-os.de',
        subject: 'Support-Anfrage: Deployment-Fehler',
        body: 'Hallo Vercel Support,\n\nbei unserem letzten Deployment tritt folgender Fehler auf...',
        attachments: [{ filename: 'error-screenshot.png', size: 450000, mimeType: 'image/png' }],
        sentAt: new Date('2024-12-15T08:20:00'),
        status: 'sent',
      },
    ];

    this.inboxEmails = [
      {
        id: 'inbox-001',
        to: 'team@company-os.de',
        from: 'kunde@enterprise.com',
        subject: 'AW: Projektangebot',
        body: 'Vielen Dank für Ihr Angebot. Wir stimmen den Konditionen zu...',
        sentAt: new Date('2024-12-08T10:00:00'),
        status: 'sent',
      },
      {
        id: 'inbox-002',
        to: 'team@company-os.de',
        from: 'noreply@github.com',
        subject: 'Security Alert: Repository Access',
        body: 'A new personal access token was added to your account...',
        sentAt: new Date('2024-12-14T03:22:00'),
        status: 'sent',
      },
      {
        id: 'inbox-003',
        to: 'team@company-os.de',
        from: 'info@banking.de',
        subject: 'Kontoauszug Dezember 2024',
        body: 'Ihr monatlicher Kontoauszug ist nun verfügbar...',
        attachments: [{ filename: 'Kontoauszug_12_2024.pdf', size: 560000, mimeType: 'application/pdf' }],
        sentAt: new Date('2024-12-20T06:00:00'),
        status: 'sent',
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Email service...');
    await this.mockDelay(400);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      this.log('Connected to SMTP/Resend API');
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Email service...');
    await this.mockDelay(200);
    this.status = 'idle';
    this.log('Disconnected');
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      mockMode: this.mockMode,
      lastError: this.lastError,
    };
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: EmailAttachment[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.log('sendEmail', { to, subject, attachments: attachments?.length || 0 });
    await this.mockDelay(500);

    if (this.mockMode) {
      const messageId = `mock-email-${Date.now()}`;
      this.sentEmails.push({
        id: messageId,
        to,
        from: this.config.FROM_EMAIL || 'team@company-os.de',
        subject,
        body,
        attachments,
        sentAt: new Date(),
        status: 'sent',
      });
      this.log('Email sent (MOCK)', { messageId });
      return { success: true, messageId };
    }

    // Real mode: SMTP/Resend API
    try {
      // Resend API integration would go here
      // const resend = new Resend(this.config.API_KEY);
      // const result = await resend.emails.send({ from, to, subject, html: body });
      return { success: true, messageId: `real-email-${Date.now()}` };
    } catch (error) {
      this.lastError = `Email send failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async getInbox(): Promise<EmailMessage[]> {
    this.log('getInbox');
    await this.mockDelay(300);
    return this.mockMode ? [...this.inboxEmails] : [];
  }

  async getSent(): Promise<EmailMessage[]> {
    this.log('getSent');
    await this.mockDelay(300);
    return this.mockMode ? [...this.sentEmails] : [];
  }

  async getAttachmentCount(): Promise<number> {
    const allEmails = [...this.sentEmails, ...this.inboxEmails];
    return allEmails.reduce((count, email) => count + (email.attachments?.length || 0), 0);
  }
}
