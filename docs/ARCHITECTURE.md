# Systemarchitektur — The Company OS

## 1. Gesamtuebersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Company │ │Agent    │ │Business │ │Product  │  ... 13    │
│  │Overview │ │Registry │ │ Units   │ │Studios  │   Screens  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       └─────────────┴──────────┴─────────────┘                │
│                         │                                     │
│  ┌──────────────┐  ┌────┴────┐  ┌──────────────┐           │
│  │  KPI Bar     │  │ Sidebar │  │   Layout     │           │
│  │ (persistent) │  │(13 nav) │  │ (wrapper)    │           │
│  └──────────────┘  └─────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   models.ts  │  │  mockData.ts │  │   index.ts   │       │
│  │  (15 types)  │  │ (200+ seeds) │  │  (exports)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    EXTERNAL ADAPTERS (Mock)                   │
│  Email │ LinkedIn │ Banking │ Accounting │ GitHub │ Hosting  │
│  Calendar │ Freelancer │ Behörden │ Verträge │ IoT         │
└─────────────────────────────────────────────────────────────┘
```

## 2. Technischer Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| Framework | React | 19 |
| Build Tool | Vite | 7.3.0 |
| Sprache | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.19 |
| UI Library | shadcn/ui | 40+ Komponenten |
| Animation | Framer Motion | latest |
| Charts | Recharts | latest |
| Routing | react-router-dom | HashRouter |
| Icons | Lucide React | latest |
| Utilities | date-fns, clsx, tailwind-merge | latest |

## 3. Komponenten-Architektur

### 3.1 Shared Components (alle Screens)

```
Layout.tsx
├── Sidebar.tsx (240px, collapsible to 64px)
│   ├── Logo ("The Company OS" + "AI-NATIVE")
│   ├── 13 Nav Items (mit Lucide Icons)
│   ├── Collapse Toggle
│   └── Founder Avatar
├── KPIBar.tsx (72px, sticky top)
│   ├── Liquidity
│   ├── Active Projects
│   ├── Pending Approvals
│   ├── Active Agents
│   ├── Open Risks
│   └── Automation Rate
└── {Page Content}
```

### 3.2 Seiten-Hierarchie

Alle 13 Seiten erben Layout.tsx und sind ueber HashRouter erreichbar:

```
HashRouter
├── / → Home.tsx (Company Overview)
├── /departments → DepartmentsPage.tsx
├── /agents → AgentRegistryPage.tsx
├── /business-units → BusinessUnitsPage.tsx
├── /studios → ProductStudiosPage.tsx
├── /approvals → ApprovalQueuePage.tsx
├── /audit-log → AuditLogPage.tsx
├── /risk-center → RiskCenterPage.tsx
├── /finance → FinancePage.tsx
├── /workforce → HumanWorkforcePage.tsx
├── /workflows → WorkflowsPage.tsx
├── /settings → SettingsPage.tsx
└── /kill-switch → KillSwitchPage.tsx
```

## 4. Datenfluss

### 4.1 Unidirektionaler Fluss

```
Mock Data (static) → React Components → UI
```

In RUN-001 ist alles statisch. In RUN-002 wird dies erweitert:

```
Mock Data → State Management → API Layer → UI
                      ↓
              Local Storage / Backend
```

### 4.2 Daten-Entities

```
Agent (22 Eintraege)
  └── Gehoert zu: Department
  └── Hat: allowedTools[], budgetLimit, riskCeiling, kpis[]

Department (14 Eintraege)
  └── Hat: agents[], currentTasks[], kpiSummary[]

BusinessUnit (8 Eintraege)
  └── Hat: requiredAgents[], requiredHumans[], risks[], kpis[]

ProductStudio (3 Eintraege)
  └── Gehoert zu: BusinessUnit
  └── Hat: budget{}, workflowStep, qaStatus, deploymentStatus

Approval (7+ Eintraege)
  └── Hat: type, riskLevel, redLine boolean

AuditLogEntry (22 Eintraege)
  └── Immutable: hash, timestamp

Risk (32 Eintraege)
  └── Berechnet: score = probability * severity
  └── Hat: category, status, owner

Workflow (18 Eintraege)
  └── Hat: steps[], responsibleAgents[], riskScore

HumanExpert (12 Eintraege)
  └── Hat: type, skills[], rating, hourlyRate

FinanceEntry, Invoice, Budget, Incident, SystemSettings
```

## 5. Design-System

### 5.1 Farbpalette

```
Background:  #0A0A0F (primary) → #111118 (secondary) → #1A1A24 (tertiary)
Text:        #F0F0F5 (primary) → #9CA3AF (secondary) → #6B7280 (tertiary)
Accent:      #2DD4BF (teal primary) → #3B82F6 (blue) → #8B5CF6 (purple)
Status:      #10B981 (green) → #F59E0B (yellow) → #EF4444 (red) → #F97316 (orange)
Borders:     #2A2A36 (subtle) → #3A3A4A (default) → #555568 (strong)
```

### 5.2 Typografie

```
Primary:   Inter, system-ui, sans-serif
Monospace: JetBrains Mono, Fira Code, monospace

Display:   32px / weight 700 / -0.03em tracking
H1:        24px / weight 600 / -0.02em
H2:        20px / weight 600 / -0.015em
H3:        16px / weight 600 / -0.01em
Body:      14px / weight 400 / 0
Small:     12px / weight 400 / +0.01em
Tiny:      11px / weight 500 / +0.02em
```

### 5.3 Spacing

```
Card padding:    16px
Card gap:        16px
Card radius:     12px
Button radius:   8px
Page padding:    24px
Container max:   1440px
Sidebar width:   240px (64px collapsed)
KPI bar height:  72px
```

## 6. Animation-System

| Animation | Duration | Easing |
|-----------|----------|--------|
| Micro-interaction | 150ms | ease-out |
| Card hover | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Content reveal | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Stagger children | 400ms | 50ms stagger |
| Modal/drawer | 250ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Chart animation | 800ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Kill switch pulse | 1.5s | infinite |

## 7. Modul-Grenzen

```
┌─────────────────────────────────────────┐
│            UI Layer                      │
│  Pages → Shared Components → shadcn/ui  │
├─────────────────────────────────────────┤
│            Animation Layer               │
│  Framer Motion → Recharts               │
├─────────────────────────────────────────┤
│            Data Layer                    │
│  Models → Mock Data → Seed Data         │
├─────────────────────────────────────────┤
│            External (Mock)               │
│  8 Adapters → No-Op Implementations     │
└─────────────────────────────────────────┘
```

## 8. Lokale Startanleitung

```bash
cd /mnt/agents/output/app

# Installiere Abhaengigkeiten
npm install

# Starte Dev Server (Port 5173)
npm run dev

# Production Build
cd $HOME/app-final-build && npm run build

# Serve Production Build
npx serve dist
```

## 9. Build-Output

```
dist/
├── index.html              (0.4 KB)
└── assets/
    ├── index-[hash].css    (102 KB / 17 KB gzip)
    └── index-[hash].js     (1,280 KB / 324 KB gzip)
```

## 10. Erweiterungspunkte (RUN-002+)

| Erweiterung | Beschreibung |
|-------------|-------------|
| State Management | Zustand oder Redux fuer globale State |
| Backend API | Next.js API Routes oder Supabase Edge Functions |
| Datenbank | PostgreSQL/Supabase statt Mock Data |
| Auth | Supabase Auth oder Clerk |
| WebSocket | Echtzeit-Updates fuer KPIs |
| i18n | Vollstaendige Internationalisierung |
| Tests | Jest + React Testing Library |
| PWA | Service Worker fuer Offline |
