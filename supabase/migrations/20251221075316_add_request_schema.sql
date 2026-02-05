create table requests (
  id                  uuid primary key default gen_random_uuid(),

  -- Người yêu cầu
  requested_by        uuid not null references profiles(id),

  -- Người phê duyệt
  approved_by         uuid not null references profiles(id),

  -- Phòng ban liên quan
  department_id       uuid not null references departments(id),

  -- Thông tin chính
  title               text not null,
  status              text not null default 'pending',   

  -- Optional fields
  description         text,
  attachments         jsonb,                               -- File (Google Drive)
  metadata            jsonb,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz,
  approved_at         timestamptz
);