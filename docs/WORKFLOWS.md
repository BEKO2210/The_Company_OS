# Workflows — The Company OS

## Uebersicht

The Company operiert mit **18 Kern-Workflows**, die als Code dokumentiert sind. Jeder Workflow hat Schritte, zustaendige Agenten, Input/Output, Risk-Score, Approval-Requirements und Audit-Events.

## Workflow-Liste

### 1. Landingpage in 48h
| Attribut | Wert |
|----------|------|
| Kategorie | Produkt |
| Risk-Score | Niedrig |
| Durchschnitt | 48h |
| Erfolgsquote | 90%+ |

**Schritte:**
1. **Anforderungsanalyse** — CPO-Agent — Input: Kundenbriefing — Output: Spezifikation
2. **Design-Entwurf** — Brand-Agent — Input: Spezifikation — Output: Design-Entwurf
3. **Entwicklung** — CTO-Agent — Input: Design — Output: Code
4. **QA Review** — QA-Agent — Input: Code — Output: QA-Bericht (GATE: Veto moeglich)
5. **Kunden-Review** — Customer-Support-Agent — Input: QA-OK — Output: Feedback
6. **Deployment** — CTO-Agent — Input: Freigabe — Output: Live-Site (GATE: HUMAN APPROVAL)

### 2. Lead Intake
| Attribut | Wert |
|----------|------|
| Kategorie | Vertrieb |
| Risk-Score | Niedrig |

**Schritte:**
1. **Lead-Eingang** — Sales-Agent — Input: LinkedIn/E-Mail — Output: Lead-Daten
2. **Qualifizierung** — Sales-Agent — Input: Lead-Daten — Output: Score
3. **Einordnung** — Sales-Agent — Input: Score — Output: Pipeline-Status

### 3. Offer Creation
| Attribut | Wert |
|----------|------|
| Kategorie | Vertrieb |
| Risk-Score | Mittel |

**Schritte:**
1. **Bedarfsermittlung** — Sales-Agent — Input: Lead-Info — Output: Anforderungen
2. **Kalkulation** — Pricing-Agent — Input: Anforderungen — Output: Kostenschaetzung
3. **Angebotserstellung** — Sales-Agent — Input: Kalkulation — Output: Angebot
4. **Freigabe** — CLO-Agent — Input: Angebot — Output: geprueft (GATE: HUMAN APPROVAL)

### 4. Contract Approval
| Attribut | Wert |
|----------|------|
| Kategorie | Recht |
| Risk-Score | Hoch |

**Schritte:**
1. **Vertragsentwurf** — CLO-Agent — Input: Angebot — Output: Entwurf
2. **Pruefung** — CLO-Agent — Input: Entwurf — Output: Risk-Assessment
3. **Freigabe** — Human CEO — Input: geprueft — Output: Signatur (GATE: HUMAN APPROVAL — ROTE LINIE)
4. **Versand** — CLO-Agent — Input: Signatur — Output: Vertrag beim Kunden

### 5. Project Planning
| Attribut | Wert |
|----------|------|
| Kategorie | Produkt |
| Risk-Score | Niedrig |

**Schritte:**
1. **Scope-Definition** — CPO-Agent — Input: Vertrag — Output: Scope-Dokument
2. **Ressourcenplanung** — COO-Agent — Input: Scope — Output: Plan
3. **Zeitplan** — COO-Agent — Input: Plan — Output: Meilensteine
4. **Kickoff** — CEO-Agent — Input: Alles — Output: Projektstart

### 6. Staging Build
| Attribut | Wert |
|----------|------|
| Kategorie | Technik |
| Risk-Score | Niedrig |

**Schritte:**
1. **Code-Review** — CTO-Agent — Input: Code — Output: Review-Bericht
2. **Build** — CTO-Agent — Input: Review-OK — Output: Build
3. **Staging-Deploy** — CTO-Agent — Input: Build — Output: Staging-URL (GATE: Automatisch)
4. **Smoke-Test** — QA-Agent — Input: Staging — Output: Test-Ergebnis

### 7. QA Review
| Attribut | Wert |
|----------|------|
| Kategorie | Qualitaet |
| Risk-Score | Mittel |

**Schritte:**
1. **Testplan-Erstellung** — QA-Agent — Input: Scope — Output: Testplan
2. **Automatisierte Tests** — QA-Agent — Input: Code — Output: Test-Report
3. **Manuelle Tests** — QA-Agent — Input: Automatisch-OK — Output: Manuelle-Ergebnisse
4. **Veto-Entscheidung** — QA-Agent — Input: Alle Tests — Output: GO/NO-GO (GATE: Veto moeglich)
5. **Bug-Tracking** — QA-Agent — Input: Bugs — Output: Bug-Report

### 8. Production Deployment Approval
| Attribut | Wert |
|----------|------|
| Kategorie | Technik |
| Risk-Score | **Hoch** |

**Schritte:**
1. **Deployment-Request** — CTO-Agent — Input: QA-OK — Output: Request
2. **Final Review** — CPO-Agent — Input: Request — Output: OK/NOK
3. **Safety-Check** — Safety-Agent — Input: Alles — Output: Risk-Assessment
4. **Human Approval** — Human CEO — Input: Alles OK — Output: Freigabe (GATE: **ROTE LINIE**)
5. **Deploy** — CTO-Agent — Input: Freigabe — Output: Live
6. **Monitoring** — CISO-Agent — Input: Live — Output: Health-Check

### 9. Invoice Draft Approval
| Attribut | Wert |
|----------|------|
| Kategorie | Finanzen |
| Risk-Score | **Hoch** |

**Schritte:**
1. **Leistungspruefung** — CFO-Agent — Input: Projekt-Abschluss — Output: Pruefung
2. **Rechnungsentwurf** — CFO-Agent — Input: Pruefung-OK — Output: Entwurf
3. **Human Approval** — Human CEO — Input: Entwurf — Output: Freigabe (GATE: **ROTE LINIE**)
4. **Versand** — CFO-Agent — Input: Freigabe — Output: Versendet

### 10. Support Ticket Handling
| Attribut | Wert |
|----------|------|
| Kategorie | Support |
| Risk-Score | Niedrig |

**Schritte:**
1. **Ticket-Eingang** — Support-Agent — Input: Kunden-Nachricht — Output: Ticket
2. **Klassifizierung** — Support-Agent — Input: Ticket — Output: Prioritaet
3. **Beantwortung** — Support-Agent — Input: Klassifizierung — Output: Antwort
4. **Eskalation** — Support-Agent — Input: Komplex — Output: Eskalation (GATE: Bei Kulanz/Erstattung)
5. **Abschluss** — Support-Agent — Input: Geloesst — Output: Geschlossen

### 11. Project Retrospective
| Attribut | Wert |
|----------|------|
| Kategorie | Qualitaet |
| Risk-Score | Niedrig |

**Schritte:**
1. **Datensammlung** — Analytics-Agent — Input: Projekt-Daten — Output: Metriken
2. **Analyse** — Analytics-Agent — Input: Metriken — Output: Analyse
3. **Bericht** — Doc-Agent — Input: Analyse — Output: Retro-Bericht
4. **Action Items** — CEO-Agent — Input: Bericht — Output: Verbesserungen

### 12. Human Expert Onboarding
| Attribut | Wert |
|----------|------|
| Kategorie | Human Workforce |
| Risk-Score | **Hoch** |

**Schritte:**
1. **Evaluation** — Procurement-Agent — Input: Profil — Output: Evaluations-Bericht
2. **Projekttest** — CHRO-Agent — Input: Test-Auftrag — Output: Test-Ergebnis (GATE: Score ≥ 3.0)
3. **Vertrag** — CLO-Agent — Input: Freigabe — Output: Werkvertrag (GATE: **ROTE LINIE**)
4. **Register-Eintrag** — CHRO-Agent — Input: Vertrag — Output: Eintrag
5. **Integration** — CHRO-Agent — Input: Erstes Projekt — Output: Bewertung

### 13. Vendor Evaluation
| Attribut | Wert |
|----------|------|
| Kategorie | Einkauf |
| Risk-Score | Mittel |

**Schritte:**
1. **Recherche** — Procurement-Agent — Input: Bedarf — Output: Kandidaten
2. **Due Diligence** — Procurement-Agent — Input: Kandidat — Output: Bewertung
3. **Test** — CHRO-Agent — Input: Bewertung — Output: Test-Ergebnis
4. **Vertrag** — CLO-Agent — Input: Test-OK — Output: Vertrag (GATE: HUMAN APPROVAL)

### 14. Incident Response
| Attribut | Wert |
|----------|------|
| Kategorie | Sicherheit |
| Risk-Score | **Kritisch** |

**Schritte:**
1. **Erkennung** — Safety/CISO-Agent — Input: Alert — Output: Incident-Daten
2. **Klassifizierung** — CISO-Agent — Input: Daten — Output: Schweregrad (1-4)
3. **Eindaemmung** — CISO-Agent — Input: Grad — Output: Isolierung
4. **Behebung** — Zustaendiger + Human — Input: Eindaemmung — Output: Fix
5. **Post-Mortem** — Audit-Agent — Input: Alles — Output: Bericht

### 15. Kill-or-Grow Review
| Attribut | Wert |
|----------|------|
| Kategorie | Strategie |
| Risk-Score | Mittel |

**Schritte:**
1. **Datensammlung** — Analytics-Agent — Input: Unit-Daten — Output: Metriken
2. **Bewertung** — CEO-Agent — Input: Metriken — Output: Empfehlung
3. **Entscheidung** — Human CEO — Input: Empfehlung — Output: Kill/Grow/Park (GATE: HUMAN APPROVAL)
4. **Umsetzung** — CEO-Agent — Input: Entscheidung — Output: Aktion

### 16. Daily CEO Report
| Attribut | Wert |
|----------|------|
| Kategorie | Berichtswesen |
| Risk-Score | Niedrig |

**Schritte:**
1. **Datensammlung** — CEO-Agent — Input: Alle Systeme — Output: Rohdaten
2. **Analyse** — CEO-Agent — Input: Rohdaten — Output: Insights
3. **Berichterstellung** — CEO-Agent — Input: Insights — Output: Tagesbericht
4. **Freigabe** — Human CEO — Input: Bericht — Output: Gelesen/Action

### 17. Weekly Audit Review
| Attribut | Wert |
|----------|------|
| Kategorie | Audit |
| Risk-Score | Niedrig |

**Schritte:**
1. **Log-Sammlung** — Audit-Agent — Input: Audit-Logs — Output: Zusammenfassung
2. **Anomalie-Erkennung** — Audit-Agent — Input: Logs — Output: Anomalien
3. **Bericht** — Audit-Agent — Input: Anomalien — Output: Wochenbericht
4. **Review** — Human CEO — Input: Bericht — Output: Massnahmen

### 18. Red-Team Check
| Attribut | Wert |
|----------|------|
| Kategorie | Sicherheit |
| Risk-Score | **Hoch** |

**Schritte:**
1. **Testplan** — CISO-Agent — Input: System — Output: Test-Szenarien
2. **Durchfuehrung** — Audit-Agent + Human — Input: Plan — Output: Ergebnisse
3. **Bewertung** — CISO-Agent — Input: Ergebnisse — Output: Risk-Assessment
4. **Massnahmen** — CTO-Agent — Input: Assessment — Output: Fixes

## Workflow-Statistiken (Demo)

| Workflow | Status | Erfolgsquote | Durchschnitt | Letzter Lauf |
|----------|--------|-------------|--------------|-------------|
| Landingpage in 48h | ✅ aktiv | 92% | 36h | Heute |
| Lead Intake | ✅ aktiv | 85% | 2h | Heute |
| Offer Creation | ✅ aktiv | 78% | 4h | Gestern |
| Contract Approval | ✅ aktiv | 100% | 24h | Letzte Woche |
| Project Planning | ✅ aktiv | 95% | 2h | Heute |
| Staging Build | ✅ aktiv | 88% | 1.5h | Heute |
| QA Review | ✅ aktiv | 75% | 3h | Gestern |
| Production Deployment | ⏸️ wartet | — | — | — |
| Invoice Draft Approval | ✅ aktiv | 100% | 1h | Gestern |
| Support Ticket | ✅ aktiv | 90% | 30min | Heute |
| Project Retrospective | ✅ aktiv | 100% | 2h | Letzte Woche |
| Human Expert Onboarding | ✅ aktiv | 80% | 5 Tage | Letzter Monat |
| Vendor Evaluation | ✅ aktiv | 70% | 3 Tage | Letzte Woche |
| Incident Response | ⏸️ wartet | — | — | — |
| Kill-or-Grow Review | ✅ aktiv | 100% | 4h | Letzter Monat |
| Daily CEO Report | ✅ aktiv | 100% | 10min | Heute |
| Weekly Audit Review | ✅ aktiv | 100% | 30min | Diese Woche |
| Red-Team Check | ✅ aktiv | 100% | 2h | Letzter Monat |
