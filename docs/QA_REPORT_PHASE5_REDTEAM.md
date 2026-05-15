# Phase 5 - Penetration Test Report (Red Team)

**Projekt:** The Company OS
**Tester:** Red Team Penetration Tester
**Datum:** 2026-05-15
**Ziel:** Alle Sicherheitsmechanismen testen und brechen

---

## Gesamtbewertung

| Kategorie | Bewertung |
|---|---|
| Authentication | **GUT** - JWT korrekt implementiert, unauthentifizierte Zugriffe werden blockiert |
| Authorization (RBAC) | **GUT** - Rollenkorrektur funktioniert, Red-Line-Enforcement aktiv |
| SQL Injection | **GUT** - Parameterisierte Queries verwendet |
| XSS | **SCHWACH** - Sanitisierung unvollstaendig (Regex-Bypass moeglich) |
| Rate Limiting | **TEILWEISE** - Nur Auth-Endpunkte geschuetzt |
| Input Validation | **SCHWACH** - Keine serverseitige Validierung von Wertebereichen |
| CORS | **TEILWEISE** - Stack Trace Disclosure bei Fehler |
| Information Disclosure | **TEILWEISE** - Stack Traces in Fehlern, keine Passwort-Hashes |
| Business Logic | **SCHWACH** - Budget/Settings-Manipulation moeglich |

**Gesamt-Sicherheitsbewertung: 6.5 / 10 (AKZEPTABEL mit Verbesserungsbedarf)**

---

## Gefundene Schwachstellen

### HIGH SEVERITY (2)

---

#### BUG-001: Budget Manipulation via Agent Update

| Feld | Wert |
|---|---|
| **Severity** | HIGH |
| **CVSS** | 7.1 (High) |
| **Endpoint** | `PUT /api/agents/:id` |
| **Kategorie** | Business Logic / Input Validation |

**Beschreibung:**
Der `updateAgent` Service akzeptiert beliebige Felder aus dem Request-Body und fuehrt ein SQL UPDATE ohne jegliche serverseitige Validierung durch. Ein authentisierter Benutzer (Admin/Founder) kann `budget_limit` und `budget_spent` auf beliebige Werte setzen, einschliesslich Werte die Geschaeftslogik verletzen (z.B. `budget_spent > budget_limit`).

**Proof of Concept:**
```bash
# Vorher: budget_limit=8000, budget_spent=3100
curl -X PUT http://localhost:3001/api/agents/cs-agent \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"budget_spent": 9999999, "budget_limit": 1}'
# HTTP 200 OK
# Nachher: budget_limit=1, budget_spent=9999999 (999999900% Utilization)
```

**Impact:**
- Finanzdaten koennen manipuliert werden
- Budget-Kontrollen werden ausgehebelt
- Compliance-Verstoss (EUR 12.4k -> EUR 9.9M)

**Fix:**
```typescript
const ALLOWED_AGENT_FIELDS = ['name', 'department', 'description', 'allowed_tools', 
  'risk_ceiling', 'autonomy_level', 'human_approval_rules', 'kpis', 'status', 'owner_human'];

// Validate fields
for (const key of Object.keys(data)) {
  if (!ALLOWED_AGENT_FIELDS.includes(key)) {
    throw new Error(`Field '${key}' is not allowed for update`);
  }
}

// Validate budget constraints
if (data.budget_spent !== undefined && data.budget_limit !== undefined) {
  if (data.budget_spent > data.budget_limit) {
    throw new Error('budget_spent cannot exceed budget_limit');
  }
}
```

---

#### BUG-002: Settings Validation Bypass

| Feld | Wert |
|---|---|
| **Severity** | HIGH |
| **CVSS** | 7.5 (High) |
| **Endpoint** | `PUT /api/settings` |
| **Kategorie** | Business Logic / Input Validation |

**Beschreibung:**
Das Update von System-Settings akzeptiert beliebige String-Werte ohne Validierung. Negative Liquiditaet, Automation-Rate > 100%, und XSS-Payloads koennen gespeichert werden.

**Proof of Concept:**
```bash
curl -X PUT http://localhost:3001/api/settings \
  -H "Authorization: Bearer <founder_token>" \
  -H "Content-Type: application/json" \
  -d '{"liquidity_eur": "-999999", "automation_rate": "999"}'
# HTTP 200 OK - Werte werden gespeichert!
```

**Impact:**
- Finanzdashboard zeigt negative Liquiditaet
- Systemmetriken werden verfaelscht
- Moegliche Obergrenzen werden umgangen

**Fix:**
```typescript
const SETTINGS_SCHEMA: Record<string, { type: string; min?: number; max?: number }> = {
  liquidity_eur: { type: 'number', min: 0 },
  automation_rate: { type: 'number', min: 0, max: 100 },
  company_name: { type: 'string', maxLength: 100 },
  system_version: { type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
  // ...
};
```

---

### MEDIUM SEVERITY (5)

---

#### BUG-003: XSS via Unquoted Event Handlers (Stored)

| Feld | Wert |
|---|---|
| **Severity** | MEDIUM |
| **CVSS** | 6.1 (Medium) |
| **Endpoint** | Alle Endpunkte mit String-Input |
| **Kategorie** | XSS |

**Beschreibung:**
Die XSS-Sanitisierung in `security.ts` verwendet einen Regex, der Event-Handler nur mit Anfuehrungszeichen erkennt (`on\w+\s*=\s*["'][^"']*["']`). Payloads ohne Anfuehrungszeichen werden nicht bereinigt.

**Proof of Concept:**
```bash
# Wird NICHT bereinigt:
curl -X PUT http://localhost:3001/api/agents/cs-agent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "<img src=x onerror=alert(1)>"}'
# Stored as-is! Keine Anfuehrungszeichen um alert(1) => Regex matcht nicht
```

**Impact:**
- Stored XSS moeglich
- Session Hijacking, Credential Theft, Keylogging
- Betrifft alle Benutzer, die die Daten anzeigen

**Fix:**
```typescript
// Verwende DOMPurify oder aehnliche Bibliothek statt Regex
import DOMPurify from 'dompurify';
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
```

---

#### BUG-004: CORS Error Leaks Stack Traces

| Feld | Wert |
|---|---|
| **Severity** | MEDIUM |
| **CVSS** | 5.3 (Medium) |
| **Endpoint** | Alle Endpunkte |
| **Kategorie** | Information Disclosure |

**Beschreibung:**
Wenn ein Origin nicht in der CORS-Allowlist ist, wirft die `cors`-Middleware einen Fehler, der vom Error Handler mit vollstaendigem Stack Trace zurueckgegeben wird (HTTP 500).

**Proof of Concept:**
```bash
curl -H "Origin: https://evil.com" http://localhost:3001/health
# HTTP 500 mit vollstaendigem Stack Trace:
# Error: Not allowed by CORS
#    at origin (/mnt/agents/output/app/server/src/app.ts:53:18)
#    at /mnt/agents/output/app/node_modules/cors/lib/index.js:...
```

**Impact:**
- Interne Dateipfade, Modulversionen und Code-Struktur werden offengelegt
- Erleichtert gezielte Angriffe

**Fix:**
```typescript
// In app.ts - CORS error handling:
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);  
      // ^-- Das wird zu 500
    }
  },
  // Fuege credentials: true hinzu und handle den Fehler separat
}));

// Im errorHandler.ts:
if (err.message === 'Not allowed by CORS') {
  res.status(403).json({ success: false, error: 'Forbidden: CORS policy violation' });
  return;
}
```

---

#### BUG-005: Kein Rate Limiting auf API-Endpunkten

| Feld | Wert |
|---|---|
| **Severity** | MEDIUM |
| **CVSS** | 5.3 (Medium) |
| **Endpoint** | Alle nicht-Auth API-Endpunkte |
| **Kategorie** | DoS / Enumeration |

**Beschreibung:**
Nur Auth-Endpunkte (Login/Register) haben Rate Limiting. Alle anderen API-Endpunkte akzeptieren unbegrenzte Requests, was zu DoS und Daten-Enumeration fuehren kann.

**Proof of Concept:**
```bash
# 30 Requests in 0.09 Sekunden - alle erfolgreich (HTTP 200)
for i in {1..30}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/agents &
done
```

**Impact:**
- Daten-Enumeration (alle Agents, Budgets, etc.)
- DoS durch Ressourcen-Exhaustion
- Kein Schutz gegen API-Scraping

**Fix:**
```typescript
// Wende ein globales Rate Limit an:
import { rateLimit } from './middleware/rateLimit.js';
app.use('/api/', rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));
app.use('/api/auth/', authRateLimit()); // Stricter for auth
```

---

#### BUG-006: Keine Feld-Whitelist in updateAgent

| Feld | Wert |
|---|---|
| **Severity** | MEDIUM |
| **CVSS** | 6.5 (Medium) |
| **Endpoint** | `PUT /api/agents/:id` |
| **Kategorie** | Input Validation |

**Beschreibung:**
Der `updateAgent` Service nutzt `Object.keys(data)` direkt, um die SQL SET-Klausel zu bauen. Es gibt keine Pruefung, ob die Felder tatsaechlich erlaubt sind.

**Proof of Concept:**
```bash
curl -X PUT http://localhost:3001/api/agents/brand-agent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"version": "99.9-HACKED", "status": "compromised"}'
# HTTP 200 - Version wird auf 99.9-HACKED gesetzt!
```

**Impact:**
- Interne Felder koennen manipuliert werden
- Datenintegritaet wird verletzt
- Moeglicherweise Sicherheitsrelevante Felder aenderbar

**Fix:**
```typescript
const ALLOWED_UPDATE_FIELDS = ['name', 'description', 'status', 'version', 
  'department', 'risk_ceiling', 'autonomy_level', 'human_approval_rules', 
  'kpis', 'owner_human', 'allowed_tools'];
  
export function updateAgent(id: string, data: Record<string, unknown>): Agent | undefined {
  // Filter to allowed fields only
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (ALLOWED_UPDATE_FIELDS.includes(key)) {
      filtered[key] = data[key];
    }
  }
  // ... continue with filtered data
}
```

---

#### BUG-007: Content-Type Bypass

| Feld | Wert |
|---|---|
| **Severity** | MEDIUM |
| **CVSS** | 5.3 (Medium) |
| **Endpoint** | Alle PUT/POST Endpunkte |
| **Kategorie** | Input Validation |

**Beschreibung:**
Die API akzeptiert JSON-Daten auch wenn der `Content-Type: text/plain` Header gesetzt ist. Der Body Parser von Express parst trotzdem JSON.

**Proof of Concept:**
```bash
curl -X PUT http://localhost:3001/api/agents/cs-agent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: text/plain" \
  -d '{"name": "BYPASSED"}'
# HTTP 200 - Body wird trotzdem als JSON geparsed!
```

**Impact:**
- CORS-Preflight kann umgangen werden (kein Content-Type: application/json noetig)
- Content-Type Validation Bypass

**Fix:**
```typescript
// Fuege Content-Type Middleware hinzu:
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    const ct = req.headers['content-type'];
    if (!ct || !ct.includes('application/json')) {
      res.status(415).json({ success: false, error: 'Content-Type must be application/json' });
      return;
    }
  }
  next();
});
```

---

### LOW SEVERITY / INFO (3)

---

#### BUG-008: Fehlender Content-Security-Policy Header

| Feld | Wert |
|---|---|
| **Severity** | LOW |
| **Endpoint** | Alle |
| **Kategorie** | Security Headers |

**Beschreibung:**
Der `Content-Security-Policy` Header fehlt. Ohne CSP kann ein XSS-Angriff ausgefuehrt werden, indem externe Ressourcen geladen werden.

**Fix:**
```typescript
res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
```

---

#### BUG-009: Stack Trace bei PayloadTooLarge

| Feld | Wert |
|---|---|
| **Severity** | LOW |
| **Endpoint** | Alle mit Body-Parsing |
| **Kategorie** | Information Disclosure |

**Beschreibung:**
Bei 2MB+ Requests gibt der Express body parser einen Stack Trace zurueck.

**Fix:**
```typescript
// Der errorHandler sollte 413-Fehler ohne Stack Trace behandeln:
if (err.type === 'entity.too.large') {
  res.status(413).json({ success: false, error: 'Request entity too large' });
  return;
}
```

---

#### BUG-010: Strict-Transport-Security fehlt in Development

| Feld | Wert |
|---|---|
| **Severity** | INFO |
| **Endpoint** | Alle |
| **Kategorie** | Security Headers |

**Beschreibung:**
`Strict-Transport-Security` wird nur in Production gesetzt. In Development nicht. Das ist akzeptabel fuer Development, aber sollte in Production aktiv sein.

---

## Erfolgreich geblockte Angriffe

| Test-Vektor | Ergebnis | Status |
|---|---|---|
| Unauthentifizierter Zugriff auf /api/agents | 401 Unauthorized | BLOCKED |
| Unauthentifizierter Zugriff auf /api/settings | 401 Unauthorized | BLOCKED |
| Fake JWT Token | 401 Invalid token | BLOCKED |
| Leerer Token | 401 No token provided | BLOCKED |
| Ohne Bearer-Praefix | 401 No token provided | BLOCKED |
| Viewer versucht Approval | 403 admin role required | BLOCKED |
| Viewer versucht Agent-Update | 403 admin role required | BLOCKED |
| Viewer versucht Kill-Switch | 403 Founder role required | BLOCKED |
| Admin versucht Red-Line Approval | 400 Red Line Violation | BLOCKED |
| Admin versucht Kill-Switch | 403 Founder role required | BLOCKED |
| Admin versucht Settings-Update | 403 Founder role required | BLOCKED |
| Path Traversal (/etc/passwd) | 404 Not Found | BLOCKED |
| Path Traversal (..%2f..%2f) | 404 Not Found | BLOCKED |
| SQL Injection in Query-Parametern | 200 (0 Ergebnisse) | BLOCKED |
| Passwort-Hash in /api/auth/me | Nicht vorhanden | BLOCKED |
| Login Brute-Force | 429 Rate Limited | BLOCKED |
| 2MB Body | 413 Payload Too Large | BLOCKED |
| DELETE/PATCH nicht implementiert | 404 Not Found | BLOCKED |

---

## Sicherheitsbewertung pro Komponente

### 1. Authentication (8/10)
- JWT korrekt mit Bearer-Praefix
- Token-Validierung mit Datenbankabgleich (User aktiv?)
- Timing-attack-safe Passwortvergleich
- **-1 Punkt:** Kein Refresh-Token-Mechanismus
- **-1 Punkt:** Keine Token-Revocation (Logout ist nur client-seitig)

### 2. Authorization / RBAC (9/10)
- Rollenhierarchie korrekt implementiert
- Red-Line-Enforcement fuer kritische Approvals
- Kill-Switch nur fuer Founder
- Settings-Update nur fuer Founder
- **-1 Punkt:** Keine feingranularen Permissions (nur role-based)

### 3. SQL Injection (8/10)
- Parameterisierte Queries fuer Werte
- **-1 Punkt:** Feldnamen in updateAgent dynamisch (nicht exploitable aber risky)
- **-1 Punkt:** processExpiredApprovals nutzt Template-String (nicht user-input)

### 4. XSS (4/10)
- `<script>` Tags werden entfernt
- **-2 Punkte:** Event-Handler ohne Anfuehrungszeichen werden nicht bereinigt
- **-2 Punkte:** `<svg onload=...>`, `<iframe>` etc. nicht geschuetzt
- **-2 Punkte:** Kein CSP Header

### 5. Rate Limiting (5/10)
- Auth-Endpunkte geschuetzt (5 Versuche / 15min)
- **-5 Punkte:** Kein Rate Limiting auf API-Endpunkten

### 6. Input Validation (3/10)
- Zod-Schemas fuer Auth
- **-3 Punkte:** Keine Whitelist fuer Agent-Update-Felder
- **-2 Punkte:** Keine Validierung von Wertebereichen (Budget, Settings)
- **-2 Punkte:** Content-Type wird nicht validiert

### 7. CORS (6/10)
- Origin-Whitelist konfiguriert
- Credentials-Handling korrekt
- **-2 Punkte:** Stack Trace Disclosure bei Fehler
- **-2 Punkte:** null/undefined Origin erlaubt (fuer mobile apps)

### 8. Information Disclosure (6/10)
- Keine Passwort-Hashes in Responses
- Kein Stack Trace in normalen Fehlern
- **-2 Punkte:** Stack Trace bei CORS-Fehlern
- **-2 Punkte:** Stack Trace bei PayloadTooLarge

### 9. Business Logic (4/10)
- Fail-closed fuer Approvals (Timeout = Auto-Reject)
- Red-Line Types korrekt definiert
- **-3 Punkte:** Budget ohne Geschaeftslogik-Validierung
- **-3 Punkte:** Settings ohne Typ-Validierung

---

## Empfohlene Priorisierung der Fixes

| Prioritaet | Bug-ID | Beschreibung | Aufwand |
|---|---|---|---|
| P0 | BUG-001 | Budget-Validation hinzufuegen | 1h |
| P0 | BUG-002 | Settings-Schema-Validation | 1h |
| P1 | BUG-003 | XSS: DOMPurify statt Regex | 2h |
| P1 | BUG-004 | CORS Fehler ohne Stack Trace | 30min |
| P1 | BUG-006 | Feld-Whitelist in updateAgent | 1h |
| P2 | BUG-005 | Globales Rate Limiting | 1h |
| P2 | BUG-007 | Content-Type Validierung | 30min |
| P2 | BUG-008 | CSP Header hinzufuegen | 15min |
| P3 | BUG-009 | PayloadTooLarge ohne Stack Trace | 15min |

---

## Zusammenfassung

Das System hat eine solide Basis-Sicherheit (Auth, RBAC, SQL Injection Protection), weist aber signifikante Schwaechen in der Input Validation und XSS-Sanitisierung auf. Die beiden HIGH-Severity Bugs (Budget- und Settings-Manipulation) sollten sofort behoben werden, da sie direkte Auswirkungen auf die Geschaeftslogik haben.

**Gesamtscore: 6.5 / 10 (AKZEPTABEL mit Verbesserungsbedarf)**

- 2x HIGH Severity (Budget/Settings Manipulation)
- 5x MEDIUM Severity (XSS, CORS Info Leak, Rate Limiting, Field Whitelist, Content-Type)
- 3x LOW/INFO (CSP, Stack Traces, HSTS)
- 17x BLOCKED (Gute Abwehr)
