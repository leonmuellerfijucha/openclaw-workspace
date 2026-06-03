---
name: semantic-memory
description: "Manage cognitive memory layers (episodic & semantic) using Supabase with pgvector. Enables autonomous memory consolidation, retrieval, and learning for the OpenClaw agent."
---

# Semantic Memory Skill

This skill provides the OpenClaw agent with a sophisticated cognitive memory architecture using Supabase as the external database. It implements a dual-layer memory model:

1. **Episodic Memory** (`memory.episodic_memory`): Raw event logs with timestamps
2. **Semantic Knowledge** (`memory.semantic_knowledge`): Distilled, searchable facts and concepts

## Architecture

- **Database**: Supabase (PostgreSQL)
- **Vector Engine**: pgvector extension (in `extensions` schema)
- **Indexing**: HNSW (Hierarchical Navigable Small World) for high-performance semantic retrieval
- **Schema Isolation**: All memory tables in dedicated `memory` schema (the "Clean Room")

## Core Capabilities

### 1. Episodic Memory Management
Insert raw events, observations, and experiences with automatic timestamping.

```sql
INSERT INTO memory.episodic_memory (content, embedding, metadata)
VALUES ('Agent completed task X', '[vector]', '{"source": "task_completion"}');
```

### 2. Semantic Knowledge Management
Store distilled facts, concepts, and learned patterns.

```sql
INSERT INTO memory.semantic_knowledge (concept, description, importance, embedding)
VALUES ('Task X Pattern', 'When condition Y occurs, execute Z', 0.8, '[vector]');
```

### 3. Vector Similarity Search
Retrieve relevant memories using cosine similarity.

```sql
SELECT *, 1 - (embedding <=> '[query_vector]') as similarity
FROM memory.semantic_knowledge
WHERE 1 - (embedding <=> '[query_vector]') > 0.7
ORDER BY embedding <=> '[query_vector]'
LIMIT 5;
```

### 4. Memory Consolidation (Episodic → Semantic)
Extract patterns from episodic logs and commit them as semantic knowledge.

Logic:
- Query recent episodic events
- Identify recurring patterns or significant facts
- Generate embeddings for concepts
- Insert into semantic_knowledge table
- Tag episodic entries as "consolidated" in metadata

## Security Model: Intelligent Autonomy

This skill operates with **controlled freedom**:

- **Controlled Master Key**: Uses Supabase `service_role` key for full database access
- **Functional Scoping**: Restricted to `memory` schema operations only
- **Environment Isolation**: Credentials stored in secure environment variables (`SUPABASE_SECRET_KEY`)
- **No RLS Required**: Schema isolation eliminates need for complex Row Level Security policies

## Usage Patterns

### Storing a New Memory (Episodic)
```sql
-- Agent learns something new
INSERT INTO memory.episodic_memory (content, metadata)
VALUES (
  'User prefers morning meetings',
  '{"context": "user_preference", "confidence": 0.9}'
);
```

### Retrieving Relevant Context (Semantic Search)
```sql
-- Before responding to user, check semantic memory
SELECT concept, description, importance
FROM memory.semantic_knowledge
ORDER BY embedding <=> '[current_context_embedding]'
LIMIT 3;
```

### Consolidating Memories (Periodic Task)
```sql
-- Run periodically (e.g., daily via cron)
-- Extract frequent patterns from episodic memory
-- Insert into semantic_knowledge
-- Mark episodic entries as processed
```

## Integration with OpenClaw

This skill integrates with OpenClaw through:

1. **MCP Server**: Uses Supabase MCP server for structured database access
2. **Direct SQL**: Falls back to `supabase__execute_sql` when needed
3. **Embedding Generation**: Leverages OpenClaw's configured embedding model
4. **Cron Integration**: Consolidation can be scheduled as isolated cron jobs

## Best Practices

- **Embedding Consistency**: Always use the same embedding model for all vectors
- **Metadata Richness**: Include context in metadata for better retrieval
- **Importance Scoring**: Rate semantic facts 0.0-1.0 for prioritization
- **Periodic Consolidation**: Run consolidation logic regularly to prevent episodic bloat
- **Schema Safety**: Never execute DDL operations; only DML (SELECT, INSERT, UPDATE)

## Error Handling

- Connection failures: Retry with exponential backoff
- Embedding mismatches: Validate vector dimensions (1536 for OpenAI embeddings)
- Schema violations: All operations scoped to `memory` schema only

---

*This skill transforms OpenClaw from a stateless responder into a learning agent with persistent, searchable memory.*
