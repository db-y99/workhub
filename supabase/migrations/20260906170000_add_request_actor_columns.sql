-- Tách người duyệt / người từ chối / người hoàn thành.
-- Trước đây reject cũng ghi vào approved_by nên backfill các request đã từ chối.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_rejected_by_fkey'
  ) THEN
    ALTER TABLE public.requests
      ADD CONSTRAINT requests_rejected_by_fkey
      FOREIGN KEY (rejected_by) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_completed_by_fkey'
  ) THEN
    ALTER TABLE public.requests
      ADD CONSTRAINT requests_completed_by_fkey
      FOREIGN KEY (completed_by) REFERENCES public.profiles(id);
  END IF;
END $$;

COMMENT ON COLUMN public.requests.approved_by IS 'Người duyệt yêu cầu';
COMMENT ON COLUMN public.requests.approved_at IS 'Thời điểm duyệt';
COMMENT ON COLUMN public.requests.rejected_by IS 'Người từ chối yêu cầu';
COMMENT ON COLUMN public.requests.rejected_at IS 'Thời điểm từ chối';
COMMENT ON COLUMN public.requests.completed_by IS 'Người hoàn thành yêu cầu';
COMMENT ON COLUMN public.requests.completed_at IS 'Thời điểm hoàn thành';

UPDATE public.requests
SET
  rejected_by = approved_by,
  rejected_at = approved_at,
  approved_by = NULL,
  approved_at = NULL
WHERE status = 'rejected'
  AND approved_by IS NOT NULL
  AND rejected_by IS NULL;
