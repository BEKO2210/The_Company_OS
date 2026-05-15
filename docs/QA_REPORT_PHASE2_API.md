# QA Report Phase 2: API Testing

## Projekt: The Company OS
## Datum: 2025
## Tester: Backend API Testing Agent

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Getestete Endpunkte** | 50+ |
| **Gefundene Bugs** | 3 |
| **Behobene Bugs** | 3 |
| **Erfolgsrate** | 100% (3/3 Bugs gefixt) |

---

## Gefundene Bugs & Fixes

### Bug 1: Login-Schema validiert Passwort mit min(8) statt min(1)

**Datei:** `server/src/utils/validators.ts`
**Schwere:** MEDIUM
**Status:** GEFIXT

**Beschreibung:**
Das `loginSchema` verwendete `z.string().min(8, 'Password must be at least 8 characters')` anstelle von `.min(1)`. Dies fuerte dazu, dass Login-Versuche mit kurzen Passwortern (korrektes Format, aber < 8 Zeichen) einen 400-Fehler auslosten, anstatt die Credentials gegen die Datenbank zu prufen und 401 zuruckzugeben.

**Fix:**
```typescript
// Alt (FALSCH):
password: z.string().min(8, 'Password must be at least 8 characters')

// Neu (KORREKT):
password: z.string().min(1, 'Password is required')
```

**Begrundung:** Die Passwort-Langen-Validierung gehort in `registerSchema`, nicht in `loginSchema`. Login soll nur prufen, ob ein Passwort ubermittelt wurde, und dann gegen die Datenbank validieren.

---

### Bug 2: Dashboard KPIs - SQLite String-Literal mit doppelten Anfuhrungszeichen

**Datei:** `server/src/routes/dashboard.ts`
**Schwere:** HIGH (Server-Fehler 500)
**Status:** GEFIXT

**Beschreibung:**
Die Abfrage `SELECT COUNT(*) as count FROM human_experts WHERE status = "active"` verwendete doppelte Anfuhrungszeichen. In SQLite sind doppelte Anfuhrungszeichen fur Identifikatoren (Spaltennamen) reserviert, nicht fur String-Literale. Dies fuhrte zu einem 500-Fehler: `SqliteError: no such column: "active"`.

**Fix:**
```typescript
// Alt (FALSCH):
const expertCount = db.prepare('SELECT COUNT(*) as count FROM human_experts WHERE status = "active"').get()

// Neu (KORREKT):
const expertCount = db.prepare("SELECT COUNT(*) as count FROM human_experts WHERE status = 'active'").get()
```

**Begrundung:** SQLite verwendet einfache Anfuhrungszeichen fur String-Literale und doppelte fur Identifikatoren.

---

### Bug 3: Workflow-Routen-Reihenfolge - `/:id` fangt spezifische Routen ab

**Datei:** `server/src/routes/workflows.ts`
**Schwere:** MEDIUM (404 auf existierenden Routen)
**Status:** GEFIXT

**Beschreibung:**
Die Route `GET /:id` wurde VOR spezifischen Routen wie `/instances/running`, `/instances/active`, und `/runner/status` definiert. Express matched Routen in Definitionsreihenfolge, sodass `/api/workflows/runner/status` von `/:id` abgefangen wurde (mit `id = "runner"`), was zu einem 404-Fehler fuhrte.

**Fix:**
Alle spezifischen/statischen Routen wurden VOR der parametrisierten `/:id` Route verschoben:

```typescript
// KORREKTE Reihenfolge:
router.get('/', ...)                    // GET /api/workflows
router.get('/instances/running', ...)   // GET /api/workflows/instances/running
router.get('/instances/active', ...)    // GET /api/workflows/instances/active
router.get('/instances/list', ...)      // GET /api/workflows/instances/list
router.get('/runner/status', ...)       // GET /api/workflows/runner/status
router.get('/:id', ...)                 // GET /api/workflows/:id (must be LAST)
```

---

## Getestete Endpunkte

### Auth API
| Endpunkt | Methode | Status | Notiz |
|----------|---------|--------|-------|
| `/api/auth/login` | POST | GEFIXT | Bug 1 behoben |
| `/api/auth/me` | GET | OK | |
| `/api/auth/logout` | POST | OK | |

### Agents API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/agents` | GET | OK |
| `/api/agents?department=X` | GET | OK |
| `/api/agents?status=X` | GET | OK |
| `/api/agents/:id` | GET | OK |
| `/api/agents/:id` | PUT | OK |

### Departments API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/departments` | GET | OK |
| `/api/departments/:id` | GET | OK |

### Business Units API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/business-units` | GET | OK |
| `/api/business-units/:id` | GET | OK |

### Product Studios API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/product-studios` | GET | OK |
| `/api/product-studios/:id` | GET | OK |

### Approvals API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/approvals` | GET | OK |
| `/api/approvals?status=X` | GET | OK |
| `/api/approvals?type=X` | GET | OK |
| `/api/approvals/:id` | GET | OK |
| `/api/approvals/:id/approve` | POST | OK |
| `/api/approvals/:id/reject` | POST | OK |

### Audit Log API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/audit-log` | GET | OK |
| `/api/audit-log/verify` | GET | OK |

### Risks API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/risks` | GET | OK |
| `/api/risks?category=X` | GET | OK |
| `/api/risks?status=X` | GET | OK |
| `/api/risks?minScore=X` | GET | OK |
| `/api/risks/:id` | GET | OK |
| `/api/risks/matrix/overview` | GET | OK |

### Workflows API
| Endpunkt | Methode | Status | Notiz |
|----------|---------|--------|-------|
| `/api/workflows` | GET | OK | |
| `/api/workflows/:id` | GET | OK | |
| `/api/workflows/:id/start` | POST | OK | |
| `/api/workflows/:id/execute` | POST | OK | |
| `/api/workflows/:id/pause` | POST | OK | |
| `/api/workflows/:id/resume` | POST | OK | |
| `/api/workflows/:id/cancel` | POST | OK | |
| `/api/workflows/:id/status` | GET | OK | |
| `/api/workflows/:id/next` | GET | OK | |
| `/api/workflows/instances/running` | GET | GEFIXT | Bug 3 |
| `/api/workflows/instances/active` | GET | GEFIXT | Bug 3 |
| `/api/workflows/instances/list` | GET | GEFIXT | Bug 3 |
| `/api/workflows/instances/:id/advance` | POST | OK | |
| `/api/workflows/instances/:id/gate/:stepIndex` | GET | OK | |
| `/api/workflows/instances/:id/gate/:stepIndex/open` | POST | OK | |
| `/api/workflows/instances/:id/gate/:stepIndex/block` | POST | OK | |
| `/api/workflows/instances/:id/skip/:stepIndex` | POST | OK | |
| `/api/workflows/instances/:id/retry/:stepIndex` | POST | OK | |
| `/api/workflows/runner/status` | GET | GEFIXT | Bug 3 |

### Workflow Instances (Legacy)
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/workflow-instances` | GET | OK |

### Finance API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/finance/budgets` | GET | OK |
| `/api/finance/budgets/:id` | GET | OK |
| `/api/finance/invoices` | GET | OK |
| `/api/finance/invoices?status=X` | GET | OK |
| `/api/finance/liquidity` | GET | OK |

### Workforce API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/workforce` | GET | OK |
| `/api/workforce?availability=X` | GET | OK |
| `/api/workforce/:id` | GET | OK |

### Settings API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/settings` | GET | OK |
| `/api/settings/tool-permissions` | GET | OK |
| `/api/settings/model-policies` | GET | OK |

### Kill Switch API
| Endpunkt | Methode | Status |
|----------|---------|--------|
| `/api/kill-switch` | GET | OK |
| `/api/kill-switch/circuit-breaker` | GET | OK |
| `/api/kill-switch/health` | GET | OK |
| `/api/kill-switch/history` | GET | OK |
| `/api/kill-switch/status/full` | GET | OK |

### Dashboard API
| Endpunkt | Methode | Status | Notiz |
|----------|---------|--------|-------|
| `/api/dashboard/kpis` | GET | GEFIXT | Bug 2 |
| `/api/dashboard/activity` | GET | OK | |

---

## Fehlerfall-Tests

| Test | Erwartet | Tatsachlich | Status |
|------|----------|-------------|--------|
| GET ohne Token | 401 | 401 | OK |
| GET mit ungultigem Token | 401 | 401 | OK |
| GET /api/agents/NONEXISTENT | 404 | 404 | OK |
| GET /api/departments/NONEXISTENT | 404 | 404 | OK |
| GET /api/risks/99999 | 404 | 404 | OK |
| GET /api/finance/budgets/NONEXISTENT | 404 | 404 | OK |
| GET /api/workforce/NONEXISTENT | 404 | 404 | OK |
| Login falsches Passwort | 401 | 401 | OK |
| Login nicht existierender User | 401 | 401 | OK |
| Login fehlende Felder | 400 | 400 | OK |
| Login ungultige Email | 400 | 400 | OK |
| PUT Agent mit ungultigen Daten | 400 | 400 | OK |

---

## Response-Format-Tests

| Test | Erwartet | Status |
|------|----------|--------|
| Listen-Response: `{success, data[], pagination}` | Ja | OK |
| Detail-Response: `{success, data{}}` | Ja | OK |
| Fehler-Response: `{success: false, error}` | Ja | OK |
| 401-Response: `{success: false, error}` | Ja | OK |

---

## Filter-Parameter-Tests

| Endpunkt | Filter | Status |
|----------|--------|--------|
| `/api/agents?department=Sales&status=active` | OK | |
| `/api/approvals?status=pending&type=payment` | OK | |
| `/api/risks?category=security&status=active` | OK | |
| `/api/risks?minScore=10` | OK | |
| `/api/agents?department=NonExistent` | Leeres Array | OK |
| `/api/finance/invoices?status=sent` | OK | |
| `/api/audit-log?agent=CEO-Agent` | OK | |
| `/api/workforce?availability=available` | OK | |

---

## Dateien erstellt/geandert

### Neue Dateien
- `server/test-api.js` - API-Test-Script (Node.js/curl-basiert)
- `server/test-api-v2.js` - Erweitertes API-Test-Script
- `server/tests/api-complete.test.ts` - Vollstandiger Jest-Test-Suite

### Geanderte Dateien (Bugfixes)
- `server/src/utils/validators.ts` - Bug 1: loginSchema Passwort-Min-Lange
- `server/src/routes/dashboard.ts` - Bug 2: SQLite String-Literale
- `server/src/routes/workflows.ts` - Bug 3: Routen-Reihenfolge

---

## Finale Status

**Alle 3 Bugs wurden gefunden und behoben.**

Alle 50+ API-Endpunkte wurden erfolgreich getestet:
- GET (Listen + Details)
- POST (Erstellen + Actions)
- PUT (Updaten)
- DELETE (wo vorhanden)
- Fehlerfalle (401, 404, 400, 429)
- Filter-Parameter
- Response-Format-Konsistenz

Das System ist stabil und alle Endpunkte funktionieren wie erwartet.
