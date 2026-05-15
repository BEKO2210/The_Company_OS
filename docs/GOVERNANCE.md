# Governance — The Company OS

## Drei Kontrollmodi

### Human-in-the-loop
Mensch ist Teil des Ablaufs — ohne Freigabe geht es nicht weiter.

| Aktion | Warum |
|--------|-------|
| Zahlungen | Rote Linie — kein Geldabfluss ohne Mensch |
| Vertraege | Rechtsverbindlichkeit |
| Rechnungsversand | Geldbezug |
| Produktiv-Deployment | Kunden-Auswirkung |
| Freelancer-Beauftragung | Arbeitsrecht |
| Behoerdenkommunikation | Rechtliche Tragweite |
| Kuendigungen | Arbeitsrecht |
| Erstattungen | Geldabfluss |
| Aufhebung Safety-Veto | Sicherheitsrisiko |
| Physische Einsaetze | Sicherheit |

### Human-on-the-loop
Agenten handeln autonom, Mensch beobachtet, kann eingreifen.

| Aktion | Beispiele |
|--------|-----------|
| Recherche & Analyse | Marktrecherche, Kalkulation |
| Entwuerfe | Code, Texte, Designs |
| Kalender & Termine | Interne Planung |
| CRM & Pipeline | Lead-Updates |
| Standard-Support | Bekannte Faelle |
| Buchhaltungsentwuerfe | Belegerfassung |
| Simulationen | Was-waere-wenn |

### Human-in-command
Der Mensch setzt Ziele, Regeln, Grenzen und Prioritaeten.

| Bereich | Konfiguration |
|---------|---------------|
| Strategie | Business-Unit-Aktivierung |
| Regelwerk | Tool-Risikoklassen, Gates |
| Budgetrahmen | Limits je Studio/Unit |
| Prioritaeten | Projektreihenfolge |
| Limits | Risk Ceilings, Budgets |

## Approval Gates

### Gate-Struktur

Jedes Gate enthaelt:
- **Ausloeser**: Was das Gate oeffnet (z.B. "Rechnung > 0 EUR")
- **Approver**: Phase 0: immer der Gruender
- **Entscheidungsvorlage**: Was, Warum, Kosten, Risiko, Alternativen, Empfehlung
- **Ergebnis**: Signiert (wer, wann, was), unveraenderlich im Audit-Log
- **Verfall**: Timeout — ohne Freigabe = Fail-Closed

### Gate-Typen

| Typ | Ausloeser | Freigabe |
|-----|-----------|----------|
| Sofort-Gate | Rote Linie | Blockierend, sofort |
| Gebündelte Freigabe | Routine | 2x/Tag feste Slots |
| Treshold-Gate | Budget/Risk-Schwelle | Blockiert bei Ueberschreitung |

### Gebündelte Freigabe-Slots

- **Slot 1**: 08:00–08:30 (Morgens)
- **Slot 2**: 17:00–17:30 (Abends)
- Rote Linien eskalieren SOFORT, warten nicht auf Slot

## Audit-Log

### Eigenschaften
- **Append-only**: Keine Aenderung, kein Loeschen
- **Kryptographisch verkettet**: Jeder Eintrag referenziert den Hash des Vorigen
- **Unveraenderlich**: Gespeichert in Supabase (RLS) + R2 Export
- **Vollstaendig**: Jede relevante Agenten-Aktion

### Eintragsstruktur
```
ID, Timestamp, Agent, Version, Tool, Input/Output (Referenz),
Entscheidung, Freigabe-durch, Risk-Score, Hash
```

### Aufbewahrung
- Aktive Logs: 90 Tage in Supabase
- Langzeit: Export nach R2 (monatlich)
- Loeschung: Nie (nur nach gesetzlicher Aufbewahrungsfrist)

## Rote Linien (Technisch Verdrahtet)

```
Zahlung ────────[GATE: Human Approval]───(blockiert ohne Freigabe)
Vertrag ────────[GATE: Human Approval]───(blockiert ohne Freigabe)
Rechnung ───────[GATE: Human Approval]───(blockiert ohne Freigabe)
Deployment ─────[GATE: Human Approval]───(blockiert ohne Freigabe)
Freelancer ─────[GATE: Human Approval]───(blockiert ohne Freigabe)
Behoerde ───────[GATE: Human Approval]───(blockiert ohne Freigabe)
```

## Fail-Closed Prinzip

> **Wenn unklar ist, ob Approval noetig ist — dann ist Approval noetig.**

Das System verhaelt sich bei Unsicherheit konservativ:
1. Unklarer Risk-Score → Gate oeffnet
2. Fehlende Konfiguration → Blockieren
3. Timeout ohne Freigabe → Ablehnen
4. Kommunikationsabbruch → Eskalieren

## Eskalationsmatrix

| Ausloeser | Eskaliert an | Reaktionszeit |
|-----------|-------------|---------------|
| Budget/Geld ueberschritten | CFO → Gruender | Sofort, blockierend |
| Vertrag/Recht | CLO → Gruender | Vor jeder Zusage |
| Safety-Veto | Safety → Gruender | Sofort, blockierend |
| Sicherheitsvorfall | CISO → Gruender | Sofort, 72h bei DSGVO |
| Kundenbeschwerde | Support → COO → Gruender | Innerhalb Geschaeftstag |
| Qualitaets-Veto strittig | QA → Gruender | Vor Auslieferung |
| Agent anomal | Audit/Safety → Not-Aus → Gruender | Sofort, blockierend |

## Berichtswege

**Periodisch (taeglich, verdichtet):**
Fach-Agenten → C-Agent → CEO-Agent → Tagesvorlage → Human CEO

**Ereignisgetrieben (sofort):**
Rote Linie/Risk → Sofort-Eskalation → Human CEO
