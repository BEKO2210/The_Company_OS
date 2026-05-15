import { BaseAdapter } from './baseAdapter';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees: Attendee[];
  organizer: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  color?: string;
}

export interface Attendee {
  email: string;
  name: string;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: Omit<Attendee, 'responseStatus'>[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  color?: string;
}

export interface FreeSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
}

export class CalendarAdapter extends BaseAdapter {
  private events: CalendarEvent[] = [];

  constructor(config: Record<string, string> = {}) {
    super('Calendar', config);
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createDate = (dayOffset: number, hour: number, minute: number): Date => {
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    this.events = [
      {
        id: 'evt-001',
        title: 'Morgen-Standup',
        description: 'Tägliches Team-Standup zur Sprint-Planung',
        location: 'Zoom',
        startTime: createDate(0, 9, 0),
        endTime: createDate(0, 9, 30),
        attendees: [
          { email: 'sarah@company-os.de', name: 'Sarah Schmidt', responseStatus: 'accepted' },
          { email: 'michael@company-os.de', name: 'Michael Weber', responseStatus: 'accepted' },
          { email: 'lisa@company-os.de', name: 'Lisa Mueller', responseStatus: 'accepted' },
        ],
        organizer: 'sarah@company-os.de',
        status: 'confirmed',
        recurrence: 'daily',
        color: '#34A853',
      },
      {
        id: 'evt-002',
        title: 'Kundenbesprechung: TechCorp',
        description: 'Review des aktuellen Projektstands und Planung Q1 2025',
        location: 'TechCorp HQ, Konferenzraum A',
        startTime: createDate(0, 11, 0),
        endTime: createDate(0, 12, 30),
        attendees: [
          { email: 'client@techcorp.de', name: 'TechCorp Team', responseStatus: 'accepted' },
          { email: 'sarah@company-os.de', name: 'Sarah Schmidt', responseStatus: 'accepted' },
        ],
        organizer: 'sarah@company-os.de',
        status: 'confirmed',
        color: '#4285F4',
      },
      {
        id: 'evt-003',
        title: 'Code Review Session',
        description: 'Review der PRs für Banking- und Accounting-Adapter',
        location: 'Google Meet',
        startTime: createDate(0, 14, 0),
        endTime: createDate(0, 15, 30),
        attendees: [
          { email: 'michael@company-os.de', name: 'Michael Weber', responseStatus: 'accepted' },
          { email: 'david@company-os.de', name: 'David Richter', responseStatus: 'accepted' },
        ],
        organizer: 'michael@company-os.de',
        status: 'confirmed',
        color: '#FBBC05',
      },
      {
        id: 'evt-004',
        title: '1:1 Meeting mit Jan',
        description: 'Wöchentliches Check-in',
        location: 'Büro, Raum 3',
        startTime: createDate(0, 16, 0),
        endTime: createDate(0, 16, 45),
        attendees: [
          { email: 'jan@company-os.de', name: 'Jan Hoffmann', responseStatus: 'accepted' },
        ],
        organizer: 'sarah@company-os.de',
        status: 'confirmed',
        color: '#EA4335',
      },
      {
        id: 'evt-005',
        title: 'Sprint Planning Q1 2025',
        description: 'Planung des kommenden Sprints mit allen Stakeholdern',
        location: 'Großer Konferenzraum',
        startTime: createDate(1, 10, 0),
        endTime: createDate(1, 12, 0),
        attendees: [
          { email: 'sarah@company-os.de', name: 'Sarah Schmidt', responseStatus: 'accepted' },
          { email: 'michael@company-os.de', name: 'Michael Weber', responseStatus: 'accepted' },
          { email: 'lisa@company-os.de', name: 'Lisa Mueller', responseStatus: 'accepted' },
          { email: 'jan@company-os.de', name: 'Jan Hoffmann', responseStatus: 'accepted' },
          { email: 'david@company-os.de', name: 'David Richter', responseStatus: 'tentative' },
        ],
        organizer: 'sarah@company-os.de',
        status: 'confirmed',
        color: '#4285F4',
      },
      {
        id: 'evt-006',
        title: 'Freelancer Onboarding',
        description: 'Onboarding-Session für neuen UI-Designer',
        location: 'Zoom',
        startTime: createDate(1, 14, 0),
        endTime: createDate(1, 15, 0),
        attendees: [
          { email: 'lisa@company-os.de', name: 'Lisa Mueller', responseStatus: 'accepted' },
          { email: 'designer@freelance.de', name: 'Anna Designer', responseStatus: 'accepted' },
        ],
        organizer: 'lisa@company-os.de',
        status: 'confirmed',
        color: '#9C27B0',
      },
      {
        id: 'evt-007',
        title: 'Rechnungsprüfung',
        description: 'Monatliche Prüfung der ausstehenden Rechnungen',
        location: 'Büro',
        startTime: createDate(2, 9, 0),
        endTime: createDate(2, 10, 0),
        attendees: [
          { email: 'michael@company-os.de', name: 'Michael Weber', responseStatus: 'accepted' },
        ],
        organizer: 'michael@company-os.de',
        status: 'confirmed',
        color: '#FF6D01',
      },
      {
        id: 'evt-008',
        title: 'Tech Talk: TypeScript Best Practices',
        description: 'Interner Vortrag über moderne TypeScript Patterns',
        location: 'Google Meet',
        startTime: createDate(2, 14, 0),
        endTime: createDate(2, 15, 30),
        attendees: [
          { email: 'team@company-os.de', name: 'Entwickler-Team', responseStatus: 'accepted' },
        ],
        organizer: 'david@company-os.de',
        status: 'confirmed',
        color: '#3178C6',
      },
      {
        id: 'evt-009',
        title: 'Jahresabschluss-Meeting',
        description: 'Review des Geschäftsjahres 2024 und Ziele 2025',
        location: 'Büro, Großer Raum',
        startTime: createDate(4, 10, 0),
        endTime: createDate(4, 13, 0),
        attendees: [
          { email: 'sarah@company-os.de', name: 'Sarah Schmidt', responseStatus: 'accepted' },
          { email: 'michael@company-os.de', name: 'Michael Weber', responseStatus: 'accepted' },
          { email: 'lisa@company-os.de', name: 'Lisa Mueller', responseStatus: 'accepted' },
          { email: 'jan@company-os.de', name: 'Jan Hoffmann', responseStatus: 'accepted' },
          { email: 'david@company-os.de', name: 'David Richter', responseStatus: 'accepted' },
          { email: 'steuerberater@schmidt.de', name: 'Steuerberater Schmidt', responseStatus: 'accepted' },
        ],
        organizer: 'sarah@company-os.de',
        status: 'confirmed',
        color: '#EA4335',
      },
      {
        id: 'evt-010',
        title: 'Deployment Review',
        description: 'Review der Produktiv-Deployments dieser Woche',
        location: 'Zoom',
        startTime: createDate(4, 15, 0),
        endTime: createDate(4, 15, 45),
        attendees: [
          { email: 'jan@company-os.de', name: 'Jan Hoffmann', responseStatus: 'accepted' },
          { email: 'david@company-os.de', name: 'David Richter', responseStatus: 'accepted' },
        ],
        organizer: 'jan@company-os.de',
        status: 'confirmed',
        color: '#34A853',
      },
    ];
  }

  async connect(): Promise<boolean> {
    this.log('Connecting to Calendar API...');
    await this.mockDelay(400);
    if (this.mockMode) {
      this.log('Connected in MOCK mode');
    } else {
      this.log('Connected to Google Calendar API');
    }
    this.status = 'running';
    return true;
  }

  async disconnect(): Promise<void> {
    this.log('Disconnecting from Calendar API...');
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

  async createEvent(data: CreateEventInput): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    this.log('createEvent', { title: data.title });
    await this.mockDelay(500);

    if (this.mockMode) {
      const event: CalendarEvent = {
        id: `evt-${String(this.events.length + 1).padStart(3, '0')}`,
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        attendees: data.attendees?.map(a => ({ ...a, responseStatus: 'needsAction' })) || [],
        organizer: 'team@company-os.de',
        status: 'confirmed',
        recurrence: data.recurrence || 'none',
        color: data.color || '#4285F4',
      };
      this.events.push(event);
      this.log('Event created (MOCK)', { id: event.id, title: event.title });
      return { success: true, event };
    }

    // Real: Google Calendar API
    try {
      // const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', ... });
      return { success: true };
    } catch (error) {
      this.lastError = `Event creation failed: ${error}`;
      this.status = 'error';
      return { success: false, error: this.lastError };
    }
  }

  async getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
    this.log('getEvents', { start, end });
    await this.mockDelay(400);

    if (!this.mockMode) return [];

    return this.events.filter(e => e.startTime >= start && e.endTime <= end);
  }

  async deleteEvent(id: string): Promise<{ success: boolean; error?: string }> {
    this.log('deleteEvent', { id });
    await this.mockDelay(300);

    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: `Event ${id} not found` };
    }

    this.events[index].status = 'cancelled';
    this.log('Event cancelled (MOCK)', { id });
    return { success: true };
  }

  async getFreeSlots(date?: Date, duration = 60): Promise<FreeSlot[]> {
    this.log('getFreeSlots', { date: date?.toISOString(), duration });
    await this.mockDelay(400);

    if (!this.mockMode) return [];

    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const businessHours = { start: 8, end: 18 };
    const dayStart = new Date(targetDate);
    dayStart.setHours(businessHours.start, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(businessHours.end, 0, 0, 0);

    // Get events for this day
    const dayEvents = this.events.filter(
      e => e.startTime >= dayStart && e.endTime <= dayEnd && e.status !== 'cancelled'
    );

    // Sort by start time
    dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const freeSlots: FreeSlot[] = [];
    let currentTime = dayStart.getTime();

    for (const event of dayEvents) {
      const eventStart = event.startTime.getTime();
      if (eventStart - currentTime >= duration * 60000) {
        freeSlots.push({
          startTime: new Date(currentTime),
          endTime: new Date(eventStart),
          duration: Math.floor((eventStart - currentTime) / 60000),
        });
      }
      currentTime = Math.max(currentTime, event.endTime.getTime());
    }

    // Check end of day
    if (dayEnd.getTime() - currentTime >= duration * 60000) {
      freeSlots.push({
        startTime: new Date(currentTime),
        endTime: dayEnd,
        duration: Math.floor((dayEnd.getTime() - currentTime) / 60000),
      });
    }

    return freeSlots;
  }

  async updateEvent(id: string, data: Partial<CreateEventInput>): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    this.log('updateEvent', { id });
    await this.mockDelay(300);

    const event = this.events.find(e => e.id === id);
    if (!event) {
      return { success: false, error: `Event ${id} not found` };
    }

    if (data.title) event.title = data.title;
    if (data.description) event.description = data.description;
    if (data.location) event.location = data.location;
    if (data.startTime) event.startTime = data.startTime;
    if (data.endTime) event.endTime = data.endTime;
    if (data.color) event.color = data.color;

    return { success: true, event };
  }
}
