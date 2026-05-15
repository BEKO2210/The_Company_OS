import { BaseAdapter } from './baseAdapter';

export interface LinkedInPost {
  id: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
}

export interface LinkedInProfile {
  id: string;
  name: string;
  headline: string;
  connections: number;
  followers: number;
  industry: string;
  location: string;
}

export interface LinkedInConnection {
  id: string;
  name: string;
  headline: string;
  connectedSince: Date;
  profileUrl: string;
}

export interface LinkedInMessage {
  id: string;
  to: string;
  content: string;
  sentAt: Date;
  status: 'sent' | 'delivered' | 'read';
}

export class LinkedInAdapter extends BaseAdapter {
  private posts: LinkedInPost[] = [];
  private profile: LinkedInProfile;
  private connections: LinkedInConnection[] = [];
  private messages: LinkedInMessage[] = [];

  constructor(config: Record<string, string> = {}) {
    super('LinkedIn', config);
    this.initializeMockData();
    this.profile = this.createMockProfile();
  }

  private createMockProfile(): LinkedInProfile {
    return {
      id: 'linkedin-profile-001',
      name: 'The Company OS',
      headline: 'AI-Powered Business Operating System | Automation | Efficiency',
      connections: 150,
      followers: 1250,
      industry: 'Software Development',
      location: 'Berlin, Germany',
    };
  }

  private initializeMockData(): void {
    this.posts = [
      {
        id: 'post-001',
        content: '🚀 Excited to announce the launch of The Company OS v2.0! Now with AI-powered workflow automation, integrated accounting, and seamless freelancer management. Transform your business operations today! #BusinessAutomation #AI #Startup',
        author: 'The Company OS',
        likes: 89,
        comments: 24,
        shares: 15,
        createdAt: new Date('2024-12-10T08:00:00'),
      },
      {
        id: 'post-002',
        content: '💡 Did you know? Companies using automated business operating systems save an average of 15 hours per week on administrative tasks. That\'s time better spent on growth and innovation. What would you do with 15 extra hours? #Productivity #BusinessGrowth',
        author: 'The Company OS',
        likes: 156,
        comments: 42,
        shares: 28,
        createdAt: new Date('2024-12-14T10:30:00'),
      },
      {
        id: 'post-003',
        content: '🤝 New integration alert: The Company OS now connects directly with LinkedIn, Upwork, and Fiverr. Manage your freelancer relationships, track projects, and handle payments—all from one dashboard. #Freelance #Integration #RemoteWork',
        author: 'The Company OS',
        likes: 234,
        comments: 67,
        shares: 45,
        createdAt: new Date('2024-12-18T14:00:00'),
      },
    ];

    this.connections = [
      { id: 'conn-001', name: 'Sarah Schmidt', headline: 'CTO at TechStart Berlin | Full-Stack Developer', connectedSince: new Date('2024-01-15'), profileUrl: 'https://linkedin.com/in/sarah-schmidt' },
      { id: 'conn-002', name: 'Michael Weber', headline: 'Product Manager | SaaS | Agile', connectedSince: new Date('2024-02-20'), profileUrl: 'https://linkedin.com/in/michael-weber' },
      { id: 'conn-003', name: 'Lisa Mueller', headline: 'UX/UI Designer | Design Systems | Figma Expert', connectedSince: new Date('2024-03-10'), profileUrl: 'https://linkedin.com/in/lisa-mueller' },
      { id: 'conn-004', name: 'Jan Hoffmann', headline: 'DevOps Engineer | Cloud Architecture | AWS', connectedSince: new Date('2024-04-05'), profileUrl: 'https://linkedin.com/in/jan-hoffmann' },
      { id: 'conn-005', name: 'Anna Krause', headline: 'Marketing Director | B2B SaaS | Growth', connectedSince: new Date('2024-05-12'), profileUrl: 'https://linkedin.com/in/anna-krause' },
      { id: 'conn-006', name: 'David Richter', headline: 'Backend Engineer | Node.js | PostgreSQL', connectedSince: new Date('2024-06-18'), profileUrl: 'https://linkedin.com/in/david-richter' },
      { id: 'conn-007', name: 'Laura Becker', headline: 'Data Scientist | ML | Python | TensorFlow', connectedSince: new Date('2024-07-22'), profileUrl: 'https://linkedin.com/in/laura-becker' },
      { id: 'conn-008', name: 'Thomas Klein', headline: 'Freelance Developer | React | TypeScript', connectedSince: new Date('2024-08-30'), profileUrl: 'https://linkedin.com/in/thomas-klein' },
      { id: 'conn-009', name: 'Sophie Neumann', headline: 'Business Analyst | Process Optimization', connectedSince: new Date('2024-09-14'), profileUrl: 'https://linkedin.com/in/sophie-neumann' },
      { id: 'conn-010', name: 'Felix Braun', headline: 'Software Architect | Microservices | Kafka', connectedSince: new Date('2024-10-01'), profileUrl: 'https://linkedin.com/in/felix-braun' },
    ];

    // Add 140 more mock connections to reach 150
    for (let i = 11; i <= 150; i++) {
      this.connections.push({
        id: `conn-${String(i).padStart(3, '0')}`,
        name: `Connection ${i}`,
        headline: `Professional at Company ${i}`,
        connectedSince: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        profileUrl: `https://linkedin.com/in/connection-${i}`,
      });
    }
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to LinkedIn API...');
    await this.mockDelay(500);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      this.log('Connected to LinkedIn REST API (OAuth 2.0)');
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from LinkedIn API...');
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

  async post(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    this.log('Creating LinkedIn post...');
    await this.mockDelay(600);

    if (this.mockMode) {
      const postId = `mock-post-${Date.now()}`;
      this.posts.unshift({
        id: postId,
        content,
        author: 'The Company OS',
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date(),
      });
      this.log('Post created (MOCK)', { postId });
      return { success: true, postId };
    }

    // Real mode: LinkedIn API
    try {
      // const response = await fetch('https://api.linkedin.com/v2/ugcPosts', { ... });
      return { success: true, postId: `real-post-${Date.now()}` };
    } catch (error) {
      this.lastError = `LinkedIn post failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async getProfile(): Promise<LinkedInProfile> {
    this.log('getProfile');
    await this.mockDelay(300);
    return { ...this.profile, connections: this.connections.length };
  }

  async sendMessage(to: string, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.log('sendMessage', { to });
    await this.mockDelay(400);

    if (this.mockMode) {
      const messageId = `mock-msg-${Date.now()}`;
      this.messages.push({
        id: messageId,
        to,
        content,
        sentAt: new Date(),
        status: 'sent',
      });
      return { success: true, messageId };
    }

    return { success: true, messageId: `real-msg-${Date.now()}` };
  }

  async getConnections(limit?: number): Promise<LinkedInConnection[]> {
    this.log('getConnections', { limit });
    await this.mockDelay(400);
    const result = this.mockMode ? [...this.connections] : [];
    return limit ? result.slice(0, limit) : result;
  }

  async getPostEngagement(postId: string): Promise<{ likes: number; comments: number; shares: number } | null> {
    this.log('getPostEngagement', { postId });
    await this.mockDelay(300);
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;
    return { likes: post.likes, comments: post.comments, shares: post.shares };
  }
}
