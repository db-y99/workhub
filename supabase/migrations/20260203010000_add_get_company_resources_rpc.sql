-- Migration: Add optimized RPC function for company resources query
-- Description: Creates get_company_resources function with CTE optimization to avoid duplicate filtering

CREATE OR REPLACE FUNCTION get_company_resources(
  p_search TEXT DEFAULT '',
  p_type TEXT DEFAULT '',
  p_assigned_to TEXT DEFAULT '',
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT 
        cr.*,
        p.id AS p_id,
        p.full_name,
        p.email,
        COUNT(*) OVER() AS total_count
      FROM company_resources cr
      LEFT JOIN profiles p ON cr.assigned_to = p.id
      WHERE cr.deleted_at IS NULL
        AND (
          p_search = '' OR 
          cr.name ILIKE '%' || p_search || '%' OR
          cr.description ILIKE '%' || p_search || '%' OR
          cr.notes ILIKE '%' || p_search || '%' OR
          p.full_name ILIKE '%' || p_search || '%' OR
          p.email ILIKE '%' || p_search || '%'
        )
        AND (p_type = '' OR cr.type = p_type)
        AND (
          p_assigned_to = '' OR
          (p_assigned_to = 'unassigned' AND cr.assigned_to IS NULL) OR
          (p_assigned_to != 'unassigned' AND cr.assigned_to = p_assigned_to::UUID)
        )
      ORDER BY cr.created_at DESC
      LIMIT p_limit
      OFFSET (p_page - 1) * p_limit
    )
    SELECT JSON_BUILD_OBJECT(
      'resources', COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'name', name,
            'type', type,
            'description', description,
            'assigned_to', assigned_to,
            'notes', notes,
            'created_at', created_at,
            'updated_at', updated_at,
            'assignee', CASE 
              WHEN p_id IS NOT NULL THEN 
                JSON_BUILD_OBJECT(
                  'id', p_id,
                  'full_name', full_name,
                  'email', email
                )
              ELSE NULL
            END
          )
        ) FILTER (WHERE id IS NOT NULL), 
        '[]'::JSON
      ),
      'total', COALESCE(MAX(total_count), 0),
      'page', p_page,
      'limit', p_limit,
      'totalPages', CEIL(COALESCE(MAX(total_count), 0)::FLOAT / p_limit)
    ) AS result
    FROM filtered
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_company_resources(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 
'Optimized RPC function to get company resources with search, filter, and pagination. 
Supports search across resource fields and assignee info in a single query.';

-- Create indexes for optimal performance
-- Enable pg_trgm extension for trigram search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast ILIKE searches on text fields
CREATE INDEX IF NOT EXISTS company_resources_search_idx 
ON company_resources USING gin (
  (name || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')) gin_trgm_ops
);

-- B-tree indexes for exact match filters
CREATE INDEX IF NOT EXISTS company_resources_type_idx ON company_resources (type);
CREATE INDEX IF NOT EXISTS company_resources_assigned_to_idx ON company_resources (assigned_to);
CREATE INDEX IF NOT EXISTS company_resources_deleted_at_idx ON company_resources (deleted_at);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS company_resources_active_created_idx 
ON company_resources (deleted_at, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index on profiles for assignee search
CREATE INDEX IF NOT EXISTS profiles_search_idx 
ON profiles USING gin (
  (full_name || ' ' || email) gin_trgm_ops
);