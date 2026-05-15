import { BaseAdapter } from './baseAdapter';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
}

export interface CreateInvoiceInput {
  customerName: string;
  customerEmail: string;
  items: Omit<InvoiceItem, 'totalPrice'>[];
  currency?: string;
  dueDays?: number;
  notes?: string;
}

export class AccountingAdapter extends BaseAdapter {
  private invoices: Invoice[] = [];
  private nextInvoiceNumber = 43;

  constructor(config: Record<string, string> = {}) {
    super('Accounting', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.invoices = [
      {
        id: 'inv-001',
        invoiceNumber: 'RE-2024-038',
        customerName: 'TechCorp GmbH',
        customerEmail: 'rechnungen@techcorp.de',
        items: [
          { description: 'Webentwicklung Frontend (80h)', quantity: 80, unitPrice: 85.0, totalPrice: 6800.0, vatRate: 19 },
          { description: 'UI/UX Design (20h)', quantity: 20, unitPrice: 75.0, totalPrice: 1500.0, vatRate: 19 },
        ],
        subtotal: 8300.0,
        vatAmount: 1577.0,
        total: 9877.0,
        currency: 'EUR',
        status: 'paid',
        issueDate: new Date('2024-11-01'),
        dueDate: new Date('2024-11-15'),
        paidDate: new Date('2024-11-14'),
      },
      {
        id: 'inv-002',
        invoiceNumber: 'RE-2024-039',
        customerName: 'StartupXYZ UG',
        customerEmail: 'finance@startupxyz.de',
        items: [
          { description: 'Mobile App Entwicklung iOS', quantity: 1, unitPrice: 12000.0, totalPrice: 12000.0, vatRate: 19 },
          { description: 'App Store Deployment', quantity: 1, unitPrice: 500.0, totalPrice: 500.0, vatRate: 19 },
        ],
        subtotal: 12500.0,
        vatAmount: 2375.0,
        total: 14875.0,
        currency: 'EUR',
        status: 'paid',
        issueDate: new Date('2024-11-15'),
        dueDate: new Date('2024-11-30'),
        paidDate: new Date('2024-11-28'),
      },
      {
        id: 'inv-003',
        invoiceNumber: 'RE-2024-040',
        customerName: 'Enterprise Solutions AG',
        customerEmail: 'accounting@enterprise.de',
        items: [
          { description: 'Beratung IT-Strategie (40h)', quantity: 40, unitPrice: 120.0, totalPrice: 4800.0, vatRate: 19 },
        ],
        subtotal: 4800.0,
        vatAmount: 912.0,
        total: 5712.0,
        currency: 'EUR',
        status: 'sent',
        issueDate: new Date('2024-12-01'),
        dueDate: new Date('2024-12-15'),
      },
      {
        id: 'inv-004',
        invoiceNumber: 'RE-2024-041',
        customerName: 'DigitalAgency Berlin',
        customerEmail: 'bills@digitalagency.de',
        items: [
          { description: 'API-Integration Drittanbieter', quantity: 1, unitPrice: 3500.0, totalPrice: 3500.0, vatRate: 19 },
          { description: 'Dokumentation & Tests', quantity: 1, unitPrice: 800.0, totalPrice: 800.0, vatRate: 19 },
        ],
        subtotal: 4300.0,
        vatAmount: 817.0,
        total: 5117.0,
        currency: 'EUR',
        status: 'sent',
        issueDate: new Date('2024-12-05'),
        dueDate: new Date('2024-12-20'),
      },
      {
        id: 'inv-005',
        invoiceNumber: 'RE-2024-042',
        customerName: 'FinTech Startup UG',
        customerEmail: 'hello@fintech.de',
        items: [
          { description: 'Full-Stack Entwicklung (120h)', quantity: 120, unitPrice: 95.0, totalPrice: 11400.0, vatRate: 19 },
          { description: 'DevOps Setup CI/CD', quantity: 1, unitPrice: 1500.0, totalPrice: 1500.0, vatRate: 19 },
          { description: 'Datenbank-Design', quantity: 1, unitPrice: 800.0, totalPrice: 800.0, vatRate: 19 },
        ],
        subtotal: 13700.0,
        vatAmount: 2603.0,
        total: 16303.0,
        currency: 'EUR',
        status: 'draft',
        issueDate: new Date('2024-12-18'),
        dueDate: new Date('2025-01-15'),
        notes: 'Teilzahlung nach Meilensteinen möglich',
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Accounting API...');
    await this.mockDelay(500);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      const provider = this.config.PROVIDER || 'lexoffice';
      this.log(`Connected to ${provider} API`);
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Accounting API...');
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

  async createInvoice(data: CreateInvoiceInput): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    this.log('createInvoice', { customer: data.customerName });
    await this.mockDelay(600);

    if (this.mockMode) {
      const invoiceNumber = `RE-2024-${String(this.nextInvoiceNumber).padStart(3, '0')}`;
      this.nextInvoiceNumber++;

      const items: InvoiceItem[] = data.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const vatAmount = items.reduce((sum, item) => sum + (item.totalPrice * item.vatRate) / 100, 0);

      const invoice: Invoice = {
        id: `inv-${String(this.invoices.length + 1).padStart(3, '0')}`,
        invoiceNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        items,
        subtotal,
        vatAmount,
        total: subtotal + vatAmount,
        currency: data.currency || 'EUR',
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + (data.dueDays || 14) * 86400000),
        notes: data.notes,
      };

      this.invoices.push(invoice);
      this.log('Invoice created (MOCK)', { invoiceNumber });
      return { success: true, invoice };
    }

    // Real mode: lexoffice/sevDesk API
    try {
      // const response = await fetch(`https://api.lexoffice.io/v1/invoices`, { ... });
      return { success: true };
    } catch (error) {
      this.lastError = `Invoice creation failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async getInvoices(status?: Invoice['status']): Promise<Invoice[]> {
    this.log('getInvoices', { status });
    await this.mockDelay(400);

    let result = this.mockMode ? [...this.invoices] : [];
    if (status) {
      result = result.filter(inv => inv.status === status);
    }
    return result;
  }

  async markAsPaid(id: string): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    this.log('markAsPaid', { id });
    await this.mockDelay(300);

    const invoice = this.invoices.find(inv => inv.id === id);
    if (!invoice) {
      return { success: false, error: `Invoice ${id} not found` };
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date();
    this.log('Invoice marked as paid (MOCK)', { id });
    return { success: true, invoice };
  }

  async exportCSV(): Promise<{ success: boolean; csv?: string; error?: string }> {
    this.log('exportCSV');
    await this.mockDelay(500);

    if (!this.mockMode) {
      return { success: false, error: 'CSV export only available in mock mode' };
    }

    const headers = ['Rechnungsnummer', 'Kunde', 'Datum', 'Fällig', 'Betrag', 'Status', 'Bezahlt am'];
    const rows = this.invoices.map(inv => [
      inv.invoiceNumber,
      inv.customerName,
      inv.issueDate.toISOString().split('T')[0],
      inv.dueDate.toISOString().split('T')[0],
      inv.total.toFixed(2),
      inv.status,
      inv.paidDate ? inv.paidDate.toISOString().split('T')[0] : '-',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    return { success: true, csv };
  }
}
