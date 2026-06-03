# Logik zur Gedächtniskonsolidierung

## Übersicht
Dieses Dokument definiert den Prozess der Umwandlung von rohen episodischen Erinnerungen in destilliertes semantisches Wissen.

## Auslösebedingungen
Die Konsolidierung sollte laufen:
- Periodisch (z.B. täglich via cron)
- Wenn die Anzahl der episodischen Erinnerungen einen Schwellenwert überschreitet (z.B. 100 neue Einträge)
- Wenn der Agent eine Lerngelegenheit identifiziert

## Konsolidierungs-Algorithmus

### Schritt 1: Identifizierung bedeutender episodischer Erinnerungen
```sql
SELECT id, timestamp, content, metadata
FROM memory.episodic_memory
WHERE (metadata->>'consolidated')::boolean IS NOT TRUE
   OR metadata->>'consolidated' IS NULL
ORDER BY timestamp DESC
LIMIT 50;
```

### Schritt 2: Muster-Extraktion
Der Agent (unter Nutzung seiner LLM-Fähigkeiten) analysiert die ausgewählten episodischen Erinnerungen, um Folgendes zu identifizieren:
- Wiederkehrende Muster
- Nutzerpräferenzen
- Strategien zur Aufgabenerfüllung
- Fehlermuster und Lösungen
- Wichtige Fakten oder Entscheidungen

### Schritt 3: Generierung semantischer Repräsentationen
Für jedes identifizierte Muster/Konzept:
1. Erstelle einen prägnanten Konzeptnamen
2. Schreibe eine Beschreibung, die den Kern trifft
3. Weise einen Wichtigkeitswert zu (0.0 - 1.0):
   - 1.0: Kritischer Fakt (Nutzeridentität, Kernregeln)
   - 0.7-0.9: Wichtiges Muster (Workflows, Präferenzen)
   - 0.4-0.6: Nützlicher Kontext (frühere Entscheidungen, Begründungen)
   - 0.0-0.3: Geringfügige Beobachtung (unbedeutende Details)

### Schritt 4: Speichern im semantischen Wissen
```sql
INSERT INTO memory.semantic_knowledge 
  (concept, description, importance, embedding, last_updated)
VALUES 
  ('[Konzept]', '[Beschreibung]', [Wichtigkeitswert], '[embedding]', now());
```

### Schritt 5: Markieren der episodischen Erinnerungen als konsolidiert
```sql
UPDATE memory.episodic_memory
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{consolidated}', 
  'true'
)
WHERE id IN ([Liste der konsolidierten episodischen IDs]);
```

## Ähnlichkeitsbasierte Konsolidierung

Bevor neue semantische Einträge erstellt werden, prüfe auf bereits existierende ähnliche Konzepte:

```sql
SELECT concept, description, importance
FROM memory.semantic_knowledge
WHERE 1 - (embedding <=> '[neuer_konzept_vektor]') > 0.85
ORDER BY embedding <=> '[neuer_konzept_vektor]'
LIMIT 1;
```

Wenn ein ähnliches Konzept existiert:
- **Zusammenführen (Merge)**: Aktualisiere den bestehenden Eintrag mit neuen Informationen
- **Wichtigkeit erhöhen**: Berechne den Durchschnitt der Wichtigkeitswerte
- **Zeitstempel aktualisieren**: Aktualisiere `last_updated`

Wenn kein ähnliches Konzept existiert:
- **Neu erstellen**: Füge einen neuen semantischen Eintrag hinzu

## Beispiel für einen Konsolidierungs-Ablauf

**Episodischer Input:**
1. "Nutzer sagte, er bevorzugt Meetings am Morgen um 9 Uhr"
2. "Nutzer hat Kalendereinladung für 9-Uhr-Meeting angenommen"
3. "Nutzer schien mit dem 9-Uhr-Standup zufrieden zu sein"

**Extrahierter semantischer Begriff:**
- Konzept: "Präferenz für Morgen-Meetings"
- Beschreibung: "Nutzer bevorzugt die Terminierung von Meetings um 9 Uhr und reagiert positiv auf morgendliche Sitzungen"
- Wichtigkeit: 0.8 (starkes Präferenzmuster)
- Embedding: Generiert aus Konzept + Beschreibung

## Automatisierter Cron-Job

```json
{
  "name": "memory-consolidation",
  "schedule": { "kind": "cron", "expr": "0 2 * * *", "tz": "UTC" },
  "payload": {
    "kind": "agentTurn",
    "message": "Führe die Gedächtniskonsolidierung aus: Analysiere aktuelle episodische Erinnerungen, extrahiere Muster und aktualisiere die semantische Wissensbasis."
  },
  "sessionTarget": "isolated"
}
```

## Best Practices

1. **Nicht überkonsolidieren**: Nicht jede episodische Erinnerung muss zu semantischem Wissen werden
2. **Rohdaten erhalten**: Lösche episodische Erinnerungen nach der Konsolidierung niemals
3. **Aktualisieren statt Duplizieren**: Wenn semantisches Wissen existiert, aktualisiere es, anstatt neue Einträge zu erstellen
4. **Wichtigkeits-Abnahme (Decay)**: Reduziere periodisch die Wichtigkeit nicht mehr genutzter semantischer Informationen
5. **Mensch-im-Loop**: Bei sehr wichtigen Fakten die Bestätigung des Nutzers einholen, bevor sie als semantisches Wissen gespeichert werden
