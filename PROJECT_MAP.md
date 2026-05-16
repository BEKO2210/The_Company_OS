# The Company OS — Project Map

> Lebendiges Referenz-Dokument. Wird beim jeder größeren Strukturänderung aktualisiert. Ziel: jeder nächste Run hat sofort den vollen Überblick, ohne den ganzen Codebase neu zu lesen.

## 1. Tech-Stack & Top-Level

- **Frontend**: React 19 + Vite 7 + TypeScript 5.9 (Strict), TailwindCSS 3.4, Framer Motion 12, Recharts 2.15, Radix UI primitives via `src/components/ui/*` (shadcn-Style), React Router 7 (HashRouter — wichtig, alle Links müssen `#/path` sein), lucide-react Icons.
- **Backend**: Node + Express 4 + better-sqlite3 (`server/`). Eigenes `package.json`, eigenes `tsconfig.json`. SQLite DB-Datei seeded automatisch beim ersten Start, wenn leer (`server/src/server.ts:11`).
- **PWA**: Manifest + Service Worker + Push (`src/pwa/*`, `public/sw.js` falls vorhanden). Init via `src/main.tsx:13` → `initPWA()`.
- **Tests**: jest + ts-jest + supertest (nur serverseitig genutzt, frontend hat aktuell keine Tests).
- **Paket-Aliase**: `@/` → `src/` (siehe `tsconfig.app.json` + `vite.config.ts`).
- **Dev/Preview-Ports**: Vite dev = 5173 default, Preview = 4173. Server = 3001 (env `PORT`).
- **Build-Skripte**: `npm run dev` (Vite), `npm run build` (`tsc -b && vite build`), `npm run preview`, `npm run lint`.

## 2. Verzeichnisstruktur

```
src/
  App.tsx                  HashRouter + Layout + Routes
  main.tsx                 createRoot + initPWA()
  index.css                Tailwind base + custom .data-card / .badge-* / .status-dot-*
  ai/                      Reine TS-Logik (keine React-Imports)
    index.ts               Barrel-Export
    types.ts               Insight, Recommendation, Decision, Prediction, ...
    nlqEngine.ts           Natural-Language-Query Parser + Handler
    decisionSupport.ts     analyzeApproval / getPrioritizedApprovals
    summarizer.ts          generateDailyReport / WeeklySummary
    predictor.ts           predictLiquidity / BreakEven / RiskEscalation / AgentOverload
    recommendation.ts      getTopRecommendations / getRecommendations
  components/
    Layout.tsx             Wrapt alles. Desktop: Sidebar (links) + KPIBar (oben). Mobile: TopBar + BottomNav.
    Sidebar.tsx            Hardcoded navItems (13 Routen), Founder-Footer ("F", "Founder", "CEO") — placeholder.
    KPIBar.tsx             6 KPI-Karten. Aktuell nullt (Empty-Template-Pass).
    ai/                    Wrapper-Komponenten um src/ai/* — z.B. AIInsights (Home), AIQueryPanel (Sidebar), PredictionChart (Finance), SummaryPanel, DecisionCard.
    mobile/                ApprovalCard, MobileDashboard, MobileNav (mit Badges), NotificationBadge, QuickActions.
    ui/                    50+ shadcn-Komponenten (Button, Dialog, Input, Tabs, Toast, ...). Generiert via components.json.
  data/
    models.ts              Alle TypeScript-Interfaces (Agent, Department, BusinessUnit, ProductStudio, Approval, AuditLogEntry, Risk, Workflow, HumanExpert, FinanceEntry, Invoice, Budget, Incident, SystemSettings, WorkflowStep).
    mockData.ts            Aktuell leer (nur Typen-Exports mit []). Früher 943 Zeilen Seed.
    index.ts               Re-export von beidem.
  hooks/use-mobile.ts      useIsMobile() (< 768px).
  lib/utils.ts             cn() (clsx + tailwind-merge).
  pages/                   Eine Datei pro Route — alle Pages siehe Abschnitt 4.
  pwa/
    index.ts               initPWA(), injectPWALinks, registerSW, requestNotificationPermission, subscribeToPush, checkForUpdates, activateUpdate
    notifications.ts       Browser-Notification-API Wrapper
    offlineStorage.ts      IndexedDB für Approvals/Risks/Agents/AuditLogEntry
    sync.ts                Background-Sync queue
server/
  src/
    server.ts              Boot, isDbEmpty → seed, graceful shutdown
    app.ts                 createApp(): cors, security headers, sanitize, route mounts, error handlers
    db/connection.ts       better-sqlite3 db handle + isDbEmpty()
    db/schema.sql          DDL (single-tenant)
    db/schema-tenant.sql   DDL (multi-tenant variant)
    db/seed.ts             Initial-Seed-Skript
    routes/                17 Route-Module: auth, agents, departments, businessUnits, productStudios, approvals, auditLog, risks, workflows, finance, settings, killSwitch, dashboard, workforce, adapters, ai, tenant
    services/              7 Service-Module (agentService, approvalService, riskService, workflowService, killSwitchService, auditService, adapterService)
    middleware/            audit, auth, rateLimit, rbac, security, errorHandler
    killSwitch/            Kill-switch Logik (`hardKill`, redLine override etc.)
    workflowEngine/        Workflow-Step-Runner
    adapters/              ?  (LLM-Adapter — Anthropic/OpenAI?)
    ai/                    Server-seitige AI-Hooks
    tenant/                Multi-tenant scaffolding
    utils/                 ...
  data/                    Eigene Mock-Daten serverseitig (mockData.ts) — derzeit NICHT geleert.
public/                    Statische Assets + PWA-Icons + manifest.webmanifest + sw.js (falls vorhanden)
docs/                      Markdown-Doku (nicht überprüft hier)
PROJECT_MAP.md             dieses Dokument
README.md
```

## 3. Design-Token & UI-Konventionen

### Farb-Token (`tailwind.config.js:8`)

- **Hintergründe** (von dunkel → hell): `bg-primary` `#0A0A0F` / `bg-secondary` `#111118` / `bg-tertiary` `#1A1A24` / `bg-elevated` `#22222E`.
- **Borders**: `border-subtle` `#2A2A36` / `border-default` `#3A3A4A` / `border-strong` `#555568`.
- **Text** (von hell → matt): `text-primary` `#F0F0F5` / `text-secondary` `#9CA3AF` / `text-tertiary` `#6B7280` / `text-muted` `#4B5563`.
- **Accent**: `accent-teal` `#2DD4BF` (Primary CTA), `accent-blue` `#3B82F6`, `accent-purple` `#8B5CF6`.
- **Status**: `status-green` `#10B981`, `status-yellow` `#F59E0B`, `status-red` `#EF4444`, `status-orange` `#F97316`. Jeder mit `-glow`-Variante (33-Alpha).
- **Chart**: `chart-primary/secondary/tertiary/quaternary/grid/zero`.
- **shadcn HSL-Vars**: `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card`, `border`, `input`, `ring`, `--radius: 0.625rem`. Werden in `src/components/ui/*` genutzt — wichtig: **nicht** mit Tailwind-Named-Token mischen, sonst doppelte Design-Systeme.

### Typografie

- `font-sans` = Inter (300/400/500/600/700) via Google Fonts in `src/index.css:1`.
- `font-mono` / `font-mono-data` = JetBrains Mono (400/500/600) — wird in KPI-Werten, Finanz-Zahlen, Timestamps benutzt.
- Konventionen aus Pages: Headlines `text-[2rem] font-bold tracking-tight`, Card-Titles `text-sm font-semibold tracking-tight`, KPI-Werte `font-mono-data text-2xl font-medium`, Labels `text-[11px] font-semibold uppercase tracking-wider text-text-tertiary`.

### Spacing & Layout-Token

- Custom Spacing: `space-1..12` (4..48px), `sidebar` 240px, `sidebar-collapsed` 64px, `kpi-bar` 72px.
- `maxWidth.container` = 1440px (`max-w-container mx-auto`).
- Border-Radius: `card` 12px, `button` 8px, `input` 8px.
- Shadows: `card`, `glow-teal/green/red/yellow`, `kill`.

### Wiederverwendbare Klassen (`src/index.css`)

- `.data-card`: `bg #111118 / border #2A2A36 / radius 12 / padding 16`, hover `border #3A3A4A`. **Der** Standard-Container.
- `.status-dot` + `-green/-yellow/-red/-gray` (8×8 Kreis mit glow).
- `.badge-green/-yellow/-red/-orange/-gray/-blue/-teal` (immer 22-Alpha bg + Vollfarb text).
- `.font-mono-data` Utility.

### UI-Patterns

- Animation: Framer Motion, ease meist `[0.16, 1, 0.3, 1]`; Stagger `0.05–0.08` Delay.
- Recharts: dark Tooltips (`bg #1A1A24 / border #3A3A4A / radius 8 / font 12 / color #F0F0F5`), Grid `stroke #1A1A24 strokeDasharray 3 3 vertical={false}`.
- Buttons: meistens `flex items-center gap-2 px-3 py-2 rounded-button border border-border-default text-sm` für Sekundär; CTAs `bg-accent-teal text-bg-primary`.

## 4. Routen + Pages (Frontend)

Alle Routes in `src/App.tsx:21` (HashRouter, also `#/<path>`). Layout wraps alles und liefert Sidebar + KPIBar (Desktop) bzw. TopBar+BottomNav (Mobile).

| Pfad | Komponente | Datei | Imports aus `@/data/mockData` |
|---|---|---|---|
| `/` | `Home` | `src/pages/Home.tsx` | departments, approvals, auditLog, liquidityTrend, automationTrend |
| `/departments` | `DepartmentsPage` | `src/pages/DepartmentsPage.tsx` (497 LOC) | departments, agents |
| `/agents` | `AgentRegistryPage` | `src/pages/AgentRegistryPage.tsx` (870 LOC) | agents |
| `/business-units` | `BusinessUnitsPage` | `src/pages/BusinessUnitsPage.tsx` (610) | businessUnits |
| `/studios` | `ProductStudiosPage` | `src/pages/ProductStudiosPage.tsx` (795) | productStudios |
| `/approvals` | `ApprovalQueuePage` | `src/pages/ApprovalQueuePage.tsx` (1045) | approvals (initialApprovals) |
| `/audit-log` | `AuditLogPage` | `src/pages/AuditLogPage.tsx` (647) | auditLog |
| `/risk-center` | `RiskCenterPage` | `src/pages/RiskCenterPage.tsx` (869) | risks, incidents |
| `/finance` | `FinancePage` | `src/pages/FinancePage.tsx` (587 — nach Cleanup) | financeEntries, invoices, budgets, liquidityTrend |
| `/workforce` | `HumanWorkforcePage` | `src/pages/HumanWorkforcePage.tsx` (616) | humanExperts |
| `/workflows` | `WorkflowsPage` | `src/pages/WorkflowsPage.tsx` (591) | workflows |
| `/settings` | `SettingsPage` | `src/pages/SettingsPage.tsx` (676) | systemSettings |
| `/kill-switch` | `KillSwitchPage` | `src/pages/KillSwitchPage.tsx` (960) | (nutzt eigene States) |

**Wichtig**: Die meisten Pages bauen mit `useState(initialFromMockData)`. Wenn `mockData` leer ist, sind die Pages leer — also das Empty-Template-Verhalten ist „automatisch" für die Listen-Pages, aber **viele Cards/Headers haben hardcoded Zahlen/Strings** (Pass-1 abgeschlossen für `Home`, `KPIBar`, `AgentRegistry` (eine Badge), `FinancePage`. **Noch offen**: `DepartmentsPage`, `BusinessUnitsPage`, `ProductStudiosPage`, `ApprovalQueuePage`, `AuditLogPage`, `RiskCenterPage`, `HumanWorkforcePage`, `WorkflowsPage`, `SettingsPage`, `KillSwitchPage`).

**Sprache**: Alle UI-Strings sind **Deutsch** (inkonsistente Umlaute — viele wurden zu ASCII normalisiert: „Liquiditat", „uberfallig", „Qualitat"). Beim Hinzufügen neuer Strings konsistent ASCII benutzen oder einmalig auf richtige Umlaute migrieren.

## 5. Datenmodell (`src/data/models.ts`)

Wichtige Felder pro Entity (nur Pflichtfelder + Status-Enums):

- `Agent { id, role, name, department, allowedTools[], budgetLimit, riskCeiling, autonomyLevel, status, version, ownerHuman }` (Status: `active|paused|quarantine|offline`)
- `Department { id, name, status, leadAgent, agents[], currentTasks[], kpiSummary[] }`
- `BusinessUnit { id, code, name, status, phase, products[], revenueModel, risks[], kpis[], dependencies[] }`
- `ProductStudio { id, name, businessUnit, status, budget{total,spent,remaining}, qaStatus, deploymentStatus, completion }`
- `Approval { id, type, riskLevel, amount?, status, createdAt, redLine }` (Status: `pending|approved|rejected|escalated`)
- `AuditLogEntry { id, timestamp, agent, action, riskScore, hash }`
- `Risk { id:number, name, category, probability, severity, score, status }`
- `Workflow { id, name, steps[WorkflowStep], requiresApproval, status, successRate, avgDuration }`
- `HumanExpert { id, type, skills[], rating, hourlyRate, status, onboardingProgress }`
- `Invoice { id, studio, amount, status, dueDate, blocked }`
- `Budget { id, name, limit, spent, remaining, warningAt, criticalAt }`
- `Incident { id, severity:1-4, status, detectedAt, affectedAgents[], mitigation }`
- `SystemSettings { killSwitchStatus, modelPolicy[], toolPermissions[], budgetLimits[] }`

## 6. AI-Subsystem (`src/ai/`)

Reine TypeScript-Logik (keine HTTP-Calls). Bekommt mockData reingereicht und erzeugt Insights/Recommendations.

- `nlqEngine.ts`: `parseQuery(string)`, `processQuery(query, ctx)`, `generateAnswer(...)`, History-API (`getQueryHistory`, `addToHistory`, `clearHistory`), `EXAMPLE_QUERIES` Konstante. Wird in `AIQueryPanel` (Sidebar) genutzt.
- `decisionSupport.ts`: `analyzeApproval(approval, ctx)`, `analyzeApprovals(list)`, `getPrioritizedApprovals(list)`. Default-Daten Imports aus mockData werden überschrieben sobald echte Daten reinkommen.
- `summarizer.ts`: `generateDailyReport()`, `generateWeeklySummary()`, `summarizeAuditLog(entries)`.
- `predictor.ts`: `predictLiquidity(data?)`, `predictBreakEven`, `predictRiskEscalation`, `predictAgentOverload`. Fallback auf `liquidityTrend` (jetzt leer → muss leere Resultate sauber zurückgeben).
- `recommendation.ts`: `getRecommendations(ctx)`, `getTopRecommendations(n)`. Genutzt in Home `AIInsights`.
- `types.ts`: `Insight`, `Recommendation`, `Decision`, `Prediction`, etc.

**Wichtig nach Empty-Pass**: Wenn AI-Funktionen leere Arrays bekommen, müssen sie sauber „keine Daten" zurückgeben (nicht crashen, nicht halluzinieren). UI in `AIInsights` zeigt schon ein „Alles im grünen Bereich" Empty-State.

## 7. Server-API (kurz)

Mount-Pfade alle unter `/api/...` (Konvention, bestätigen in `app.ts`). Routes 1:1 zu Frontend-Pages:

```
/api/auth          login/refresh/logout (JWT)
/api/agents        CRUD
/api/departments   CRUD
/api/businessUnits CRUD
/api/productStudios CRUD
/api/approvals     CRUD + approve/reject
/api/auditLog      query
/api/risks         CRUD
/api/workflows     CRUD + run
/api/finance       summary, invoices, budgets
/api/settings      get/update SystemSettings
/api/killSwitch    arm/disarm/trigger
/api/dashboard     aggregated KPIs
/api/workforce     HumanExperts CRUD
/api/adapters      LLM-Adapter config
/api/ai            server-side AI proxy
/api/tenant        multi-tenant scaffolding
```

Recent Commits (siehe `git log`) zeigen Server-Fixes:
- `933484e` derive risk score from probability*severity wenn default 0
- `de5d357` friendlier red-line message
- `82ff89a` future-iat token check + workflow-instance routes
- `576330b` enforce min(8) password + seed in db tests
- `9d36453` gitignore *.log + .claude/

**Frontend ↔ Backend**: Aktuell unklar ob das Frontend tatsächlich an die API redet (keine fetch-Calls im src/ während der Empty-Pass-Inspektion gesehen). Vermutung: Frontend ist noch standalone mit mockData. → Bei Wizard-Implementierung: erst lokal (localStorage / React-State), später Server-Anbindung.

## 8. Aktueller Status (Empty-Template-Pass)

✅ **Erledigt** (commits cb345b4, 7dbb9ed, 0d82511):
- `src/data/mockData.ts` — alle Exports auf `[]` / minimal `systemSettings`.
- `src/components/KPIBar.tsx` — alle 6 KPIs auf 0/„Keine Daten".
- `src/pages/Home.tsx` — hardcoded projects, activeAgents, risks-Liste, driver-bars geleert; Gauge=0; EUR 12.450 → 0; „alle 7/22/14" → dynamisch.
- `src/pages/AgentRegistryPage.tsx:858` — „2 Human-Approval" → 0.
- `src/pages/FinancePage.tsx` — Liquiditat/Monatsbudget/Rechnungen/Break-Even-Cards, Donut, Projection, Cost-Tabelle, BarChart alle 0.

🔲 **Noch offen** (hardcoded Mock-Werte mutmaßlich vorhanden):
- `DepartmentsPage`, `BusinessUnitsPage`, `ProductStudiosPage`, `ApprovalQueuePage`, `AuditLogPage`, `RiskCenterPage`, `HumanWorkforcePage`, `WorkflowsPage`, `SettingsPage`, `KillSwitchPage` — pro Page screenshotten und auditieren.
- `MobileDashboard.tsx` (hat eigenen KPI-Block?).
- Sidebar `Founder/CEO` Placeholder — soll evtl. vom Wizard gefüllt werden.
- Server-seitige `server/src/data/mockData.ts` + `seed.ts` — separat halten (Server kann eigene Demo-Daten haben, Frontend leer).

🔲 **Nicht angerührt** und Vorsicht:
- `src/components/ai/*` — wenn mockData leer ist, dürfen die Komponenten keine Daten erfinden. Eventuell defensive Checks ergänzen.
- AI-Funktionen in `src/ai/*` müssen leere Inputs überleben (kein div/0 etc.).

## 9. Konventionen & Gotchas für künftige Runs

- **HashRouter**: Links müssen `#/...` enthalten wenn aus dem Browser direkt angesteuert; in Code Component-`<Link to="/...">` reicht.
- **Read-before-Edit Hook**: Vor jedem Edit/Write Read erforderlich (auch wenn das Tool den Edit zulässt — Warnung kann ignoriert werden, aber lieber sauber Read first).
- **PowerShell-Default-Shell**: `&&`/`||` nicht verfügbar. Lange Multiline-Befehle in `cat <<EOF` über Bash-Tool, nicht PowerShell.
- **Empty State Standardtext**: „Keine Daten" / „Kein Budget definiert" / „Keine Agenten" — konsistent halten.
- **Format für 0-Werte**: Statt `text-status-green/red` → `text-text-tertiary` wenn der Wert 0 ist (sonst sieht's falsch positiv/negativ aus).
- **Animation entfernen, wenn Wert 0** ist (Pulse, Glow). Beispiel `animate-pulse-red` wurde auf der AgentRegistry-Badge entfernt als der Count 0 wurde.
- **`useMemo([], [])`**: bei leeren Daten kein State-Init mit Random-Werten — deterministisch leer.
- **DE/EN**: UI ist deutsch, Code englisch.

## 10. Nächste geplante Schritte (Plan)

### Phase A — Restliche Pages auf Empty-Template auditieren (1 PR pro Page)
- Per `agent-browser` jede Route screenshotten, hardcoded Numerals/Strings identifizieren, durch dynamische Werte / 0 / Empty-State ersetzen.

### Phase B — UI Polish (Schriften/Abstände/Zentrierung/Buttons)
- Audit-Checkliste:
  - Konsistenz: alle Card-Titles `text-sm font-semibold tracking-tight`?
  - KPIs: alle `font-mono-data`?
  - Buttons: alle `h-9 px-3` o.ä.? Icon-Buttons mit `aspect-square`?
  - Vertikale Zentrierung in Cards (`flex items-center`, `place-items-center`)?
  - Abstände: konsequent `space-y-4` zwischen Sections, `gap-4` in Grids?
  - Sidebar-Items: gleicher vertikaler Abstand?
  - Mobile: Touch-Targets ≥ 44px?
- Tool: agent-browser screenshots vor/nach, Tailwind-Klassen vereinheitlichen.

### Phase C — First-Run Setup Wizard

**Trigger**: localStorage flag `company-os.setup.completed = "true"`. Wenn nicht gesetzt → Wizard modal/full-screen overlay vor `<Layout>`.

**Schritte (vorgeschlagen)**:
1. **Willkommen** — Logo, Brand, Subtext „Lass uns deine KI-Firma einrichten" + „Loslegen" CTA.
2. **Firma & Founder** — `Company Name`, `Founder Name`, `Founder Email`, `Founder Role` (default: CEO).
3. **Erste Abteilung** — Vorausgewählte Templates (Engineering, Marketing, Sales, Operations, Finance, Legal). User kann auswählen + benennen.
4. **Erste Agenten** — 2-3 Agent-Templates (CEO-Agent, CTO-Agent, CFO-Agent) mit Autonomie-Level und Risk-Ceiling Defaults.
5. **Erste Business Unit** — Name + Revenue-Model + Phase 0.
6. **Initiales Budget** — Monatsbudget €, Liquiditätsziel €, Break-Even-Schwelle €.
7. **Kill-Switch & Policy** — „Standard armed" + bestätigen.
8. **Fertig** — Zusammenfassung, „Zum Dashboard" CTA.

**State-Persistenz**: `localStorage` mit Namespace `company-os.*`. Später Server-Sync wenn API-Verdrahtung kommt.

**Komponenten** (vermutlich neu):
- `src/components/wizard/SetupWizard.tsx` (Container, Schrittsteuerung)
- `src/components/wizard/steps/*` (eine Datei pro Schritt)
- `src/components/wizard/WizardProgress.tsx` (Stepper)
- `src/hooks/useFirstRun.ts` (liest/setzt localStorage flag)
- Storage-Layer: `src/lib/storage.ts` (typed `getCompanyConfig`, `saveCompanyConfig`)
- Mockdata anpassen: beim Speichern aus dem Wizard die `agents`/`departments` arrays (nicht mehr static `[]`, sondern aus storage gelesen) — oder besser einen kleinen Zustand-Store einführen (Zustand, Jotai, oder einfach React Context).

**Rules**:
- Wizard darf nichts an mockData direkt mutieren (read-only); statt dessen `companyConfig` Layer.
- „Skip / Empty Template" Button auf jedem Schritt → setzt completed=true ohne Daten.
- Resetbar via Settings-Page → „Wizard erneut starten".

### Phase D — Realdaten-Anbindung (out of scope für aktuellen Run, dokumentiert hier)
- React Query hinzufügen, gegen `/api/...` Endpoints sprechen, mockData → optional Dev-Fallback.

## 11. Letzte verifizierte Realität (für nächsten Run)

- Branch: `main`, HEAD `0d82511` (push erfolgreich auf `origin/main`).
- `npm run build` läuft sauber.
- `npm run preview` läuft auf `http://localhost:4173/` (Build-Output).
- Screenshots (zum Vergleich vor späteren Audits):
  - `empty-home.png` (Dashboard nach Empty-Pass)
  - `check-agents.png` (Agents leer)
  - `check-finance.png` (Finance vor Empty-Pass auf der Page — vor commit 0d82511)

## 12. Datei-Anker für schnellen Zugriff

- Empty-State-Strings: `src/components/KPIBar.tsx:9..70`, `src/pages/Home.tsx:48..52`, `src/pages/FinancePage.tsx:103..135`, `src/pages/AgentRegistryPage.tsx:858`.
- Design-Tokens: `tailwind.config.js`, `src/index.css`.
- Routes: `src/App.tsx:22..34`.
- Sidebar nav: `src/components/Sidebar.tsx:24..40`.
- Layout entry: `src/components/Layout.tsx:14..82`.
- Data types: `src/data/models.ts:1..207`.
- AI barrel: `src/ai/index.ts:1..38`.
- Server boot: `server/src/server.ts:1..50`, mount points `server/src/app.ts`.
