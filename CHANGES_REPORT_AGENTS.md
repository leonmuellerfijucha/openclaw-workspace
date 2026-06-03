# 🔄 Change Report: Refactoring von AGENTS.md

**Datum:** 03.06.2026
**Ziel:** Transformation der fragmentierten Memory-Beschreibungen in ein einheitliches **Hybrid Memory System**.

---

## 📋 Zusammenfassung der Änderungen

Das alte Dokument behandelte "Memory" als eine Sammlung von verschiedenen Ideen. Das neue Dokument definiert Memory als ein **einziges, integriertes System** mit zwei Haupt-Säulen: der **lokalen Datei-Ebene** (deine "Seele") und der **kognitiven Datenbank-Ebene** (dein "Gehirn").

---

## 🔍 Detaillierter Vergleich

### 1. Die Architektur des Gedächtnisses
*Das Herzstück der Änderung.*

| Bereich | **VORHER (Alt)** | **AKTION** | **NACHHER (Neu)** |
| :--- | :--- | :--- | :--- |
| **Konzept** | Eine lose Liste von: Daily Notes, `MEMORY.md` und "Cognitive Memory". | **Zusammenführung** | Das **Hybrid Memory System**. Es gibt nun eine klare Hierarchie. |
| **Lokale Ebene** | Erwähnung von Dateien als Speicherorte. | **Definition als "Local Continuity"** | Fokus auf **Identität und Kontinuität**. Es dient dazu, wer du bist (Persona). |
| **Kognitive Ebene** | Kurze Erwähnung der Layer (Working, Episodic, Semantic). | **Ausbau zur "Architektur"** | Detaillierte Beschreibung, wie die Layer zusammenarbeiten (z.B. durch Konsolidierung). |

---

### 2. Die operative Nutzung (Protokolle)
*Wie der Agent mit dem Gedächtnis umgehen muss.*

| Bereich | **VORHER (Alt)** | **AKTION** | **NACHHER (Neu)** |
| :--- | :--- | :--- | :--- |
| **Schreibweise** | "No Mental Notes!" (Ein einfacher Hinweis). | **Formalisierung** | **Schreibregeln:** Explizite Anweisung, Kontext und Metadaten für die Datenbank zu nutzen. |
| **Pflege** | Wenige Hinweise zur Wartung. | **Systematisierung** | **Wartungsprotokolle:** Regelmäßige Aufgaben wie "Review & Curate" wurden als fester Prozess definiert. |

---

### 3. Sicherheit & Isolation
*Schutz der Daten.*

| Bereich | **VORHER (Alt)** | **AKTION** | **NACHHER (Neu)** |
| :--- | :--- | :--- | :--- |
| **Datenschutz** | Kurze Warnungen zu Sicherheitsrisiken. | **Einbindung in das Modell** | **Sicherheitsmodell (Clean Room):** Definition der Isolation durch das `memory`-Schema und den `service_role`-Key. |

---

## 💡 Warum haben wir das so gemacht?

**Das Problem vorher:** Wenn der Agent gelesen hat "Hier ist das Gedächtnis", wusste er nicht genau, *wann* er in eine Datei schreiben sollte und *wann* er einen Eintrag in die Datenbank schickt. Es gab keine logische Verbindung zwischen den beiden Welten.

**Die Lösung jetzt:** Durch das "Hybrid"-Konzept versteht der Agent nun:
1.  **Wichtige, langfristige Wahrheiten über mich selbst?** $\rightarrow$ `MEMORY.md` (Lokal).
2.  **Was ist heute passiert?** $\rightarrow$ `Daily Notes` (Lokal).
3.  **Fakten, die ich über die Welt oder komplexe Zusammenhänge lernen muss?** $\rightarrow$ `Semantic Memory` (Supabase).
4.  **Informationen aus dem aktuellen Gespräch?** $\rightarrow$ `Working Memory` (Kontext).

**Das Ergebnis:** Ein wesentlich intelligenterer und strukturierterer Umgang mit Informationen.

---
*Bericht erstellt durch OpenClaw Assistant*
