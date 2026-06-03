# Memory Consolidation Logic

## Overview
This document defines the process of transforming raw episodic memories into distilled semantic knowledge.

## Trigger Conditions
Consolidation should run:
- Periodically (e.g., daily via cron)
- When episodic memory count exceeds a threshold (e.g., 100 new entries)
- When the agent identifies a learning opportunity

## Consolidation Algorithm

### Step 1: Identify Significant Episodic Memories
```sql
SELECT id, timestamp, content, metadata
FROM memory.episodic_memory
WHERE (metadata->>'consolidated')::boolean IS NOT TRUE
   OR metadata->>'consolidated' IS NULL
ORDER BY timestamp DESC
LIMIT 50;
```

### Step 2: Pattern Extraction
The agent (using its LLM capabilities) analyzes the selected episodic memories to identify:
- Recurring patterns
- User preferences
- Task completion strategies
- Error patterns and solutions
- Important facts or decisions

### Step 3: Generate Semantic Representations
For each identified pattern/concept:
1. Create a concise concept name
2. Write a description that captures the essence
3. Assign an importance score (0.0 - 1.0):
   - 1.0: Critical fact (user identity, core rules)
   - 0.7-0.9: Important pattern (workflows, preferences)
   - 0.4-0.6: Useful context (past decisions, rationale)
   - 0.0-0.3: Minor observation (trivial details)

### Step 4: Store in Semantic Knowledge
```sql
INSERT INTO memory.semantic_knowledge 
  (concept, description, importance, embedding, last_updated)
VALUES 
  ('[Concept]', '[Description]', [importance], '[embedding]', now());
```

### Step 5: Mark Episodic as Consolidated
```sql
UPDATE memory.episodic_memory
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{consolidated}', 
  'true'
)
WHERE id IN ([list of consolidated episodic IDs]);
```

## Similarity-Based Consolidation

Before creating new semantic entries, check for existing similar concepts:

```sql
SELECT concept, description, importance
FROM memory.semantic_knowledge
WHERE 1 - (embedding <=> '[new_concept_embedding]') > 0.85
ORDER BY embedding <=> '[new_concept_embedding]'
LIMIT 1;
```

If a similar concept exists:
- **Merge**: Update the existing entry with new information
- **Increase importance**: Average the importance scores
- **Refresh timestamp**: Update `last_updated`

If no similar concept exists:
- **Create new**: Insert as a fresh semantic entry

## Example Consolidation Flow

**Episodic Input:**
1. "User said they prefer morning meetings at 9 AM"
2. "User accepted calendar invite for 9 AM meeting"
3. "User seemed happy with 9 AM standup"

**Extracted Semantic Concept:**
- Concept: "Morning Meeting Preference"
- Description: "User prefers scheduling meetings at 9 AM, shows positive response to morning sessions"
- Importance: 0.8 (strong preference pattern)
- Embedding: Generated from concept + description

## Automated Cron Job

```json
{
  "name": "memory-consolidation",
  "schedule": { "kind": "cron", "expr": "0 2 * * *", "tz": "UTC" },
  "payload": {
    "kind": "agentTurn",
    "message": "Execute memory consolidation: analyze recent episodic memories, extract patterns, and update semantic knowledge base."
  },
  "sessionTarget": "isolated"
}
```

## Best Practices

1. **Don't over-consolidate**: Not every episodic memory needs to become semantic knowledge
2. **Preserve episodic raw data**: Never delete episodic memories after consolidation
3. **Update, don't duplicate**: If semantic knowledge exists, update it rather than creating new entries
4. **Importance decay**: Periodically reduce importance of unused semantic knowledge
5. **Human-in-the-loop**: For very important facts, confirm with user before storing as semantic knowledge
