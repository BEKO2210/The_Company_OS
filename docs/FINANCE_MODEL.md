# Finanzmodell — The Company OS

> **Hinweis:** Alle Zahlen sind Modellannahmen fuer die Planung, keine Prognosen. Reale Zahlen weichen ab — das Modell wird mit echten Daten laufend korrigiert.

## Phase 0 — Solo-Founder mit AI-Agenten

### Monatliche Kosten (Modellannahme)

| Posten | Monatlich |
|--------|-----------|
| Cloud-Modelle (API, Multi-Provider) | 50-200 EUR |
| Infrastruktur (Supabase/Cloudflare/Vercel) | 0-30 EUR |
| Buchhaltungstool (lexoffice/sevDesk) | 10-20 EUR |
| Domains/Hosting/Tools | 20-50 EUR |
| LinkedIn (Premium) | 0-60 EUR |
| Steuerberater (anteilig) | 50-150 EUR |
| Ruecklage Recht/Versicherung | 50-100 EUR |
| **Summe** | **~230-610 EUR/Monat** |

### Einmalige Kosten
- UG-Gruendung: 300-800 EUR (Notar, Register, Stammkapital)
- Optionale Hardware fuer Ollama: 0 EUR (nur falls vorhanden)

### Umsatzquellen
- **Projektgeschaeft** (8.2): Landingpage in 48h (750-1.500 EUR)
- **Wartung** (8.6): Monatliche Retainer (ab erstem Projekt)

### Break-even-Logik

```
Break-even = wenn Deckungsbeitrag > monatliche Fixkosten

Bei 1-2 Projekten/Monat (750-1.500 EUR/Projekt)
= 750-3.000 EUR Deckungsbeitrag

Fixkosten: ~230-610 EUR
=> Break-even bei ca. 1 Projekt/Monat!
```

### Kritische KPIs
- Erster zahlender Kunde (Tag X)
- Deckungsbeitrag pro Projekt
- Liquiditaetsreichweite (Monate)
- Ausgelieferte Projekte
- Wiederbeauftragungsquote

## Phase 1 — 3-5 Menschen + Agentensystem

### Monatliche Kosten
- **~4.000-12.000 EUR** (dominiert von Personal)
- Tool-/Modellkosten: 300-800 EUR

### Umsatzquellen
- 8.2 + 8.6 skaliert
- Start 8.1 (erste SaaS-Experimente)
- Unit D (Marketing-Retainer)

## Phase 2 — 15-30 Menschen + spezialisierte Units

### Monatliche Kosten
- **~60.000-180.000 EUR** (ueberwiegend Personal)
- Modell-/Infrakosten: 2.000-8.000 EUR

### Umsatzquellen
- 8.1, 8.2, 8.3, 8.6 voll
- 8.4 (Managed Operations) startet
- 8.9 (White-Label-OS) wird vorbereitet

## Phase 3-4

### Phase 3: ~250.000-700.000 EUR/Monat
### Phase 4: Dezentral je Tochter

## Einnahmequellen-Bewertung

| # | Quelle | Schnell | Langfristig | Kapital | Marge | Phase |
|---|--------|---------|-------------|---------|-------|-------|
| 8.2 | Projektgeschaeft | ★★★ | ★☆☆ | Sehr niedrig | Mittel→Hoch | **0** |
| 8.6 | Wartung | ★★☆ | ★★★ | Sehr niedrig | Sehr hoch | **0** |
| 8.1 | SaaS-Abos | ★☆☆ | ★★★ | Niedrig | Hoch | 1-2 |
| 8.3 | Agent-as-a-Service | ★☆☆ | ★★☆ | Niedrig | Hoch | 2 |
| 8.9 | White-Label-OS | ☆☆☆ | ★★★ | Mittel | Sehr hoch | 2→4 |

## Budgetlogik im System

### Budget-Limits

| Ebene | Standard | Optional |
|-------|----------|----------|
| Pro Agent | 0 EUR | ≤ 20-50 EUR Mikro-Limit |
| Pro Studio/Unit | Individuell | — |
| Pro Monat (Cloud-Modelle) | Task-Budget | Tageskappung |

### Warnstufen
- **70%**: Warning (gelb)
- **90%**: Kritisch (orange)
- **100%**: Blockiert (rot)

### Payment Blocking
- Zahlungen > 0 EUR = **IMMER blockiert**
- Rechnungen = Entwurf → Human Approval → Versand
- Budget ueberschritten = Keine weiteren Ausgaben

## Liquiditaetsmodell

### Dashboard-Anzeige
- Banksaldo (Digital Twin)
- Liquiditaetsreichweite (Monate)
- Burn pro Monat
- Offene Rechnungen
- Ueberfaellige Rechnungen

### Abgleich
- CFO-Agent gleicht Digital Twin mit Bank (lesend) ab
- Abweichung = Alarm

## Rechnungsprozess

1. CFO-Agent erstellt **Entwurf**
2. Pruefung gegen Auftrag/Scope
3. **HUMAN APPROVAL** (rote Linie)
4. Versand (nur nach Freigabe)
5. Zahlungseingang verfolgen
6. Mahnung bei Ueberfaelligkeit

## Kalkulationsmodell

### Landingpage in 48h

| Position | Kosten |
|----------|--------|
| Modellnutzung | 20-50 EUR |
| Hosting/Domain | 5-15 EUR |
| QA/Review | 0 EUR (intern) |
| Freelancer (Design) | 0-200 EUR (optional) |
| **Gesamtkosten** | **25-265 EUR** |
| **Preis Kunde** | **750-1.500 EUR** |
| **Marge** | **~70-95%** |

### Marge-Steigerung ueber Zeit
- Projekt #1: ~70% Marge (viel Handarbeit)
- Projekt #10: ~85% Marge (70-80% Wiederverwendung)
- Projekt #50: ~90% Marge (industrialisiert)

## Finanzierung

### Phase 0-1: Bootstrapped
- Strikte Selbstfinanzierung aus Cashflow
- Kein Fremdkapital vor nachweisbarem Modell
- Investoren erst ab Phase 2 sinnvoll

### Sensitivitaeten

| Hebel | Wirkung |
|-------|---------|
| Akquise-Conversion | Kritischer Faktor Phase 0 |
| Nacharbeitsquote | Frisst Marge direkt |
| Wiederverwendungsgrad | Hebt Marge am staerksten |
| Wartungs-Abschlussquote | Planbarer MRR |
| Cloud-Modellkosten | Ollama-Anteil schuetzt Marge |
| Zeitanteil OS-Bau vs. Umsatz | Zu viel OS verzoegert Break-even |
