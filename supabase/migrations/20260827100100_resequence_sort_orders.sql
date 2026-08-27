-- Chuẩn hóa sort_order cũ: đánh lại liên tục 1, 2, 3... theo thứ tự hiện tại.
-- Giữ nguyên thứ tự hiển thị (ORDER BY sort_order, code), chỉ lấp khoảng trống / số nhảy.

-- Permissions (chưa xóa mềm)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY sort_order ASC, code ASC, created_at ASC
    ) AS new_sort_order
  FROM public.permissions
  WHERE deleted_at IS NULL
)
UPDATE public.permissions p
SET
  sort_order = ordered.new_sort_order,
  updated_at = NOW()
FROM ordered
WHERE p.id = ordered.id
  AND p.sort_order IS DISTINCT FROM ordered.new_sort_order;

-- Roles (chưa xóa mềm)
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY sort_order ASC, code ASC, created_at ASC
    ) AS new_sort_order
  FROM public.roles
  WHERE deleted_at IS NULL
)
UPDATE public.roles r
SET
  sort_order = ordered.new_sort_order,
  updated_at = NOW()
FROM ordered
WHERE r.id = ordered.id
  AND r.sort_order IS DISTINCT FROM ordered.new_sort_order;
