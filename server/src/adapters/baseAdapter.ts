export abstract class BaseAdapter {
  protected name: string;
  protected mockMode: boolean;
  protected config: Record<string, string>;
  protected status: 'idle' | 'running' | 'error' = 'idle';
  protected lastError?: string;

  constructor(name: string, config: Record<string, string> = {}) {
    this.name = name;
    this.config = config;
    this.mockMode = process.env.MOCK_MODE !== 'false' && !config.API_KEY;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract getStatus(): { name: string; status: string; mockMode: boolean; lastError?: string };

  protected async mockDelay(ms = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected log(action: string, details?: unknown): void {
    console.log(`[Adapter:${this.name}] ${action}`, details || '');
  }
}
