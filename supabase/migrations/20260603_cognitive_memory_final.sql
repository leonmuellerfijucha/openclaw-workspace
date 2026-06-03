-- FINAL Cognitive Memory Schema (Clean Room Architecture)
-- Executed: 2026-06-03
-- Description: Implements dual-layer memory architecture with schema isolation

-- 1. Create schemas
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS memory;

-- 2. Enable pgvector extension in extensions schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- 3. Create episodic_memory table (raw event logs)
CREATE TABLE IF NOT EXISTS memory.episodic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Create semantic_knowledge table (distilled knowledge)
CREATE TABLE IF NOT EXISTS memory.semantic_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept TEXT NOT NULL,
    description TEXT,
    importance FLOAT DEFAULT 0.5,
    embedding vector(1536),
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- 5. Create HNSW indexes for high-performance vector search
CREATE INDEX IF NOT EXISTS episodic_embedding_idx 
    ON memory.episodic_memory 
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS semantic_embedding_idx 
    ON memory.semantic_knowledge 
    USING hnsw (embedding vector_cosine_ops);

-- 6. Enable Row Level Security (defense in depth)
ALTER TABLE memory.episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory.semantic_knowledge ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for service_role (full access for agent)
CREATE POLICY episodic_service_role_policy ON memory.episodic_memory
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY semantic_service_role_policy ON memory.semantic_knowledge
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Grant permissions to service_role
GRANT ALL ON SCHEMA memory TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA memory TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA memory TO service_role;

-- 9. Create consolidation tracking function
CREATE OR REPLACE FUNCTION memory.mark_consolidated(episode_ids UUID[])
RETURNS void AS $$
BEGIN
    UPDATE memory.episodic_memory
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{consolidated}',
        'true'
    )
    WHERE id = ANY(episode_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create similarity search function
CREATE OR REPLACE FUNCTION memory.search_semantic(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    concept TEXT,
    description TEXT,
    importance FLOAT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sk.concept,
        sk.description,
        sk.importance,
        1 - (sk.embedding <=> query_embedding) as similarity
    FROM memory.semantic_knowledge sk
    WHERE 1 - (sk.embedding <=> query_embedding) > similarity_threshold
    ORDER BY sk.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification
SELECT 'Schemas created:' as status, COUNT(*) as count 
FROM information_schema.schemata 
WHERE schema_name IN ('memory', 'extensions');

SELECT 'Tables created:' as status, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'memory';

SELECT 'Indexes created:' as status, COUNT(*) as count 
FROM pg_indexes 
WHERE schemaname = 'memory';
