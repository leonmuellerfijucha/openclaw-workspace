---
name: semantic-memory
description: "Verwalte kognitive Gedächtnisschichten (episodisch & semantisch) mit Supabase und pgvector. Ermöglicht dem OpenClaw-Agenten autonome Gedächtniskonsolidierung, Abruf und Lernen."
---

# Semantic Memory Skill (Semantisches Gedächtnis)

Dieser Skill bietet dem OpenClaw-Agenten eine hochentwickelte kognitive Gedächtnisarchitektur unter Verwendung von Supabase als externer Datenbank. Er implementiert ein Zwei-Schichten-Gedächtnismodell:

1. **Episodisches Gedächtnis** (`memory.episodic_memory`): Rohe Ereignisprotokolle mit Zeitstempeln
2. **Semantisches Wissen** (`memory.semantic_knowledge`): Destillierte, durchsuchbare Fakten und Konzepte

## Architektur

- **Datenbank**: Supabase (PostgreSQL)
- **Vektor-Engine**: pgvector-Erweiterung (im `extensions`-Schema)
- **Indizierung**: HNSW (Hierarchical Navigable Small World) für hochperformante semantische Abfragen
- **Schema-Isolierung**: Alle Gedächtnistabellen befinden sich in einem dedizierten `memory`-Schema (der "Clean Room")

## Kernfunktionen

### 1. Verwaltung des episodischen Gedächtnisses
Einfügen von rohen Ereignissen, Beobachtungen und Erfahrungen mit automatischer Zeitstempelung.

```sql
INSERT INTO memory.episodic_memory (content, embedding, metadata)
VALUES ('Agent hat Aufgabe X abgeschlossen', '[vektor]', '{"quelle": "aufgabenabschluss"}');
```

### 2. Verwaltung des semantischen Wissens
Speichern von destillierten Fakten, Konzepten und gelernten Mustern.

```sql
INSERT INTO memory.semantic_knowledge (concept, description, importance, embedding)
VALUES ('Aufgaben-X-Muster', 'Wenn Bedingung Y eintritt, führe Z aus', 0.8, '[vektor]');
```

### 3. Vektor-Ähnlichkeitssuche
Abruf relevanter Erinnerungen mittels Cosinus-Ähnlichkeit.

```sql
SELECT *, 1 - (embedding <=> '[abfrage_vektor]') as similarity
FROM memory.semantic_knowledge
WHERE 1 - (embedding <=> '[abfrage_vektor]') > 0.7
ORDER BY embedding <=> '[abfrage_vektor]'
LIMIT 5;
```

### 4. Gedächtniskonsolidierung (Episodisch → Semantisch)
Extraktion von Mustern aus episodischen Protokollen und Überführung in semantisches Wissen.

Logik:
- Abfrage aktueller episodischer Ereignisse
- Identifizierung wiederkehrender Muster oder bedeutender Fakten
- Generierung von Embeddings für Konzepte
- Einfügen in die Tabelle `semantic_knowledge`
- Markierung der episodischen Einträge als "konsolidiert" in den Metadaten

## Sicherheitsmodell: Intelligente Autonomie

Dieser Skill arbeitet mit **kontrollierter Freiheit**:

- **Kontrollierter Master-Key**: Verwendet den Supabase `service_role`-Key für vollen Datenbankzugriff
- **Funktionale Eingrenzung**: Beschränkt auf Operationen im `memory`-Schema
- **Umgebungsisolierung**: Zugangsdaten werden in sicheren Umgebungsvariablen gespeichert (`SUPABASE_SECRET_KEY`)
- **Kein RLS erforderlich**: Die Schema-Isolierung macht komplexe Row Level Security-Richtlinien überflüssig

## Nutzungsmuster

### Speichern einer neuen Erinnerung (Episodisch)
```sql
-- Agent lernt etwas Neues
INSERT INTO memory.episodic_memory (content, metadata)
VALUES (
  'Nutzer bevorzugt Meetings am Morgen',
  '{"kontext": "nutzerpräferenz", "konfidenz": 0.9}'
);
```

### Abrufen von relevantem Kontext (Semantische Suche)
```sql
-- Vor der Antwort an den Nutzer das semantische Gedächtnis prüfen
SELECT concept, description, importance
FROM memory.semantic_knowledge
ORDER BY embedding <=> '[aktueller_kontext_vektor]'
LIMIT 3;
```

### Konsolidierung von Erinnerungen (Periodische Aufgabe)
```sql
-- Periodisch ausführen (z.B. täglich via cron)
-- Extrahiere häufige Muster aus dem episodischen Gedächtnis
-- Füge sie in das semantische Wissen ein
-- Markiere episodische Einträge als verarbeitet
```

## Integration mit OpenClaw

Dieser Skill integriert sich in OpenClaw durch:

1. **MCP Server**: Verwendet den Supabase MCP Server für strukturierten Datenbankzugriff
2. **Direktes SQL**: Fällt auf `supabase__execute_sql` zurück, wenn nötig
3. **Embedding-Generierung**: Nutzt das in OpenClaw konfigurierte Embedding-Modell
4. **Cron-Integration**: Die Konsolidierung kann als isolierte Cron-Jobs geplant werden

## Best Practices

- **Embedding-Konsistenz**: Verwende immer dasselbe Embedding-Modell für alle Vektoren
- **Metadaten-Reichtum**: Füge Kontext in den Metadaten hinzu, um den Abruf zu verbessern
- **Wichtigkeitsbewertung**: Bewerte semantische Fakten von 0.0 bis 1.0 zur Priorisierung
- **Periodische Konsolidierung**: Führe die Konsolidierungslogik regelmäßig aus, um episodischen Ballast zu vermeiden
- **Schema-Sicherheit**: Führe niemals DDL-Operationen aus; nur DML (SELECT, INSERT, UPDATE)

## Fehlerbehandlung

- Verbindungsausfälle: Wiederholung mit exponentiellem Backoff
- Embedding-Abweichungen: Überprüfe die Vektor-Dimensionen (1536 für OpenAI Embeddings)
- Schema-Verletzungen: Alle Operationen sind auf das `memory`-Schema beschränkt

---

*Dieser Skill verwandelt OpenClaw von einem zustandslosen Antwortgeber in einen lernenden Agenten mit permanentem, durchsuchbarem Gedächtnis.*
