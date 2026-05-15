import { BaseAdapter } from './baseAdapter';

export interface BankAccount {
  id: string;
  iban: string;
  bic: string;
  accountHolder: string;
  bankName: string;
  currency: string;
}

export interface BankTransaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  counterpartyIban?: string;
  type: 'credit' | 'debit';
  category: string;
  status: 'booked' | 'pending';
}

export interface AccountBalance {
  accountId: string;
  balance: number;
  availableBalance: number;
  currency: string;
  lastUpdated: Date;
}

export class BankingAdapter extends BaseAdapter {
  private account: BankAccount;
  private balance: AccountBalance;
  private transactions: BankTransaction[] = [];

  constructor(config: Record<string, string> = {}) {
    super('Banking', config);
    this.account = this.createMockAccount();
    this.balance = this.createMockBalance();
    this.initializeMockData();
  }

  private createMockAccount(): BankAccount {
    return {
      id: 'acc-001',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
      accountHolder: 'The Company OS GmbH',
      bankName: 'Commerzbank AG',
      currency: 'EUR',
    };
  }

  private createMockBalance(): AccountBalance {
    return {
      accountId: 'acc-001',
      balance: 12450.0,
      availableBalance: 12150.0,
      currency: 'EUR',
      lastUpdated: new Date('2024-12-20T23:59:59'),
    };
  }

  private initializeMockData(): void {
    this.transactions = [
      { id: 'tx-001', date: new Date('2024-12-01'), amount: 3500.0, currency: 'EUR', description: 'Kundenauftrag #2024-112', counterparty: 'TechCorp GmbH', counterpartyIban: 'DE75512108001245126199', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-002', date: new Date('2024-12-01'), amount: -850.0, currency: 'EUR', description: 'Miete Büro Berlin', counterparty: 'ImmoBerlin GmbH', counterpartyIban: 'DE02100500000024290614', type: 'debit', category: 'Miete', status: 'booked' },
      { id: 'tx-003', date: new Date('2024-12-02'), amount: -120.0, currency: 'EUR', description: 'Software-Lizenzen', counterparty: 'Adobe Systems', counterpartyIban: 'DE68500105178297378185', type: 'debit', category: 'Software', status: 'booked' },
      { id: 'tx-004', date: new Date('2024-12-03'), amount: 2800.0, currency: 'EUR', description: 'Projektabschluss Website', counterparty: 'StartupXYZ UG', counterpartyIban: 'DE89370400440532013000', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-005', date: new Date('2024-12-04'), amount: -450.0, currency: 'EUR', description: 'Freelancer-Zahlung Design', counterparty: 'Anna Mueller', counterpartyIban: 'DE15500105171111364671', type: 'debit', category: 'Freelancer', status: 'booked' },
      { id: 'tx-006', date: new Date('2024-12-05'), amount: -89.99, currency: 'EUR', description: 'Cloud-Hosting Vercel', counterparty: 'Vercel Inc.', counterpartyIban: 'DE98765432109876543210', type: 'debit', category: 'Hosting', status: 'booked' },
      { id: 'tx-007', date: new Date('2024-12-06'), amount: -250.0, currency: 'EUR', description: 'Büromaterial & Supplies', counterparty: 'Staples GmbH', counterpartyIban: 'DE12345678901234567890', type: 'debit', category: 'Büromaterial', status: 'booked' },
      { id: 'tx-008', date: new Date('2024-12-07'), amount: 4200.0, currency: 'EUR', description: 'Kundenauftrag #2024-113', counterparty: 'Enterprise Solutions AG', counterpartyIban: 'DE56400400440322222222', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-009', date: new Date('2024-12-08'), amount: -1800.0, currency: 'EUR', description: 'Gehalt Dezember', counterparty: 'Team Member #1', counterpartyIban: 'DE11223344556677889900', type: 'debit', category: 'Gehalt', status: 'booked' },
      { id: 'tx-010', date: new Date('2024-12-09'), amount: -65.0, currency: 'EUR', description: 'Internet & Telefon', counterparty: 'Telekom Deutschland', counterpartyIban: 'DE99887766554433221100', type: 'debit', category: 'Telekommunikation', status: 'booked' },
      { id: 'tx-011', date: new Date('2024-12-10'), amount: 1500.0, currency: 'EUR', description: 'Wartungsvertrag Q4', counterparty: 'DigitalAgency Berlin', counterpartyIban: 'DE44556677889900112233', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-012', date: new Date('2024-12-11'), amount: -320.0, currency: 'EUR', description: 'Freelancer-Zahlung Backend', counterparty: 'Max Mustermann', counterpartyIban: 'DE66778899001122334455', type: 'debit', category: 'Freelancer', status: 'booked' },
      { id: 'tx-013', date: new Date('2024-12-12'), amount: -149.0, currency: 'EUR', description: 'LinkedIn Premium Business', counterparty: 'LinkedIn Ireland', counterpartyIban: 'DE11224466889922557700', type: 'debit', category: 'Marketing', status: 'booked' },
      { id: 'tx-014', date: new Date('2024-12-13'), amount: 2200.0, currency: 'EUR', description: 'App-Entwicklung Teil 2', counterparty: 'MobileFirst GmbH', counterpartyIban: 'DE33667788990011224455', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-015', date: new Date('2024-12-14'), amount: -500.0, currency: 'EUR', description: 'Steuerberater Dezember', counterparty: 'Steuerbüro Schmidt', counterpartyIban: 'DE77889900112233445566', type: 'debit', category: 'Beratung', status: 'booked' },
      { id: 'tx-016', date: new Date('2024-12-15'), amount: -200.0, currency: 'EUR', description: 'Weihnachtsfeier Team', counterparty: 'Restaurant Berlin Mitte', counterpartyIban: 'DE99001122334455667788', type: 'debit', category: 'Team Events', status: 'booked' },
      { id: 'tx-017', date: new Date('2024-12-16'), amount: 3800.0, currency: 'EUR', description: 'Kundenauftrag #2024-114', counterparty: 'FinTech Startup UG', counterpartyIban: 'DE11223344556677889911', type: 'credit', category: 'Einnahmen', status: 'booked' },
      { id: 'tx-018', date: new Date('2024-12-17'), amount: -75.0, currency: 'EUR', description: 'Domain-Renewals', counterparty: 'Cloudflare Inc.', counterpartyIban: 'DE22334455667788990011', type: 'debit', category: 'Domains', status: 'booked' },
      { id: 'tx-019', date: new Date('2024-12-18'), amount: -950.0, currency: 'EUR', description: 'Hardware Notebooks', counterparty: 'MediaMarkt Business', counterpartyIban: 'DE33445566778899001122', type: 'debit', category: 'Hardware', status: 'booked' },
      { id: 'tx-020', date: new Date('2024-12-19'), amount: 5600.0, currency: 'EUR', description: 'Jahresabschlussprojekt', counterparty: 'Kanzlei & Co. AG', counterpartyIban: 'DE44556677889900112244', type: 'credit', category: 'Einnahmen', status: 'booked' },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Open Banking API...');
    await this.mockDelay(500);
    if (this.mockMode) {
      this.log('Connected in MOCK mode (read-only)');
    } else {
      this.log('Connected to Open Banking API (read-only access)');
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Banking API...');
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

  async getBalance(): Promise<AccountBalance> {
    this.log('getBalance');
    await this.mockDelay(300);
    if (!this.mockMode) {
      // Real: Open Banking API balance request
      // const response = await fetch(`https://api.openbanking.com/accounts/${this.config.ACCOUNT_ID}/balances`, { ... });
    }
    return { ...this.balance };
  }

  async getTransactions(limit?: number, from?: Date, to?: Date): Promise<BankTransaction[]> {
    this.log('getTransactions', { limit, from, to });
    await this.mockDelay(400);

    let result = this.mockMode ? [...this.transactions] : [];

    if (from) {
      result = result.filter(tx => tx.date >= from);
    }
    if (to) {
      result = result.filter(tx => tx.date <= to);
    }

    return limit ? result.slice(0, limit) : result;
  }

  async getAccountInfo(): Promise<BankAccount> {
    this.log('getAccountInfo');
    await this.mockDelay(300);
    return { ...this.account };
  }

  async getTotalIncome(from?: Date, to?: Date): Promise<number> {
    const txs = await this.getTransactions(undefined, from, to);
    return txs.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
  }

  async getTotalExpenses(from?: Date, to?: Date): Promise<number> {
    const txs = await this.getTransactions(undefined, from, to);
    return txs.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }
}
