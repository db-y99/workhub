-- Indexes for role-based request listing: requested_by filter and cc_emails jsonb containment
-- Used by: GET /api/requests (non-admin: requested_by = user OR cc_emails @> [email])

CREATE INDEX IF NOT EXISTS idx_requests_requested_by
  ON public.requests (requested_by)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requests_cc_emails
  ON public.requests
  USING GIN (cc_emails)
  WHERE deleted_at IS NULL;
