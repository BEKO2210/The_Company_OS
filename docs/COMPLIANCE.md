# Compliance — The Company OS

> **Hinweis:** Dieses Dokument beschreibt das Compliance-Modell. Es ersetzt keine Rechtsberatung. Konkrete Umsetzung (UG-Gruendung, Vertraege, AGB, Versicherungen, DSGVO-Dokumentation) gehoert in die Haende von Steuerberater und Anwalt.

## Kontrollgaemien

### Audit Board
- Phase 0: Gruender + ggf. externer Berater
- Phase 2+: 2-3 Personen, mind. 1 extern/unabhaengig
- Prueft: Audit-Logs, Incidents, Agentenentscheidungen
- Taktung: Phase 0 woechentlich, Phase 2+ monatlich

### Compliance Board
- Phase 0: Gruender + CLO-Agent + Anwalt auf Abruf
- Verantwortung: Regelwerk, Datenschutz, UWG, Arbeitsrecht
- Output: Lebende Compliance-Checkliste

### Datenschutzverantwortlicher
- Phase 0: Gruender selbst (DSB-Pflicht pruefen lassen)
- Verzeichnis von Verarbeitungstaetigkeiten
- AVV mit allen Anbietern
- Loesch-/Aufbewahrungskonzept
- Betroffenenrechte
- Datenpannen-Prozess (72h)

## DSGVO-Checkliste

### Technische Massnahmen
- [x] Datenschutz-Freundliche Standardeinstellungen (Privacy by Design)
- [x] Sensible Daten bevorzugt lokal (Ollama)
- [x] RBAC mit Least Privilege
- [x] Audit-Logs fuer jeden Zugriff
- [x] Verschluesselung (TLS 1.3, AES-256)
- [x] Kein Klartext-Secrets
- [ ] **PENDING:** AVV mit Supabase/Cloudflare/Vercel
- [ ] **PENDING:** Formelles Verzeichnis der VT
- [ ] **PENDING:** Betroffenenrechte-Prozess

### Verarbeitungstaetigkeiten (Beispiele)

| VT | Rechtsgrundlage | Speicherung | Aufbewahrung |
|----|----------------|-------------|--------------|
| Kundendaten | Vertrag | Supabase (EU) | 10 Jahre |
| Agent-Logs | Berechtigtes Interesse | Supabase + R2 | 7 Jahre |
| Freelancer-Daten | Vertrag | Supabase (EU) | 10 Jahre |
| LinkedIn-Daten | Einwilligung | Lokal | 2 Jahre |

### Datenpannen-Prozess
1. Erkennung (Safety/CISO/Agent)
2. Dokumentation (Audit-Log)
3. Bewertung (Schweregrad)
4. Meldung Aufsichtsbehoerde: **innerhalb 72h**
5. ggf. Information Betroffener
6. Abhilfe-Massnahmen
7. Abschlussbericht

## UWG-Checkliste (Werberecht)

### Akquise-Regeln
- [x] Kein Kalt-E-Mail-Massenversand ohne Einwilligung
- [x] Kein Spam
- [x] LinkedIn-Outbound im Rahmen der Plattformregeln
- [x] UWG-konforme Ansprache
- [x] DSGVO-konforme Datenverarbeitung
- [ ] **PENDING:** Anwaltliche Pruefung der Ansprache-Templates
- [ ] **PENDING:** Opt-Out-Verfahren dokumentiert

### Marketing-Texte
- [x] Keine irrefuehrende Werbung
- [x] Keine Dark Patterns
- [x] Ehrliche Kommunikation ueber Grenzen
- [x] CLO-Agent prueft werbliche Aussagen
- [ ] **PENDING:** AGB/Impressum/Datenschutzerklaerung

## Vertrags-Checkliste

### Vorlagen-Status

| Vorlage | Status | Pruefung |
|---------|--------|----------|
| Werkvertrag | Seed erstellt | Anwalt |
| NDA | Seed erstellt | Anwalt |
| AGB | Seed erstellt | Anwalt |
| Auftragsbestaetigung | Seed erstellt | Anwalt |
| AVV | Seed erstellt | Anwalt |

### Vertragsfreigabe-Prozess
1. CLO-Agent prueft gegen Vorlage
2. Risk-Score vergeben
3. Kritische Klauseln markieren
4. Empfehlung erstellen
5. **HUMAN APPROVAL** (immer!)
6. Anwalt bei Risiko > Schwelle

## Arbeitsrecht-Checkliste

### Freelancer
- [x] Scheinselbststaendigkeit vermeiden
- [x] Keine Weisungsabhaengigkeit
- [x] Eigene Betriebsmittel
- [x] Mehrere Auftraggeber
- [x] CLO-Agent prueft Vertragsform
- [ ] **PENDING:** Steuerberater-Pruefung

### Festangestellte (ab Phase 2)
- [ ] Vertraege (Steuerberater)
- [ ] Lohnabrechnung
- [ ] Sozialversicherung
- [ ] Arbeitszeit

### Kuendigung
- **IMMER MENSCH** — niemals Agent
- Formale Kuendigungsfristen beachten
- Kuendigungsschutz

## Versicherungs-Checkliste

| Versicherung | Phase | Status |
|-------------|-------|--------|
| Betriebs-/Berufshaftpflicht (IT/Medien) | 0 | **PENDING** |
| Vermoegensschadenhaftpflicht | 0 | **PENDING** |
| Cyber-Versicherung | 1 | Geplant |
| Rechtsschutz (gewerblich) | 1 | Geplant |
| D&O / erweiterte Deckung | 2-3 | Geplant |
| Branchenspezifisch (C/G) | vor Aktivierung | Geplant |

**Faustregel:** Keine Unit mit physischer/erhoehter Haftung aktivieren, bevor die passende Deckung steht.

## EU AI Act (Stand 2026)

### Risikoklassifizierung
- Das System faellt unter "begrenztes Risiko" (Transparenzpflicht)
- Kein "hohes Risiko" (keine kritische Infrastruktur, keine Bildung, keine Justiz)
- Monitoring fuer Aenderungen

### Pflichten
- [x] Transparenz: Kunde weiss, dass AI involviert ist
- [x] Keine Taeuschung: AI-Output gekennzeichnet wenn gefragt
- [x] Menschliche Kontrolle: Human-in-the-loop bei kritischen Entscheidungen
- [ ] **PENDING:** Formelle Konformitaetsbewertung
- [ ] **PENDING:** CE-Kennzeichnung (falls relevant)

## Rechtliche Struktur

### Rechtsform: UG (haftungsbeschraenkt)
- Haftungsbeschraenkung auf Gesellschaftsvermoegen
- Stammkapital ab 1 EUR (Empfehlung: 1.000+ EUR)
- Gruendungskosten: 300-800 EUR
- Steuerberater ab Tag 1

### Haftungsstrategie
1. UG = erster Schutz
2. AGB mit Haftungsbegrenzung
3. Klare Scopes & Akzeptanzkriterien
4. Scope klein halten bis Absicherung steht
5. Menschliche Endkontrolle
6. Versicherung ab erstem Umsatz

## Compliance-Metriken (Dashboard)

| Metrik | Ziel | Aktuell |
|--------|------|---------|
| Offene Compliance-Flags | 0 | 0 |
| Ueberfaellige Vertragspruefungen | 0 | 0 |
| DSGVO-Vorfaelle | 0 | 0 |
| UWG-Beanstandungen | 0 | 0 |
| Versicherungsdeckung | 100% | 0% (Phase 0) |
