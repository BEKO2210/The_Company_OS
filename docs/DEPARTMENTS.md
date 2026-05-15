# Abteilungen — The Company OS

## Uebersicht

The Company hat **14 Abteilungen**, organisiert nach Funktion. Jede Abteilung hat einen Lead-Agenten, mehrere zugeordnete Agenten und klare Verantwortlichkeiten.

## Alle Abteilungen

### 1. Executive Council
| Attribut | Wert |
|----------|------|
| Lead | Human CEO / CEO-Agent |
| Status | aktiv |
| Verantwortung | Strategie, Governance, Gesamtsteuerung |
| Agenten | Human CEO, CEO-Agent |
| KPIs | Automationsgrad, Liquiditaet, Zielerreichung |

### 2. Sales
| Attribut | Wert |
|----------|------|
| Lead | Sales-Agent |
| Status | aktiv |
| Verantwortung | Akquise, Angebote, Pipeline |
| Agenten | Sales-Agent |
| KPIs | Pipeline-Wert, Conversion-Rate, Neue Leads |
| Akquise-Regeln | UWG-konform, kein Spam, LinkedIn-Regeln |

### 3. Product
| Attribut | Wert |
|----------|------|
| Lead | CPO-Agent |
| Status | aktiv |
| Verantwortung | Produktstrategie, Roadmap, Standardisierung |
| Agenten | CPO-Agent |
| KPIs | Wiederkaufrate, Marge, Standardisierungsgrad |

### 4. Engineering
| Attribut | Wert |
|----------|------|
| Lead | CTO-Agent |
| Status | aktiv |
| Verantwortung | Technik, Architektur, Deployment, Hosting |
| Agenten | CTO-Agent |
| KPIs | Fehlerrate, Build-Erfolgsquote, Wiederverwendung |

### 5. QA (Quality Assurance)
| Attribut | Wert |
|----------|------|
| Lead | QA-Agent |
| Status | aktiv |
| Verantwortung | Qualitaetssicherung, Tests, Veto-Recht |
| Agenten | QA-Agent |
| KPIs | Fehler nach Auslieferung (Ziel: 0), First-Pass-Quote |
| Besonderheit | Kann jede Auslieferung blockieren (Veto) |

### 6. Finance
| Attribut | Wert |
|----------|------|
| Lead | CFO-Agent |
| Status | aktiv |
| Verantwortung | Finanzen, Budgets, Rechnungen, Liquiditaet |
| Agenten | CFO-Agent, Pricing-Agent |
| KPIs | Deckungsbeitrag, Prognosegenauigkeit, Liquiditaet |
| Rote Linien | Alle Zahlungen, Rechnungen, Preiszusagen |

### 7. Legal/Compliance
| Attribut | Wert |
|----------|------|
| Lead | CLO-Agent |
| Status | aktiv |
| Verantwortung | Recht, Vertraege, DSGVO, UWG, Arbeitsrecht |
| Agenten | CLO-Agent |
| KPIs | Saubere Vertragsbasis, rechtliche Beanstandungen (Ziel: 0) |
| Extern | Rechtsanwalt (auf Abruf) |

### 8. Security
| Attribut | Wert |
|----------|------|
| Lead | CISO-Agent |
| Status | aktiv |
| Verantwortung | IT-Sicherheit, RBAC, Secrets, Monitoring |
| Agenten | CISO-Agent, Safety-Agent |
| KPIs | Sicherheitsvorfälle, MTTR, Patch-Aktualitaet |

### 9. Operations
| Attribut | Wert |
|----------|------|
| Lead | COO-Agent |
| Status | aktiv |
| Verantwortung | Betrieb, Projekte, Kalender, Einkauf |
| Agenten | COO-Agent, Procurement-Agent, Field-Operations-Agent |
| KPIs | Termintreue, Eskalationsquote, Ruestzeit |

### 10. Human Workforce
| Attribut | Wert |
|----------|------|
| Lead | CHRO-Agent |
| Status | aktiv |
| Verantwortung | Freelancer, Vendors, Experten, Bewertung |
| Agenten | CHRO-Agent |
| KPIs | Freelancer-Qualitaet, Time-to-Fill, Nacharbeitsquote |

### 11. Marketing
| Attribut | Wert |
|----------|------|
| Lead | Marketing-Agent |
| Status | aktiv |
| Verantwortung | Inhalte, Brand, Social Media, Content |
| Agenten | Marketing-Agent, Brand-Agent |
| KPIs | Reichweite, Engagement, Conversion |

### 12. Support
| Attribut | Wert |
|----------|------|
| Lead | Customer-Support-Agent |
| Status | aktiv |
| Verantwortung | Kundensupport, Tickets, Wissensbasis |
| Agenten | Customer-Support-Agent |
| KPIs | Reaktionszeit, Aufloesungsrate, Kundenzufriedenheit |

### 13. Audit
| Attribut | Wert |
|----------|------|
| Lead | Audit-Agent |
| Status | aktiv |
| Verantwortung | Audit-Logs, Reviews, Red-Team-Tests |
| Agenten | Audit-Agent |
| KPIs | Protokoll-Lueckenlosigkeit (100%), Erklaerbarkeit |

### 14. Internal Tools
| Attribut | Wert |
|----------|------|
| Lead | Knowledge-Agent |
| Status | aktiv |
| Verantwortung | Wissen, Dokumentation, Analytics, OS-Verbesserung |
| Agenten | Knowledge-Agent, Doc-Agent, Analytics-Agent |
| KPIs | Dokumentationsabdeckung, Analytics-Genauigkeit |

## Organisations-Struktur

```
                    Human CEO
                       |
                  CEO-Agent
                       |
    +------+------+---+---+------+------+
    |      |      |       |      |      |
   COO    CTO    CFO     CLO   CISO   CPO   CHRO
    |      |      |       |      |      |      |
    |      |      |       |      |      |      |
   Ops   Eng    Fin     Leg   Sec   Prod   HumWf
    |      |      |       |      |      |      |
   P/FO   —    Pri     —     Saf   —     —
    |                    |
   Sales              Mar/Brand
    |
   Sup
    |
   Audit
    |
   IntT (Know/Doc/Ana)
```

## Zustandigkeiten-Matrix

| Bereich | Primaer | Sekundaer |
|---------|---------|-----------|
| Strategie | CEO | Human CEO |
| Finanzen | CFO | CEO |
| Technik | CTO | COO |
| Recht | CLO | CEO |
| Sicherheit | CISO | CLO |
| Produkt | CPO | CEO |
| Personal | CHRO | COO |
| Marketing | Marketing | Brand |
| Verkauf | Sales | COO |
| Support | Support | COO |
| Qualitaet | QA | CPO |
| Audit | Audit | CEO |
| Wissen | Knowledge | Analytics |

## Department-Health (Demo)

| Department | Status | Agenten | Tasks | Gesundheit |
|------------|--------|---------|-------|------------|
| Executive Council | ✅ aktiv | 2/2 | 5 | Gesund |
| Sales | ✅ aktiv | 1/1 | 3 | Gesund |
| Product | ✅ aktiv | 1/1 | 4 | Gesund |
| Engineering | ✅ aktiv | 1/1 | 6 | Gesund |
| QA | ✅ aktiv | 1/1 | 2 | Gesund |
| Finance | ✅ aktiv | 2/2 | 3 | Gesund |
| Legal/Compliance | ⚠️ aktiv | 1/1 | 1 | Warnung |
| Security | ✅ aktiv | 2/2 | 4 | Gesund |
| Operations | ✅ aktiv | 3/3 | 5 | Gesund |
| Human Workforce | ✅ aktiv | 1/1 | 2 | Gesund |
| Marketing | ✅ aktiv | 2/2 | 3 | Gesund |
| Support | ✅ aktiv | 1/1 | 4 | Gesund |
| Audit | ✅ aktiv | 1/1 | 2 | Gesund |
| Internal Tools | ✅ aktiv | 3/3 | 3 | Gesund |
