# QA-Masterplan — The Company OS

## Phasen (seriell, jede Phase hat Dependencies)

### Phase 1: Static Analysis (3 Agenten parallel)
- TS_Static_Analyzer: TypeScript-Compilation aller Dateien
- Lint_Security_Scanner: ESLint + Security-Audit
- Code_Review_Agent: Architektur-Review, Imports, Struktur

### Phase 2: Backend Deep Testing (3 Agenten parallel)
- Backend_API_Tester: Alle API-Routen testen
- Auth_Security_Auditor: Auth, RBAC, Sessions
- Database_Validator: Schema, Seeds, Queries

### Phase 3: Frontend Deep Testing (3 Agenten parallel)
- Frontend_Build_Tester: Build, Bundle, Types
- Component_Logic_Tester: React-Komponenten-Logik
- Integration_Tester: Frontend + Backend zusammen

### Phase 4: Business Logic Testing (3 Agenten parallel)
- Approval_Gate_Tester: Rote Linien, Freigaben
- Kill_Switch_Tester: 4-Level-System
- Workflow_Engine_Tester: State Machine

### Phase 5: Security Red Team (2 Agenten parallel)
- RedTeam_PenTester: Injection, Auth-Bypass, Gates
- Audit_Integrity_Tester: Audit-Log, Hash-Kette

### Phase 6: Final Integration & Fixes (1 Agent)
- Final_Fix_Engineer: Alle Bugs beheben, finaler Build

## Kommunikationsfluss
Jeder Agent schreibt einen QA-Report → Chief_QA_Orchestrator sammelt → Nächste Phase bekommt vorherige Reports
