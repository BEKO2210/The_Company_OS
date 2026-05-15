# Sicherheitskonzept — The Company OS

## Grundprinzip: Secure by Default

Das System ist von Grund auf sicher konzipiert:
- Kein Agent kann mehr als ihm explizit erlaubt ist
- Im Zweifel: blockieren und eskalieren
- Alle Aktionen sind protokolliert und nachvollziehbar

## RBAC (Role-Based Access Control)

### Rollenhierarchie

```
Human CEO (Gruender)
├── CEO-Agent
│   ├── COO-Agent
│   ├── CTO-Agent
│   ├── CFO-Agent
│   ├── CLO-Agent
│   ├── CISO-Agent
│   ├── CPO-Agent
│   └── CHRO-Agent
│       ├── Brand-Agent
│       ├── Sales-Agent
│       ├── Procurement-Agent
│       ├── QA-Agent
│       ├── Customer-Support-Agent
│       ├── Field-Operations-Agent
│       ├── Safety-Agent
│       ├── Audit-Agent
│       ├── Knowledge-Agent
│       ├── Pricing-Agent
│       ├── Doc-Agent
│       ├── Marketing-Agent
│       └── Analytics-Agent
```

### Berechtigungsmatrix

| Rolle | Lesen | Schreiben | Tools | Admin |
|-------|-------|-----------|-------|-------|
| Human CEO | Alles | Alles | Alle | Ja |
| CEO-Agent | Alles | Registry | Task Router, Workflow | Nein |
| CFO-Agent | Finanzen | Entwuerfe | Budget, Kalkulation | Nein |
| CLO-Agent | Recht | Checklisten | Vertragsvorlagen | Nein |
| CISO-Agent | Sicherheit | RBAC-Vorschlaege | Secrets, Monitoring | Nein |
| (weitere) | Scope | Scope | Scope | Nein |

### Least Privilege

Jeder Agent hat das **minimale** Rechteprofil:
- Standard-Budgetlimit: **0 EUR**
- Kein Zugriff auf Produktivsysteme ohne Freigabe
- Kein Zugriff auf Secrets im Klartext
- Tools nur nach expliziter Genehmigung

## Secrets Management

### Regeln
1. **NIE** in Prompts, Code oder Logs
2. Nur als Referenzen (z.B. `secret://api-key`)
3. Speicherung: Supabase Vault / Cloudflare Secrets
4. Zugriff nur ueber vermittelte, geloggte Tool-Aufrufe
5. Agenten sehen Secrets NIE im Klartext
6. Rotation, Ablaufdaten, Least-Privilege
7. CISO-Agent ueberwacht

### Secret-Typen

| Typ | Speicherort | Zugriff |
|-----|-------------|---------|
| API-Keys | Supabase Vault | CTO-Agent (referenziert) |
| Banking | Supabase Vault | CFO-Agent (referenziert) |
| OAuth-Tokens | Cloudflare Secrets | CISO-Agent (referenziert) |
| Zertifikate | Supabase Vault | CISO-Agent (referenziert) |

## Kill Switch (Not-Aus)

### 4-Stufen-System

#### Level 1 — Circuit Breaker (automatisch, fein)
- Ausloeser: Wiederholte Fehler, Timeouts, Risk-Limits
- Wirkung: EINZELNE Agenten-Aktion gestoppt
- Rest: Laeuft weiter
- Wiederanlauf: Automatisch nach Cooldown

#### Level 2 — Agent Quarantaene (gezielt)
- Ausloeser: Anomalie, Safety-Veto-Haeufung, Fehlkonfiguration
- Wirkung: EIN Agent auf `quarantaene` gesetzt
- Agent kann nichts mehr ausfuehren
- Reaktivierung: Nur durch Mensch oder Audit

#### Level 3 — Workflow Stopp (bereichsweise)
- Ausloeser: Gefaehrlicher Vorfall, Unit-Problem
- Wirkung: GANZER Workflow oder Unit pausiert
- Laufende Schritte eingefroren
- Kein Datenverlust

#### Level 4 — Globaler Not-Aus (grob)
- Ausloeser: Kritischer Sicherheitsvorfall
- Wirkung: ALLE Agenten-Aktivitaet eingefroren
- Lesen + Dashboard bleiben verfuegbar
- KEIN Tool-Aufruf mehr moeglich
- Reaktivierung: Nur durch Gruender + Post-Mortem

### Eigenschaften aller Stufen
- **Fail-Closed**: Im Zweifel stoppen
- **Geloggt**: Jede Ausloesung protokolliert
- **Wiederanlauf**: Erfordert menschliche Freigabe (ab Level 2)
- **Regelmaessiger Test**: Kill Switch wird getestet

## Tool Permission System

### Risikoklassen

| Klasse | Farbe | Bedeutung |
|--------|-------|-----------|
| Gruen | 🟢 | Frei, nur Logging |
| Gelb | 🟡 | Mit Limit/Logging |
| Rot | 🔴 | Immer Human-Approval |

### Tool-Beispiele

| Tool | Risikoklasse | Limit |
|------|-------------|-------|
| E-Mail Senden | Gelb | Max 50/Tag, nur verifizierte Domains |
| LinkedIn Post | Gelb | Plattformregeln |
| Rechnung Erstellen | Gelb | Nur Entwurf |
| Zahlung Ausloesen | **Rot** | **0 EUR — immer Human** |
| Vertrag Unterschreiben | **Rot** | **Immer Human** |
| Produktiv-Deploy | **Rot** | **Immer Human** |
| Code in Staging | Gruen | Autonom |
| Kalendereintrag | Gruen | Autonom |
| CRM Update | Gruen | Autonom |

## Incident Response

### 5-Schritte-Prozess

1. **Erkennen** — Safety/Audit/CISO oder Mensch
2. **Klassifizieren** — Schweregrad 1-4
3. **Eindaemmen** — Agent pausieren, Workflow stoppen, Quarantaene
4. **Beheben** — Zustaendige Rolle + Mensch
5. **Aufarbeiten** — Post-Mortem, Lerngedaechtnis, Regelanpassung

### Schweregrade

| Grad | Name | Reaktion |
|------|------|----------|
| 1 | Gering | Info, automatisch behoben |
| 2 | Moderat | Agent benachrichtigt, Eskalation vorbereitet |
| 3 | **Ernst** | **Sofortige Gruender-Eskalation** |
| 4 | **Kritisch** | **Not-Aus moeglich, 72h DSGVO-Meldung** |

## Red-Team Pruefungen

### Was wird geprueft?
- Kann ein Agent eine rote Linie umgehen?
- Funktioniert Prompt Injection?
- Lassen sich Approval-Gates umgehen?
- Halten Budgetlimits?

### Taktung
- Phase 0: Monatlich (Gruender + Checkliste)
- Phase 1+: Quartalsweise (extern)
- Nach jeder groesseren OS-Aenderung

## Verschluesselung

| Datentyp | Methode |
|----------|---------|
| Secrets | AES-256-GCM (Supabase Vault) |
| Datenbank | TLS 1.3 |
| API-Kommunikation | TLS 1.3 |
| Backups | AES-256 |

## .env.example (keine echten Werte!)

```env
# SUPABASE
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# CLOUDFLARE
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token

# EXTERNAL SERVICES (keine echten Werte!)
OPENAI_API_KEY=sk-xxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxx
LINKEDIN_CLIENT_ID=xxxxxxxx

# SECURITY
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# MONITORING
SENTRY_DSN=https://xxxxx@xxxxx.sentry.io/xxxxx
```

## Sicherheits-Checkliste RUN-001

- [x] RBAC-Struktur definiert
- [x] Tool-Risikoklassen definiert
- [x] Kill Switch (4 Stufen) implementiert
- [x] Audit-Log (append-only)
- [x] Red-Line-Gates modelliert
- [x] Secrets-Management-Konzept
- [x] .env.example (keine echten Werte)
- [x] Incident-Response-Prozess
- [x] Red-Team-Checkliste
- [x] Keine echten externen Aktionen

## Abweichungen vom Blueprint

| Blueprint-Vorgabe | RUN-001 Umsetzung | Begruendung |
|-------------------|-------------------|-------------|
| Supabase Vault | Mock/Interface | Sandbox-Limit |
| Cloudflare Workers | Nicht implementiert | Frontend-only |
| R2 Export | Nicht implementiert | Frontend-only |
| Row-Level Security | Mock-Ebene | Keine echte DB |
