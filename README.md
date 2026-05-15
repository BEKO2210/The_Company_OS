# The Company OS

> **Status:** MVP RUN-001 abgeschlossen — 13-Screen Dashboard deployed
> **Letzte Aktualisierung:** 2026-05-15

## Was ist das Projekt?

**The Company OS** ist das Betriebssystem fuer **"The Company"** — eine AI-native digitale Holding nach deutschem Recht (UG/GmbH). Das System ermoeglicht einem Solo-Gruender, eine vollstaendige Firma mit autonomen Agenten zu betreiben: Planung, Entwicklung, Vertrieb, Support, Qualitaetssicherung, Finanzen und Governance — alles ueber ein zentrales Kontrollzentrum.

## Live Demo

🔗 **Dashboard:** [https://56r72ulnxurem.kimi.page](https://56r72ulnxurem.kimi.page)

## Was ist implementiert? (RUN-001)

### Dashboard (13 Screens)
| Screen | Status | Beschreibung |
|--------|--------|-------------|
| Company Overview | ✅ Vollstaendig | 6 KPIs, Projekt-Pipeline, Agenten-Status, Freigaben, Risiken, Automationsgrad |
| Departments | ✅ Vollstaendig | 14 Abteilungen als Karten mit Status, Agenten, Aufgaben |
| Agent Registry | ✅ Vollstaendig | 22 Agenten als Tabelle mit Filter, Detail-Drawer |
| Business Units | ✅ Vollstaendig | 8 Units A-H mit KPIs, Risiken, Detail-Drawer |
| Product Studios | ✅ Vollstaendig | 3 Studios (Cedar, Aurora, Bridge) mit Timeline, Budget |
| Approval Queue | ✅ Vollstaendig | 7 Freigaben mit roten Linien, Aktion-Buttons |
| Audit Log | ✅ Vollstaendig | 22 Eintraege, append-only, Filter, Hash-Referenzen |
| Risk Center | ✅ Vollstaendig | 5x5 Risiko-Matrix, 32 Risiken, Incidents, Safety Vetos |
| Finance | ✅ Vollstaendig | Liquiditaets-Trend, Budget-Donut, Rechnungen, Break-even |
| Human Workforce | ✅ Vollstaendig | 12 Experten, Freelancer, Vendors mit Bewertungen |
| Workflows | ✅ Vollstaendig | 18 Workflows mit Step-Tracker, Gates |
| Settings | ✅ Vollstaendig | Model Policies, Tool Permissions, Budget Limits, RBAC |
| Kill Switch | ✅ Vollstaendig | 4-Stufen-Not-Aus, Press-and-Hold Panic-Button |

### Daten & Modelle
- ✅ 15 TypeScript Interfaces (Agent, Department, BusinessUnit, ProductStudio, Approval, AuditLogEntry, Risk, Workflow, HumanExpert, FinanceEntry, Invoice, Budget, Incident, SystemSettings)
- ✅ Vollstaendige Seed-Daten: 22 Agenten, 14 Departments, 8 Business Units, 3 Studios, 7+ Approvals, 32 Risiken, 18 Workflows, 12 Human Experts

### Technologie
- ✅ Next.js-aquivalent: Vite + React 19 + TypeScript
- ✅ Tailwind CSS v3.4.19 mit vollstaendigem Dark-Design-System
- ✅ 40+ shadcn/ui Komponenten
- ✅ Framer Motion Animationen
- ✅ Recharts Datenvisualisierung
- ✅ Responsive Design (Desktop/Tablet/Mobile)

## Was ist Mock/Adapter?

Alle externen Schnittstellen sind als Mock vorbereitet:

| Adapter | Status | Hinweis |
|---------|--------|---------|
| EmailAdapter | 🔶 Mock | Keine echten E-Mails |
| LinkedInAdapter | 🔶 Mock | Keine echten Social-Media-Aktionen |
| BankingAdapter | 🔶 Mock | Keine echten Zahlungen |
| AccountingAdapter | 🔶 Mock | Keine echten Buchhaltungs-Aktionen |
| GitHubAdapter | 🔶 Mock | Keine echten Repos |
| HostingAdapter | 🔶 Mock | Keine echten Deployments |
| CalendarAdapter | 🔶 Mock | Keine echten Kalendereintraege |
| FreelancerPlatformAdapter | 🔶 Mock | Keine echten Freelancer-Anfragen |

## Wie startet man es lokal?

```bash
# 1. Repository oeffnen
cd /mnt/agents/output/app

# 2. Abhaengigkeiten installieren
npm install

# 3. Development Server starten
npm run dev

# 4. Oder Production Build
npm run build
```

## Dateistruktur

```
src/
├── components/
│   ├── ui/              # 40+ shadcn/ui Komponenten
│   ├── KPIBar.tsx       # Sticky KPI-Leiste (6 Metriken)
│   ├── Layout.tsx       # Sidebar + KPIBar + Content Wrapper
│   └── Sidebar.tsx      # 13-Item Navigation (collapsible)
├── data/
│   ├── models.ts        # 15 TypeScript Interfaces
│   ├── mockData.ts      # Vollstaendige Seed-Daten
│   └── index.ts         # Barrel Export
├── pages/
│   ├── Home.tsx         # Company Overview Dashboard
│   ├── DepartmentsPage.tsx
│   ├── AgentRegistryPage.tsx
│   ├── BusinessUnitsPage.tsx
│   ├── ProductStudiosPage.tsx
│   ├── ApprovalQueuePage.tsx
│   ├── AuditLogPage.tsx
│   ├── RiskCenterPage.tsx
│   ├── FinancePage.tsx
│   ├── HumanWorkforcePage.tsx
│   ├── WorkflowsPage.tsx
│   ├── SettingsPage.tsx
│   └── KillSwitchPage.tsx
├── App.tsx              # HashRouter + 13 Routes
├── main.tsx             # Entry Point
└── index.css            # Global Styles + Dark Theme
```

## Dokumentation

Die vollstaendige Dokumentation befindet sich im `docs/`-Ordner:

- [ARCHITECTURE.md](ARCHITECTURE.md) — Systemarchitektur
- [OPERATING_MODEL.md](OPERATING_MODEL.md) — Operatives Modell
- [AGENT_REGISTRY.md](AGENT_REGISTRY.md) — Agentenrollen
- [DEPARTMENTS.md](DEPARTMENTS.md) — Abteilungen
- [BUSINESS_UNITS.md](BUSINESS_UNITS.md) — Units A-H
- [WORKFLOWS.md](WORKFLOWS.md) — Alle Workflows
- [GOVERNANCE.md](GOVERNANCE.md) — Governance & Freigaben
- [SECURITY.md](SECURITY.md) — RBAC, Secrets, Kill Switch
- [COMPLIANCE.md](COMPLIANCE.md) — DSGVO, UWG, Recht
- [FINANCE_MODEL.md](FINANCE_MODEL.md) — Finanzmodell
- [HUMAN_WORKFORCE.md](HUMAN_WORKFORCE.md) — Human Expert Network
- [ROADMAP.md](ROADMAP.md) — 12-Monats-Roadmap
- [RUN_LOG.md](RUN_LOG.md) — Was in RUN-001 gebaut wurde
- [NEXT_RUNS.md](NEXT_RUNS.md) — Konkrete Folge-Runs

## Sicherheitsmerkmale

- ✅ **Fail-Closed**: Unklare Aktionen erfordern Freigabe
- ✅ **Rote Linien**: Zahlungen, Vertraege, Rechnungen, Deployments = immer Human
- ✅ **Kill Switch**: 4-Stufen-Not-Aus-Mechanismus
- ✅ **RBAC**: Rollenbasierte Zugriffskontrolle
- ✅ **Audit-Log**: Append-only, unveraenderlich
- ✅ **Keine echten Secrets**: Nur .env.example, keine echten Zahlungen
- ✅ **Keine echten externen Aktionen**: Alle Adapter sind Mock

## Blueprint-Kapitel Abdeckung

| Kapitel | Umsetzung |
|---------|-----------|
| 1. Executive Summary | ✅ Dashboard zeigt Kern-KPIs |
| 2. Konzernmodell (10 Ebenen) | ✅ Alle Ebenen im Datenmodell |
| 3. Organigramm (22 Agenten) | ✅ Agent Registry |
| 4. Business Units A-H | ✅ Business Units Screen |
| 5. Agentenarchitektur | ✅ Models + Mock Data |
| 6. Reale Welt (Interfaces) | 🔶 Mock/Adapter |
| 7. Human Workforce | ✅ Human Workforce Screen |
| 8. Geschaeftsmodell | ✅ Finance + Business Units |
| 9. Finanzmodell | ✅ Finance Screen |
| 10. Governance & Recht | ✅ Approval Queue + Settings |
| 11. Markenmodell | ✅ Premium Dark Design |
| 12. Beispieltag | ✅ Alle Screens demonstrierbar |
| 13. Dashboard & OS | ✅ 13-Screen Dashboard |
| 14. Repo-Beispiel | ✅ Product Studios |
| 15. Risiken (32) | ✅ Risk Center |
| 16. MVP-Plan | ✅ RUN-001 entspricht MVP |
| 17. 12-Monats-Roadmap | ✅ ROADMAP.md |
| 18. Finale Bewertung | ✅ Dokumentation |

## Build-Statistiken

| Metrik | Wert |
|--------|------|
| TypeScript Dateien | 28 |
| Code-Zeilen | ~8,500 |
| Bundle-Groesse (JS) | 1,280 KB (324 KB gzip) |
| Bundle-Groesse (CSS) | 102 KB (17 KB gzip) |
| Screens | 13 |
| Datenmodelle | 15 |
| Mock-Datensaetze | 200+ |

## Lizenz

Proprietaer — The Company Internal


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
