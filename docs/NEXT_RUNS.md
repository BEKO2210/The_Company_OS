# NEXT RUNS — The Company OS

## RUN-002: Backend + echte Datenbank

### Ziel
Dashboard mit echtem Backend und Datenbank verbinden. Mock-Daten durch echte CRUD-Operationen ersetzen.

### Aufgaben
- [ ] Supabase-Projekt einrichten (PostgreSQL)
- [ ] Alle 15 Tabellen als PostgreSQL-Schema erstellen
- [ ] Supabase Edge Functions fuer API-Endpunkte
- [ ] Row-Level Security (RLS) fuer alle Tabellen
- [ ] Frontend: API-Layer statt Mock-Daten
- [ ] Authentifizierung (Supabase Auth)
- [ ] Real-time Subscriptions fuer KPIs
- [ ] Seed-Script fuer initiale Daten
- [ ] Unit Tests (Jest + React Testing Library)
- [ ] API-Tests (Supertest)

### Prioritaet: **KRITISCH**

### Abhaengigkeiten
- Supabase-Account
- PostgreSQL-Kenntnisse

---

## RUN-003: Adapter + externe Integrationen

### Ziel
Alle 8 externen Adapter von Mock auf echte Implementierung umstellen.

### Adapter
- [ ] **EmailAdapter**: Supabase/Resend fuer E-Mail-Versand
- [ ] **LinkedInAdapter**: LinkedIn API fuer Social Selling
- [ ] **BankingAdapter**: Open Banking API (lesend)
- [ ] **AccountingAdapter**: lexoffice/sevDesk API
- [ ] **GitHubAdapter**: GitHub API fuer Repo-Management
- [ ] **HostingAdapter**: Vercel/Cloudflare API fuer Deployments
- [ ] **CalendarAdapter**: Google Calendar API
- [ ] **FreelancerPlatformAdapter**: Upwork/Fiverr API

### Prioritaet: **HOCH**

### Abhaengigkeiten
- RUN-002 (Backend)
- API-Keys fuer alle Dienste
- OAuth-App-Registrierungen

---

## RUN-004: Workflow Engine

### Ziel
Workflows nicht nur anzeigen, sondern tatsaechlich ausfuehren.

### Aufgaben
- [ ] Workflow-Engine als Service
- [ ] State Machine fuer jeden Workflow
- [ ] Schritt-Ausfuehrung mit Agent-Zuordnung
- [ ] Gate-Logik (blockierend, approval-required)
- [ ] Event-Driven Architektur (Webhooks/Events)
- [ ] Workflow-Instanzen (laufende Workflows)
- [ ] Fortschritts-Tracking
- [ ] Eskalation bei Timeout
- [ ] Retry-Logik fuer fehlgeschlagene Schritte

### Workflows zu implementieren (Prioritaet)
1. Landingpage in 48h
2. Angebotserstellung
3. Approval-Gate
4. QA-Prozess
5. Rechnungsfreigabe

### Prioritaet: **KRITISCH**

### Abhaengigkeiten
- RUN-002 (Backend + DB)

---

## RUN-005: Kill Switch + Circuit Breaker

### Ziel
Kill Switch technisch vollstaendig implementieren.

### Aufgaben
- [ ] Circuit Breaker (automatisch, fein)
- [ ] Agent Quarantaene (gezielt)
- [ ] Workflow Stopp (bereichsweise)
- [ ] Globaler Not-Aus (grob)
- [ ] Health Checks fuer alle Agenten
- [ ] Anomaly Detection
- [ ] Automatische Eskalation
- [ ] Recovery-Prozeduren
- [ ] Kill Switch Tests (regelmaessig)

### Prioritaet: **HOCH**

### Abhaengigkeiten
- RUN-002 (Backend)

---

## RUN-006: Mobile App

### Ziel
Native Mobile App fuer unterwegs.

### Aufgaben
- [ ] React Native oder PWA
- [ ] Push Notifications fuer Approvals
- [ ] Biometrische Authentifizierung
- [ ] Offline-Modus
- [ ] Schnelle Approval-Aktionen
- [ ] KPI-Widget fuer Homescreen

### Prioritaet: **MITTEL**

### Abhaengigkeiten
- RUN-002 (Backend API)

---

## RUN-007: KI-Verbesserungen

### Ziel
Dashboard mit KI-Faehigkeiten erweitern.

### Aufgaben
- [ ] Natuerlichsprachliche Abfragen ("Zeige mir alle Risiken in Unit B")
- [ ] KI-gestuetzte Entscheidungshilfen
- [ ] Automatische Zusammenfassungen (Tagesberichte)
- [ ] Praediktive Analysen (Liquiditaetsprognose)
- [ ] Anomalie-Erkennung in Echtzeit
- [ ] Smart Recommendations

### Prioritaet: **MITTEL**

### Abhaengigkeiten
- RUN-002 (Backend)
- OpenAI/Claude API

---

## RUN-008: Multi-Tenant + Whitelabel

### Ziel
OS fuer andere Firmen als White-Label anbieten.

### Aufgaben
- [ ] Multi-Tenant Architektur
- [ ] Custom Branding pro Tenant
- [ ] Konfigurierbare Agenten
- [ ] Isolierte Daten pro Tenant
- [ ] Self-Service Onboarding
- [ ] Billing-Integration (Stripe)

### Prioritaet: **NIEDRIG** (Phase 3)

### Abhaengigkeiten
- Alle vorherigen RUNs

---

## Empfohlene Reihenfolge

```
RUN-001 ✅ (Dashboard)
   ↓
RUN-002 (Backend + DB)
   ↓
RUN-004 (Workflow Engine) — parallel mit RUN-003 (Adapter)
   ↓
RUN-005 (Kill Switch)
   ↓
RUN-003 (Restliche Adapter)
   ↓
RUN-006 (Mobile) — parallel mit RUN-007 (KI)
   ↓
RUN-008 (Whitelabel) — Phase 3
```

## Geschaetzter Aufwand

| Run | Aufwand | Schwierigkeit |
|-----|---------|---------------|
| RUN-002 | 2-3 Wochen | Mittel |
| RUN-003 | 1-2 Wochen | Mittel |
| RUN-004 | 2-3 Wochen | Hoch |
| RUN-005 | 1 Woche | Mittel |
| RUN-006 | 2 Wochen | Mittel |
| RUN-007 | 1-2 Wochen | Hoch |
| RUN-008 | 3-4 Wochen | Sehr hoch |
