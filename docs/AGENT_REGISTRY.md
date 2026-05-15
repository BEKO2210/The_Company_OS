# Agent Registry — The Company OS

## Uebersicht

The Company operiert mit **22 Agenten** (1 Human + 21 AI) in 14 Abteilungen. Jeder Agent hat eine definierte Rolle, Budgetlimit, Risk Ceiling, Autonomie-Level und Human-Approval-Regeln.

## Alle Agenten

### C-Level (Executive Council)

#### Human CEO / Founder
| Attribut | Wert |
|----------|------|
| Rolle | Gesellschafter, Geschaeftsfuehrer |
| Department | Executive Council |
| Status | aktiv |
| Haftet fuer | Geld, Vertraege, strategische Entscheidungen |
| KPIs | Netto-Cashflow, zufriedene Kunden, Automationsgrad |

#### CEO-Agent (Chief Orchestrator)
| Attribut | Wert |
|----------|------|
| Department | Executive Council |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Autonomie | supervised |
| Tools | Task Router, Workflow Engine, Registry, Reporting |
| Human Approval | Bei Schwellenwert-Ueberschreitung |
| KPIs | Durchlaufzeit, Agenten-Auslastung, Freigabe-Quote |

#### COO-Agent (Betrieb)
| Attribut | Wert |
|----------|------|
| Department | Operations |
| Budgetlimit | 0 EUR |
| Risk Ceiling | medium |
| Autonomie | supervised |
| Tools | Workflow Engine, PM, Kalender, CRM |
| Human Approval | Externe Termin zusagen, Beauftragung |
| KPIs | Termintreue, Eskalationsquote, Ruestzeit |

#### CTO-Agent (Technik)
| Attribut | Wert |
|----------|------|
| Department | Engineering |
| Budgetlimit | 0 EUR |
| Risk Ceiling | medium |
| Autonomie | supervised |
| Tools | GitHub, CI/CD, Hosting, Supabase, Modelle |
| Human Approval | Produktiv-Deployment, Architektur mit Kostenfolge |
| KPIs | Fehlerrate, Build-Erfolgsquote, Wiederverwendung |

#### CFO-Agent (Finanzen)
| Attribut | Wert |
|----------|------|
| Department | Finance |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Autonomie | approval-required |
| Tools | Buchhaltungstool (nur Entwuerfe), Banking (lesend), Budget |
| Human Approval | **ALLE Zahlungen, Rechnungen, Preiszusagen** |
| KPIs | Deckungsbeitrag, Prognosegenauigkeit, Liquiditaet |

#### CLO-Agent (Recht)
| Attribut | Wert |
|----------|------|
| Department | Legal/Compliance |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Autonomie | approval-required |
| Tools | Vertragsvorlagen, Dokumentenmanagement, Risk Scoring |
| Human Approval | Vertraege, AGB, Behoerdenkommunikation |
| KPIs | Saubere Vertragsbasis, rechtliche Beanstandungen (Ziel: 0) |

#### CISO-Agent (Sicherheit)
| Attribut | Wert |
|----------|------|
| Department | Security |
| Budgetlimit | 0 EUR |
| Risk Ceiling | critical |
| Autonomie | supervised |
| Tools | Secrets Manager, RBAC, Audit Logs, Monitoring |
| Human Approval | Datenpannen-Meldung, weitreichende Rechte |
| KPIs | Sicherheitsvorfälle, MTTR, Patch-Aktualitaet |

#### CPO-Agent (Produkt)
| Attribut | Wert |
|----------|------|
| Department | Product |
| Budgetlimit | 0 EUR |
| Risk Ceiling | medium |
| Autonomie | supervised |
| Tools | Roadmap-Tools, Analytics, Komponentenbibliothek |
| Human Approval | Neue Produktlinien, Preisaenderungen |
| KPIs | Wiederkaufrate, Marge, Standardisierungsgrad |

#### CHRO-Agent (Human Operations)
| Attribut | Wert |
|----------|------|
| Department | Human Workforce |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Autonomie | approval-required |
| Tools | Freelancer-Plattformen, CRM fuer Menschen, Bewertungssystem |
| Human Approval | Beauftragung, Verguetung, Kuendigung |
| KPIs | Freelancer-Qualitaet, Time-to-Fill, Nacharbeitsquote |

### Fach-Agenten

#### Brand-Agent
| Attribut | Wert |
|----------|------|
| Department | Marketing |
| Budgetlimit | 200 EUR |
| Risk Ceiling | low |
| Tools | Design-Tools, Brand-Kit, Content-Bibliothek |

#### Sales-Agent
| Attribut | Wert |
|----------|------|
| Department | Sales |
| Budgetlimit | 0 EUR |
| Risk Ceiling | medium |
| Tools | LinkedIn, CRM, Angebotsvorlagen |
| Human Approval | Verbindliche Angebote, Akquise-Kampagnen |

#### Procurement-Agent (Einkauf)
| Attribut | Wert |
|----------|------|
| Department | Operations |
| Budgetlimit | 50 EUR (Mikro-Limit) |
| Risk Ceiling | medium |
| Tools | Einkaufsplattformen, Lieferantenregister, Budget |
| Human Approval | Bestellung > 250 EUR, Abos, neue Lieferanten |

#### QA-Agent (Qualitaetssicherung)
| Attribut | Wert |
|----------|------|
| Department | QA |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Autonomie | supervised |
| Tools | Test-Frameworks, Linter, Checklisten, Fehlerdatenbank |
| Human Approval | Strittige Qualitaet, Veto-Auslieferung |
| KPIs | Fehler nach Auslieferung (Ziel: 0), First-Pass-Quote |

#### Customer-Support-Agent
| Attribut | Wert |
|----------|------|
| Department | Support |
| Budgetlimit | 0 EUR |
| Risk Ceiling | low |
| Tools | Ticketsystem, Wissensbasis, CRM, E-Mail |
| Human Approval | Kulanz, Erstattung, Eskalation |

#### Field-Operations-Agent
| Attribut | Wert |
|----------|------|
| Department | Operations |
| Budgetlimit | 0 EUR |
| Risk Ceiling | high |
| Tools | Operator-Register, Kalender, Briefings, Karten |
| Human Approval | Physische Beauftragung, Sicherheitseinsaetze |

#### Safety-Agent
| Attribut | Wert |
|----------|------|
| Department | Security |
| Budgetlimit | 0 EUR |
| Risk Ceiling | critical |
| Autonomie | supervised |
| Tools | Risk Scoring, Simulation, Audit Logs, Incident Management |
| Human Approval | Aufhebung Safety-Veto, schwere Vorfaelle |
| KPIs | Verhinderte Vorfaelle, False-Positive-Rate |

#### Audit-Agent
| Attribut | Wert |
|----------|------|
| Department | Audit |
| Budgetlimit | 0 EUR |
| Risk Ceiling | critical |
| Autonomie | supervised |
| Tools | Audit Logs, Reporting, Registry, Evaluation |
| KPIs | Protokoll-Lueckenlosigkeit (100%), Erklaerbarkeit |

#### Knowledge-Agent
| Attribut | Wert |
|----------|------|
| Department | Internal Tools |
| Budgetlimit | 100 EUR |
| Risk Ceiling | low |
| Tools | Wissensdatenbank, Notion, Dokumentenverwaltung |

#### Pricing-Agent
| Attribut | Wert |
|----------|------|
| Department | Finance |
| Budgetlimit | 0 EUR |
| Risk Ceiling | medium |
| Tools | Kalkulationsvorlagen, Nachkalkulations-Engine |
| Human Approval | Jede verbindliche Preiszusage |

#### Doc-Agent
| Attribut | Wert |
|----------|------|
| Department | Internal Tools |
| Budgetlimit | 50 EUR |
| Risk Ceiling | low |
| Tools | Repo-README, Projektakte, Doku-Generierung |

#### Marketing-Agent
| Attribut | Wert |
|----------|------|
| Department | Marketing |
| Budgetlimit | 200 EUR |
| Risk Ceiling | medium |
| Tools | Content-Tools, Analytics, Social-Media-Plattformen |
| Human Approval | Oeffentliche Kampagnen, Markenentscheidungen |

#### Analytics-Agent
| Attribut | Wert |
|----------|------|
| Department | Internal Tools |
| Budgetlimit | 100 EUR |
| Risk Ceiling | low |
| Tools | Analytics-Plattformen, Dashboard-Daten, Reporting |

## Budget-Gesamtoersicht

| Agent | Budgetlimit | Verbrauch (Mock) |
|-------|-------------|-----------------|
| Human CEO | unbegrenzt | — |
| CEO-Agent | 0 EUR | 0 EUR |
| CFO-Agent | 0 EUR | 0 EUR |
| CLO-Agent | 0 EUR | 0 EUR |
| CISO-Agent | 0 EUR | 0 EUR |
| CPO-Agent | 0 EUR | 0 EUR |
| CHRO-Agent | 0 EUR | 0 EUR |
| Brand-Agent | 200 EUR | 145 EUR |
| Sales-Agent | 0 EUR | 0 EUR |
| Procurement | 50 EUR | 32 EUR |
| QA-Agent | 0 EUR | 0 EUR |
| Support | 0 EUR | 0 EUR |
| Field-Ops | 0 EUR | 0 EUR |
| Safety | 0 EUR | 0 EUR |
| Audit | 0 EUR | 0 EUR |
| Knowledge | 100 EUR | 67 EUR |
| Pricing | 0 EUR | 0 EUR |
| Doc | 50 EUR | 23 EUR |
| Marketing | 200 EUR | 178 EUR |
| Analytics | 100 EUR | 89 EUR |

**Gesamtbudget Agenten:** 1.000 EUR/Monat

## Versionierung

Alle Agenten sind versioniert. Aenderungen erzeugen:
1. Neue Versionsnummer (SemVer)
2. Eintrag im Audit-Log
3. Regressionstest-Trigger

| Agent | Version | Letzte Aenderung |
|-------|---------|-----------------|
| CEO-Agent | 1.2.0 | Tagesreport-Logik |
| CFO-Agent | 1.1.3 | Kalkulations-Engine |
| CTO-Agent | 1.3.1 | Build-Pipeline |
| (weitere) | 1.0.x | Initial |
