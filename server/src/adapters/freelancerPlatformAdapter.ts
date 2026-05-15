import { BaseAdapter } from './baseAdapter';

export interface Freelancer {
  id: string;
  name: string;
  title: string;
  skills: string[];
  hourlyRate: number;
  currency: string;
  rating: number;
  totalReviews: number;
  totalJobs: number;
  location: string;
  availability: 'available' | 'limited' | 'unavailable';
  bio: string;
  languages: string[];
  joinedDate: Date;
  profileUrl: string;
  platform: 'upwork' | 'fiverr' | 'malt' | 'freelancer';
}

export interface Hire {
  id: string;
  freelancerId: string;
  freelancerName: string;
  project: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  hourlyRate: number;
  totalHours: number;
  totalBudget: number;
  currency: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date;
  payment: number;
}

export interface RatingInput {
  freelancerId: string;
  score: number;
  comment?: string;
  categories?: {
    quality?: number;
    communication?: number;
    timeliness?: number;
  };
}

export interface SearchFilters {
  skills?: string[];
  minRate?: number;
  maxRate?: number;
  availability?: 'available' | 'limited' | 'unavailable';
  platform?: 'upwork' | 'fiverr' | 'malt' | 'freelancer';
}

export class FreelancerPlatformAdapter extends BaseAdapter {
  private freelancers: Freelancer[] = [];
  private hires: Hire[] = [];

  constructor(config: Record<string, string> = {}) {
    super('FreelancerPlatform', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.freelancers = [
      {
        id: 'fl-001',
        name: 'Anna Mueller',
        title: 'Senior UX/UI Designer',
        skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems'],
        hourlyRate: 75,
        currency: 'EUR',
        rating: 4.9,
        totalReviews: 47,
        totalJobs: 62,
        location: 'Berlin, Deutschland',
        availability: 'available',
        bio: 'Erfahrene UX/UI Designerin mit Fokus auf SaaS-Produkte und Design Systems. 8+ Jahre Erfahrung in der digitalen Produktgestaltung.',
        languages: ['Deutsch', 'Englisch'],
        joinedDate: new Date('2020-03-15'),
        profileUrl: 'https://upwork.com/freelancers/anna-mueller',
        platform: 'upwork',
      },
      {
        id: 'fl-002',
        name: 'Max Mustermann',
        title: 'Full-Stack Developer',
        skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'],
        hourlyRate: 85,
        currency: 'EUR',
        rating: 4.8,
        totalReviews: 35,
        totalJobs: 48,
        location: 'München, Deutschland',
        availability: 'limited',
        bio: 'Full-Stack Entwickler mit Schwerpunkt auf moderner Webentwicklung. Spezialisiert auf skalierbare Node.js-Backends und React-Frontends.',
        languages: ['Deutsch', 'Englisch'],
        joinedDate: new Date('2019-08-01'),
        profileUrl: 'https://upwork.com/freelancers/max-mustermann',
        platform: 'upwork',
      },
      {
        id: 'fl-003',
        name: 'Sophie Chen',
        title: 'Mobile App Developer',
        skills: ['React Native', 'iOS', 'Android', 'Flutter', 'Firebase'],
        hourlyRate: 80,
        currency: 'EUR',
        rating: 4.9,
        totalReviews: 29,
        totalJobs: 35,
        location: 'Remote, Asien',
        availability: 'available',
        bio: 'Mobile Entwicklerin mit Expertise in React Native und Flutter. Über 40 erfolgreich abgeschlossene App-Projekte für internationale Kunden.',
        languages: ['Englisch', 'Chinesisch'],
        joinedDate: new Date('2021-01-20'),
        profileUrl: 'https://fiverr.com/sophie-chen',
        platform: 'fiverr',
      },
      {
        id: 'fl-004',
        name: 'Lucas Weber',
        title: 'DevOps Engineer',
        skills: ['Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Azure'],
        hourlyRate: 95,
        currency: 'EUR',
        rating: 4.7,
        totalReviews: 22,
        totalJobs: 30,
        location: 'Hamburg, Deutschland',
        availability: 'available',
        bio: 'DevOps-Experte mit tiefem Wissen in Cloud-Infrastruktur und Automatisierung. Zertifizierter Kubernetes Administrator und Terraform-Experte.',
        languages: ['Deutsch', 'Englisch'],
        joinedDate: new Date('2020-06-10'),
        profileUrl: 'https://malt.com/lucas-weber',
        platform: 'malt',
      },
      {
        id: 'fl-005',
        name: 'Emily Johnson',
        title: 'Content Strategist & Copywriter',
        skills: ['Content Strategy', 'Copywriting', 'SEO', 'Brand Voice', 'Social Media'],
        hourlyRate: 65,
        currency: 'EUR',
        rating: 4.8,
        totalReviews: 53,
        totalJobs: 71,
        location: 'London, UK',
        availability: 'limited',
        bio: 'Kreative Content-Strategin mit Hintergrund in Tech-Marketing. Spezialisiert auf B2B-SaaS und Startup-Branding.',
        languages: ['Englisch'],
        joinedDate: new Date('2021-05-15'),
        profileUrl: 'https://upwork.com/freelancers/emily-johnson',
        platform: 'upwork',
      },
      {
        id: 'fl-006',
        name: 'Tobias Klein',
        title: 'Backend Developer',
        skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Redis'],
        hourlyRate: 78,
        currency: 'EUR',
        rating: 4.6,
        totalReviews: 18,
        totalJobs: 25,
        location: 'Köln, Deutschland',
        availability: 'available',
        bio: 'Backend-Fokussierter Entwickler mit Passion für saubere APIs und skalierbare Systemarchitekturen.',
        languages: ['Deutsch', 'Englisch'],
        joinedDate: new Date('2022-02-01'),
        profileUrl: 'https://freelancer.com/tobias-klein',
        platform: 'freelancer',
      },
      {
        id: 'fl-007',
        name: 'Maria Garcia',
        title: 'Data Analyst & Visualization',
        skills: ['Python', 'SQL', 'Tableau', 'Power BI', 'Machine Learning'],
        hourlyRate: 70,
        currency: 'EUR',
        rating: 4.9,
        totalReviews: 31,
        totalJobs: 38,
        location: 'Barcelona, Spanien',
        availability: 'available',
        bio: 'Datenanalystin mit Expertise in Business Intelligence und interaktiven Dashboards. Verwandelt komplexe Daten in handlungsrelevante Erkenntnisse.',
        languages: ['Spanisch', 'Englisch', 'Deutsch'],
        joinedDate: new Date('2021-09-10'),
        profileUrl: 'https://malt.com/maria-garcia',
        platform: 'malt',
      },
      {
        id: 'fl-008',
        name: 'Felix Braun',
        title: 'QA Engineer & Test Automation',
        skills: ['Selenium', 'Cypress', 'Jest', 'CI/CD', 'API Testing'],
        hourlyRate: 68,
        currency: 'EUR',
        rating: 4.7,
        totalReviews: 24,
        totalJobs: 32,
        location: 'Stuttgart, Deutschland',
        availability: 'available',
        bio: 'Qualitätsbewusster Test-Ingenieur mit Fokus auf automatisierte Teststrategien und CI/CD-Integration.',
        languages: ['Deutsch', 'Englisch'],
        joinedDate: new Date('2021-03-20'),
        profileUrl: 'https://fiverr.com/felix-braun',
        platform: 'fiverr',
      },
    ];

    this.hires = [
      {
        id: 'hire-001',
        freelancerId: 'fl-001',
        freelancerName: 'Anna Mueller',
        project: 'Company OS Dashboard Redesign',
        description: 'Komplettes Redesign des Dashboards mit Fokus auf UX-Verbesserungen und neues Design System',
        status: 'active',
        startDate: new Date('2024-12-01'),
        hourlyRate: 75,
        totalHours: 45,
        totalBudget: 6000,
        currency: 'EUR',
        milestones: [
          { id: 'ms-001', title: 'UX Research & Wireframes', status: 'completed', dueDate: new Date('2024-12-10'), payment: 1500 },
          { id: 'ms-002', title: 'High-Fidelity Designs', status: 'in_progress', dueDate: new Date('2024-12-22'), payment: 2500 },
          { id: 'ms-003', title: 'Design System & Handoff', status: 'pending', dueDate: new Date('2025-01-10'), payment: 2000 },
        ],
      },
      {
        id: 'hire-002',
        freelancerId: 'fl-002',
        freelancerName: 'Max Mustermann',
        project: 'API Gateway & Microservices',
        description: 'Entwicklung des API-Gateways und Backend-Microservices für die Company OS Plattform',
        status: 'active',
        startDate: new Date('2024-12-05'),
        hourlyRate: 85,
        totalHours: 32,
        totalBudget: 8000,
        currency: 'EUR',
        milestones: [
          { id: 'ms-004', title: 'Architektur & Setup', status: 'completed', dueDate: new Date('2024-12-12'), payment: 2000 },
          { id: 'ms-005', title: 'Core Services Implementierung', status: 'in_progress', dueDate: new Date('2025-01-15'), payment: 4000 },
          { id: 'ms-006', title: 'Testing & Deployment', status: 'pending', dueDate: new Date('2025-01-31'), payment: 2000 },
        ],
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Freelancer Platform API...');
    await this.mockDelay(500);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      const platform = this.config.PLATFORM || 'upwork';
      this.log(`Connected to ${platform} API`);
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Freelancer Platform API...');
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

  async searchFreelancers(skills?: string[], filters?: SearchFilters): Promise<Freelancer[]> {
    this.log('searchFreelancers', { skills, filters });
    await this.mockDelay(600);

    if (!this.mockMode) return [];

    let result = [...this.freelancers];

    if (skills && skills.length > 0) {
      result = result.filter(fl => skills.some(skill => fl.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))));
    }

    if (filters?.minRate) {
      result = result.filter(fl => fl.hourlyRate >= filters.minRate!);
    }
    if (filters?.maxRate) {
      result = result.filter(fl => fl.hourlyRate <= filters.maxRate!);
    }
    if (filters?.availability) {
      result = result.filter(fl => fl.availability === filters.availability);
    }
    if (filters?.platform) {
      result = result.filter(fl => fl.platform === filters.platform);
    }

    return result;
  }

  async hire(freelancerId: string, project: string, description?: string, budget?: number): Promise<{ success: boolean; hire?: Hire; error?: string }> {
    this.log('hire', { freelancerId, project });
    await this.mockDelay(500);

    if (this.mockMode) {
      const freelancer = this.freelancers.find(fl => fl.id === freelancerId);
      if (!freelancer) {
        return { success: false, error: `Freelancer ${freelancerId} not found` };
      }

      const hire: Hire = {
        id: `hire-${String(this.hires.length + 1).padStart(3, '0')}`,
        freelancerId,
        freelancerName: freelancer.name,
        project,
        description: description || '',
        status: 'active',
        startDate: new Date(),
        hourlyRate: freelancer.hourlyRate,
        totalHours: 0,
        totalBudget: budget || 5000,
        currency: freelancer.currency,
        milestones: [],
      };

      this.hires.push(hire);
      this.log('Freelancer hired (MOCK)', { hireId: hire.id, freelancer: freelancer.name });
      return { success: true, hire };
    }

    return { success: true };
  }

  async getHires(status?: 'active' | 'completed' | 'cancelled'): Promise<Hire[]> {
    this.log('getHires', { status });
    await this.mockDelay(400);

    let result = this.mockMode ? [...this.hires] : [];
    if (status) {
      result = result.filter(h => h.status === status);
    }
    return result;
  }

  async rate(input: RatingInput): Promise<{ success: boolean; error?: string }> {
    this.log('rate', { freelancerId: input.freelancerId, score: input.score });
    await this.mockDelay(400);

    const freelancer = this.freelancers.find(fl => fl.id === input.freelancerId);
    if (!freelancer) {
      return { success: false, error: `Freelancer ${input.freelancerId} not found` };
    }

    // Update freelancer rating
    const totalScore = freelancer.rating * freelancer.totalReviews + input.score;
    freelancer.totalReviews += 1;
    freelancer.rating = totalScore / freelancer.totalReviews;

    this.log('Rating submitted (MOCK)', { freelancer: freelancer.name, newRating: freelancer.rating.toFixed(2) });
    return { success: true };
  }

  async getFreelancerProfile(id: string): Promise<Freelancer | null> {
    this.log('getFreelancerProfile', { id });
    await this.mockDelay(300);
    return this.freelancers.find(fl => fl.id === id) || null;
  }
}
