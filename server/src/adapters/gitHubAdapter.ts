import { BaseAdapter } from './baseAdapter';

export interface GitHubRepo {
  id: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  topics: string[];
  defaultBranch: string;
}

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  branch: string;
  baseBranch: string;
  createdAt: Date;
  mergedAt?: Date;
}

export interface GitHubFile {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
}

export interface CreatePullRequestInput {
  repo: string;
  title: string;
  description: string;
  branch: string;
  baseBranch?: string;
}

export class GitHubAdapter extends BaseAdapter {
  private repos: GitHubRepo[] = [];
  private pullRequests: GitHubPullRequest[] = [];

  constructor(config: Record<string, string> = {}) {
    super('GitHub', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.repos = [
      {
        id: 'repo-001',
        name: 'company-os',
        description: 'The Company OS - AI-powered business operating system',
        url: 'https://github.com/company-os/company-os',
        language: 'TypeScript',
        stars: 342,
        forks: 56,
        isPrivate: false,
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-12-19T16:30:00'),
        topics: ['business-automation', 'ai', 'typescript', 'nextjs'],
        defaultBranch: 'main',
      },
      {
        id: 'repo-002',
        name: 'company-os-api',
        description: 'REST API backend for The Company OS',
        url: 'https://github.com/company-os/company-os-api',
        language: 'TypeScript',
        stars: 128,
        forks: 23,
        isPrivate: false,
        createdAt: new Date('2024-02-01T14:00:00'),
        updatedAt: new Date('2024-12-18T09:15:00'),
        topics: ['api', 'nodejs', 'express', 'postgresql'],
        defaultBranch: 'main',
      },
      {
        id: 'repo-003',
        name: 'company-os-mobile',
        description: 'Mobile companion app for The Company OS',
        url: 'https://github.com/company-os/company-os-mobile',
        language: 'TypeScript',
        stars: 67,
        forks: 12,
        isPrivate: false,
        createdAt: new Date('2024-05-20T08:30:00'),
        updatedAt: new Date('2024-12-15T11:00:00'),
        topics: ['react-native', 'mobile', 'ios', 'android'],
        defaultBranch: 'develop',
      },
    ];

    this.pullRequests = [
      {
        id: 'pr-001',
        number: 42,
        title: 'feat: Add LinkedIn integration adapter',
        description: 'This PR adds the LinkedIn social selling adapter with full mock mode support.',
        author: 'dev-sarah',
        status: 'merged',
        branch: 'feature/linkedin-adapter',
        baseBranch: 'main',
        createdAt: new Date('2024-12-10T10:00:00'),
        mergedAt: new Date('2024-12-12T14:30:00'),
      },
      {
        id: 'pr-002',
        number: 43,
        title: 'fix: Banking adapter transaction filtering',
        description: 'Fixed an issue where date range filtering was not applied correctly.',
        author: 'dev-michael',
        status: 'merged',
        branch: 'fix/banking-filter',
        baseBranch: 'main',
        createdAt: new Date('2024-12-14T09:00:00'),
        mergedAt: new Date('2024-12-15T11:00:00'),
      },
      {
        id: 'pr-003',
        number: 44,
        title: 'feat: Add calendar free slots detection',
        description: 'Implements free slot detection algorithm for the calendar adapter.',
        author: 'dev-lisa',
        status: 'open',
        branch: 'feature/calendar-slots',
        baseBranch: 'main',
        createdAt: new Date('2024-12-18T16:00:00'),
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to GitHub API...');
    await this.mockDelay(400);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      this.log('Connected to GitHub REST API v3');
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from GitHub API...');
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

  async createRepo(name: string, description?: string, isPrivate = true): Promise<{ success: boolean; repo?: GitHubRepo; error?: string }> {
    this.log('createRepo', { name, isPrivate });
    await this.mockDelay(600);

    if (this.mockMode) {
      const repo: GitHubRepo = {
        id: `repo-${String(this.repos.length + 1).padStart(3, '0')}`,
        name,
        description: description || '',
        url: `https://github.com/company-os/${name}`,
        language: 'TypeScript',
        stars: 0,
        forks: 0,
        isPrivate,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [],
        defaultBranch: 'main',
      };
      this.repos.push(repo);
      this.log('Repository created (MOCK)', { name });
      return { success: true, repo };
    }

    // Real: GitHub API
    try {
      // const response = await fetch('https://api.github.com/user/repos', { method: 'POST', ... });
      return { success: true };
    } catch (error) {
      this.lastError = `Repo creation failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async pushFiles(repoName: string, files: GitHubFile[], branch = 'main'): Promise<{ success: boolean; commitSha?: string; error?: string }> {
    this.log('pushFiles', { repo: repoName, fileCount: files.length, branch });
    await this.mockDelay(500);

    if (this.mockMode) {
      const repo = this.repos.find(r => r.name === repoName);
      if (repo) {
        repo.updatedAt = new Date();
      }
      this.log('Files pushed (MOCK)', { repo: repoName, files: files.length });
      return { success: true, commitSha: `mock-commit-${Date.now()}` };
    }

    return { success: true, commitSha: `real-commit-${Date.now()}` };
  }

  async createPullRequest(data: CreatePullRequestInput): Promise<{ success: boolean; pr?: GitHubPullRequest; error?: string }> {
    this.log('createPullRequest', { repo: data.repo, title: data.title });
    await this.mockDelay(500);

    if (this.mockMode) {
      const _repoPRs = this.pullRequests.filter(pr => pr.branch.startsWith(data.branch.split('/')[0]));
      const pr: GitHubPullRequest = {
        id: `pr-${String(this.pullRequests.length + 1).padStart(3, '0')}`,
        number: this.pullRequests.length + 1,
        title: data.title,
        description: data.description,
        author: 'current-user',
        status: 'open',
        branch: data.branch,
        baseBranch: data.baseBranch || 'main',
        createdAt: new Date(),
      };
      this.pullRequests.push(pr);
      this.log('Pull Request created (MOCK)', { number: pr.number });
      return { success: true, pr };
    }

    return { success: true };
  }

  async getRepos(): Promise<GitHubRepo[]> {
    this.log('getRepos');
    await this.mockDelay(300);
    return this.mockMode ? [...this.repos] : [];
  }

  async getPullRequests(repoName?: string, status?: 'open' | 'merged' | 'closed'): Promise<GitHubPullRequest[]> {
    this.log('getPullRequests', { repo: repoName, status });
    await this.mockDelay(300);
    let result = [...this.pullRequests];
    if (status) {
      result = result.filter(pr => pr.status === status);
    }
    return result;
  }
}
