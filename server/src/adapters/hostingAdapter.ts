import { BaseAdapter } from './baseAdapter';

export interface Deployment {
  id: string;
  project: string;
  environment: 'production' | 'staging' | 'development' | 'preview';
  status: 'building' | 'ready' | 'error' | 'cancelled';
  url: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  createdAt: Date;
  deployedAt?: Date;
  buildTime?: number;
  regions: string[];
}

export interface Project {
  id: string;
  name: string;
  framework: string;
  repository: string;
  productionUrl: string;
  createdAt: Date;
}

export class HostingAdapter extends BaseAdapter {
  private deployments: Deployment[] = [];
  private projects: Project[] = [];

  constructor(config: Record<string, string> = {}) {
    super('Hosting', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.projects = [
      {
        id: 'proj-001',
        name: 'company-os-dashboard',
        framework: 'Next.js',
        repository: 'company-os/company-os',
        productionUrl: 'https://dashboard.company-os.de',
        createdAt: new Date('2024-01-20T10:00:00'),
      },
      {
        id: 'proj-002',
        name: 'company-os-api',
        framework: 'Node.js',
        repository: 'company-os/company-os-api',
        productionUrl: 'https://api.company-os.de',
        createdAt: new Date('2024-02-05T14:00:00'),
      },
      {
        id: 'proj-003',
        name: 'company-os-landing',
        framework: 'Next.js',
        repository: 'company-os/company-os-landing',
        productionUrl: 'https://company-os.de',
        createdAt: new Date('2024-03-10T08:30:00'),
      },
    ];

    this.deployments = [
      {
        id: 'depl-001',
        project: 'company-os-dashboard',
        environment: 'production',
        status: 'ready',
        url: 'https://dashboard.company-os.de',
        branch: 'main',
        commitSha: 'a1b2c3d',
        commitMessage: 'feat: Add new analytics dashboard widgets',
        author: 'dev-sarah',
        createdAt: new Date('2024-12-18T14:30:00'),
        deployedAt: new Date('2024-12-18T14:35:00'),
        buildTime: 280,
        regions: ['fra1', 'iad1'],
      },
      {
        id: 'depl-002',
        project: 'company-os-api',
        environment: 'production',
        status: 'ready',
        url: 'https://api.company-os.de',
        branch: 'main',
        commitSha: 'e4f5g6h',
        commitMessage: 'fix: Optimize database queries for reporting',
        author: 'dev-michael',
        createdAt: new Date('2024-12-19T09:15:00'),
        deployedAt: new Date('2024-12-19T09:22:00'),
        buildTime: 420,
        regions: ['fra1'],
      },
      {
        id: 'depl-003',
        project: 'company-os-landing',
        environment: 'production',
        status: 'ready',
        url: 'https://company-os.de',
        branch: 'main',
        commitSha: 'i7j8k9l',
        commitMessage: 'chore: Update dependencies and security patches',
        author: 'dev-lisa',
        createdAt: new Date('2024-12-19T11:00:00'),
        deployedAt: new Date('2024-12-19T11:08:00'),
        buildTime: 195,
        regions: ['fra1', 'iad1', 'sin1'],
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Hosting API...');
    await this.mockDelay(400);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      const provider = this.config.PROVIDER || 'vercel';
      this.log(`Connected to ${provider} API`);
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Hosting API...');
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

  async deploy(project: string, env: 'production' | 'staging' | 'development' = 'production'): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
    this.log('deploy', { project, env });
    await this.mockDelay(800);

    if (this.mockMode) {
      const deployment: Deployment = {
        id: `depl-${String(this.deployments.length + 1).padStart(3, '0')}`,
        project,
        environment: env,
        status: 'building',
        url: `https://${project}.company-os.de`,
        branch: 'main',
        commitSha: `mock-${Date.now().toString(36)}`,
        commitMessage: 'Deployment via Company OS',
        author: 'company-os',
        createdAt: new Date(),
        regions: ['fra1'],
      };
      this.deployments.push(deployment);

      // Simulate build completion after delay
      setTimeout(() => {
        deployment.status = 'ready';
        deployment.deployedAt = new Date();
        deployment.buildTime = Math.floor(Math.random() * 300) + 120;
      }, 2000);

      this.log('Deployment started (MOCK)', { id: deployment.id, project });
      return { success: true, deployment };
    }

    // Real: Vercel/Cloudflare API
    try {
      // const response = await fetch('https://api.vercel.com/v13/deployments', { method: 'POST', ... });
      return { success: true };
    } catch (error) {
      this.lastError = `Deployment failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async getDeployments(project?: string, limit = 10): Promise<Deployment[]> {
    this.log('getDeployments', { project, limit });
    await this.mockDelay(400);

    let result = this.mockMode ? [...this.deployments] : [];
    if (project) {
      result = result.filter(d => d.project === project);
    }
    return result.slice(0, limit);
  }

  async rollback(deploymentId: string): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
    this.log('rollback', { deploymentId });
    await this.mockDelay(600);

    const deployment = this.deployments.find(d => d.id === deploymentId);
    if (!deployment) {
      return { success: false, error: `Deployment ${deploymentId} not found` };
    }

    // Create a new deployment that rolls back to this one
    const rollbackDeployment: Deployment = {
      ...deployment,
      id: `depl-${String(this.deployments.length + 1).padStart(3, '0')}`,
      commitMessage: `rollback: Revert to ${deployment.commitSha}`,
      createdAt: new Date(),
      deployedAt: undefined,
      status: 'building',
    };

    this.deployments.push(rollbackDeployment);
    this.log('Rollback initiated (MOCK)', { deploymentId, rollbackId: rollbackDeployment.id });
    return { success: true, deployment: rollbackDeployment };
  }

  async getProjects(): Promise<Project[]> {
    this.log('getProjects');
    await this.mockDelay(300);
    return this.mockMode ? [...this.projects] : [];
  }
}
