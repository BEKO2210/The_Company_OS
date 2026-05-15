import {
  BaseAdapter,
  EmailAdapter,
  LinkedInAdapter,
  BankingAdapter,
  AccountingAdapter,
  GitHubAdapter,
  HostingAdapter,
  CalendarAdapter,
  FreelancerPlatformAdapter,
} from '../adapters';

export interface AdapterLogEntry {
  timestamp: Date;
  adapter: string;
  action: string;
  details?: unknown;
  duration?: number;
  error?: string;
}

export interface AdapterRegistryEntry {
  adapter: BaseAdapter;
  name: string;
  enabled: boolean;
  connected: boolean;
  config: Record<string, string>;
}

/**
 * AdapterService - Central registry for all external adapters
 *
 * Manages lifecycle, status tracking, and logging for all adapters.
 * Provides a unified interface for connecting, disconnecting, and monitoring.
 */
export class AdapterService {
  private adapters: Map<string, AdapterRegistryEntry> = new Map();
  private logs: AdapterLogEntry[] = [];
  private maxLogEntries = 1000;

  constructor(config?: Record<string, Record<string, string>>) {
    this.initializeAdapters(config);
  }

  private initializeAdapters(config?: Record<string, Record<string, string>>): void {
    const adaptersConfig = config || this.loadConfigFromEnv();

    // Register all adapters
    this.register('email', new EmailAdapter(adaptersConfig.email || {}));
    this.register('linkedin', new LinkedInAdapter(adaptersConfig.linkedin || {}));
    this.register('banking', new BankingAdapter(adaptersConfig.banking || {}));
    this.register('accounting', new AccountingAdapter(adaptersConfig.accounting || {}));
    this.register('github', new GitHubAdapter(adaptersConfig.github || {}));
    this.register('hosting', new HostingAdapter(adaptersConfig.hosting || {}));
    this.register('calendar', new CalendarAdapter(adaptersConfig.calendar || {}));
    this.register('freelancer', new FreelancerPlatformAdapter(adaptersConfig.freelancer || {}));

    console.log(`[AdapterService] Registered ${this.adapters.size} adapters`);
  }

  private loadConfigFromEnv(): Record<string, Record<string, string>> {
    const config: Record<string, Record<string, string>> = {};

    // Email config
    config.email = {
      SMTP_HOST: process.env.EMAIL_SMTP_HOST || '',
      SMTP_PORT: process.env.EMAIL_SMTP_PORT || '587',
      SMTP_USER: process.env.EMAIL_SMTP_USER || '',
      SMTP_PASS: process.env.EMAIL_SMTP_PASS || '',
      FROM_EMAIL: process.env.EMAIL_FROM || 'team@company-os.de',
      API_KEY: process.env.EMAIL_API_KEY || '',
    };

    // LinkedIn config
    config.linkedin = {
      CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || '',
      CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || '',
      ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN || '',
      API_KEY: process.env.LINKEDIN_ACCESS_TOKEN || '',
    };

    // Banking config
    config.banking = {
      BANK_ID: process.env.BANKING_BANK_ID || '',
      ACCOUNT_ID: process.env.BANKING_ACCOUNT_ID || '',
      API_KEY: process.env.BANKING_API_KEY || '',
      CLIENT_ID: process.env.BANKING_CLIENT_ID || '',
      CLIENT_SECRET: process.env.BANKING_CLIENT_SECRET || '',
    };

    // Accounting config
    config.accounting = {
      PROVIDER: process.env.ACCOUNTING_PROVIDER || 'lexoffice',
      API_KEY: process.env.ACCOUNTING_API_KEY || '',
      TENANT_ID: process.env.ACCOUNTING_TENANT_ID || '',
    };

    // GitHub config
    config.github = {
      TOKEN: process.env.GITHUB_TOKEN || '',
      API_KEY: process.env.GITHUB_TOKEN || '',
      ORG: process.env.GITHUB_ORG || 'company-os',
    };

    // Hosting config
    config.hosting = {
      PROVIDER: process.env.HOSTING_PROVIDER || 'vercel',
      TOKEN: process.env.HOSTING_TOKEN || '',
      API_KEY: process.env.HOSTING_TOKEN || '',
      TEAM_ID: process.env.HOSTING_TEAM_ID || '',
    };

    // Calendar config
    config.calendar = {
      CLIENT_ID: process.env.CALENDAR_CLIENT_ID || '',
      CLIENT_SECRET: process.env.CALENDAR_CLIENT_SECRET || '',
      REFRESH_TOKEN: process.env.CALENDAR_REFRESH_TOKEN || '',
      API_KEY: process.env.CALENDAR_API_KEY || '',
    };

    // Freelancer config
    config.freelancer = {
      PLATFORM: process.env.FREELANCER_PLATFORM || 'upwork',
      TOKEN: process.env.FREELANCER_TOKEN || '',
      API_KEY: process.env.FREELANCER_TOKEN || '',
      CLIENT_ID: process.env.FREELANCER_CLIENT_ID || '',
      CLIENT_SECRET: process.env.FREELANCER_CLIENT_SECRET || '',
    };

    return config;
  }

  private register(name: string, adapter: BaseAdapter): void {
    this.adapters.set(name.toLowerCase(), {
      adapter,
      name: name.toLowerCase(),
      enabled: true,
      connected: false,
      config: {},
    });
    this.log('register', name, { type: adapter.constructor.name });
  }

  private log(action: string, adapter: string, details?: unknown, error?: string, duration?: number): void {
    const entry: AdapterLogEntry = {
      timestamp: new Date(),
      adapter,
      action,
      details,
      duration,
      error,
    };

    this.logs.unshift(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(0, this.maxLogEntries);
    }

    console.log(`[AdapterService] ${action} | ${adapter}`, details || '');
  }

  /**
   * Get all registered adapter names
   */
  getAdapterNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get a specific adapter instance
   */
  getAdapter(name: string): BaseAdapter | undefined {
    const entry = this.adapters.get(name.toLowerCase());
    return entry?.adapter;
  }

  /**
   * Get status for all adapters
   */
  async getAllStatuses(): Promise<
    Array<{
      name: string;
      enabled: boolean;
      connected: boolean;
      status: ReturnType<BaseAdapter['getStatus']>;
    }>
  > {
    const results = [];
    for (const [name, entry] of this.adapters) {
      results.push({
        name,
        enabled: entry.enabled,
        connected: entry.connected,
        status: entry.adapter.getStatus(),
      });
    }
    return results;
  }

  /**
   * Get status for a specific adapter
   */
  getStatus(name: string):
    | {
        name: string;
        enabled: boolean;
        connected: boolean;
        status: ReturnType<BaseAdapter['getStatus']>;
      }
    | undefined {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) return undefined;
    return {
      name: entry.name,
      enabled: entry.enabled,
      connected: entry.connected,
      status: entry.adapter.getStatus(),
    };
  }

  /**
   * Connect a specific adapter
   */
  async connect(name: string): Promise<{ success: boolean; message: string }> {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) {
      return { success: false, message: `Adapter '${name}' not found` };
    }

    if (!entry.enabled) {
      return { success: false, message: `Adapter '${name}' is disabled` };
    }

    const startTime = Date.now();
    try {
      const connected = await entry.adapter.connect();
      const duration = Date.now() - startTime;

      if (connected) {
        entry.connected = true;
        this.log('connect', name, undefined, undefined, duration);
        return { success: true, message: `Adapter '${name}' connected successfully` };
      } else {
        this.log('connect', name, undefined, 'Connection returned false', duration);
        return { success: false, message: `Adapter '${name}' connection returned false` };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('connect', name, undefined, errorMessage, duration);
      return { success: false, message: `Adapter '${name}' connection failed: ${errorMessage}` };
    }
  }

  /**
   * Disconnect a specific adapter
   */
  async disconnect(name: string): Promise<{ success: boolean; message: string }> {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) {
      return { success: false, message: `Adapter '${name}' not found` };
    }

    const startTime = Date.now();
    try {
      await entry.adapter.disconnect();
      const duration = Date.now() - startTime;
      entry.connected = false;
      this.log('disconnect', name, undefined, undefined, duration);
      return { success: true, message: `Adapter '${name}' disconnected successfully` };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('disconnect', name, undefined, errorMessage, duration);
      return { success: false, message: `Adapter '${name}' disconnect failed: ${errorMessage}` };
    }
  }

  /**
   * Connect all enabled adapters
   */
  async connectAll(): Promise<Record<string, { success: boolean; message: string }>> {
    const results: Record<string, { success: boolean; message: string }> = {};
    for (const [name] of this.adapters) {
      results[name] = await this.connect(name);
    }
    return results;
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<Record<string, { success: boolean; message: string }>> {
    const results: Record<string, { success: boolean; message: string }> = {};
    for (const [name] of this.adapters) {
      results[name] = await this.disconnect(name);
    }
    return results;
  }

  /**
   * Enable an adapter
   */
  enable(name: string): boolean {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) return false;
    entry.enabled = true;
    this.log('enable', name);
    return true;
  }

  /**
   * Disable an adapter
   */
  disable(name: string): boolean {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) return false;
    entry.enabled = false;
    this.log('disable', name);
    return true;
  }

  /**
   * Test a specific adapter (runs a quick connectivity test)
   */
  async test(name: string): Promise<{ success: boolean; message: string; details?: unknown }> {
    const entry = this.adapters.get(name.toLowerCase());
    if (!entry) {
      return { success: false, message: `Adapter '${name}' not found` };
    }

    const startTime = Date.now();
    this.log('test', name, { action: 'starting' });

    try {
      // Connect
      const connectResult = await entry.adapter.connect();
      if (!connectResult) {
        return { success: false, message: `Adapter '${name}' connection test failed` };
      }

      // Run a quick operation based on adapter type
      let testDetails: unknown = {};
      const adapter = entry.adapter;

      // Use the adapter's specific methods for testing
      const adapterName = adapter.constructor.name;
      switch (adapterName) {
        case 'EmailAdapter': {
          const emailAdapter = adapter as InstanceType<typeof EmailAdapter>;
          const inbox = await emailAdapter.getInbox();
          testDetails = { inboxCount: inbox.length };
          break;
        }
        case 'LinkedInAdapter': {
          const liAdapter = adapter as InstanceType<typeof LinkedInAdapter>;
          const profile = await liAdapter.getProfile();
          testDetails = { profileName: profile.name, connections: profile.connections };
          break;
        }
        case 'BankingAdapter': {
          const bankAdapter = adapter as InstanceType<typeof BankingAdapter>;
          const balance = await bankAdapter.getBalance();
          testDetails = { balance: balance.balance, currency: balance.currency };
          break;
        }
        case 'AccountingAdapter': {
          const accAdapter = adapter as InstanceType<typeof AccountingAdapter>;
          const invoices = await accAdapter.getInvoices();
          testDetails = { invoiceCount: invoices.length };
          break;
        }
        case 'GitHubAdapter': {
          const ghAdapter = adapter as InstanceType<typeof GitHubAdapter>;
          const repos = await ghAdapter.getRepos();
          testDetails = { repoCount: repos.length };
          break;
        }
        case 'HostingAdapter': {
          const hostAdapter = adapter as InstanceType<typeof HostingAdapter>;
          const deployments = await hostAdapter.getDeployments();
          testDetails = { deploymentCount: deployments.length };
          break;
        }
        case 'CalendarAdapter': {
          const calAdapter = adapter as InstanceType<typeof CalendarAdapter>;
          const now = new Date();
          const end = new Date();
          end.setDate(end.getDate() + 7);
          const events = await calAdapter.getEvents(now, end);
          testDetails = { eventCount: events.length };
          break;
        }
        case 'FreelancerPlatformAdapter': {
          const flAdapter = adapter as InstanceType<typeof FreelancerPlatformAdapter>;
          const hires = await flAdapter.getHires();
          testDetails = { hireCount: hires.length };
          break;
        }
        default:
          testDetails = { message: 'No specific test available' };
      }

      // Disconnect
      await entry.adapter.disconnect();

      const duration = Date.now() - startTime;
      this.log('test', name, testDetails, undefined, duration);

      return {
        success: true,
        message: `Adapter '${name}' test completed in ${duration}ms`,
        details: testDetails,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('test', name, undefined, errorMessage, duration);
      return {
        success: false,
        message: `Adapter '${name}' test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get recent log entries
   */
  getLogs(adapter?: string, limit = 50): AdapterLogEntry[] {
    let result = this.logs;
    if (adapter) {
      result = result.filter(log => log.adapter.toLowerCase() === adapter.toLowerCase());
    }
    return result.slice(0, limit);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    console.log('[AdapterService] Logs cleared');
  }

  /**
   * Get adapter count
   */
  getCount(): number {
    return this.adapters.size;
  }
}

// Singleton instance
let adapterServiceInstance: AdapterService | null = null;

export function getAdapterService(config?: Record<string, Record<string, string>>): AdapterService {
  if (!adapterServiceInstance) {
    adapterServiceInstance = new AdapterService(config);
  }
  return adapterServiceInstance;
}

export function resetAdapterService(): void {
  adapterServiceInstance = null;
}
