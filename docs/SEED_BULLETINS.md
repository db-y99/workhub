# Seed bảng tin mẫu

Script riêng để seed dữ liệu bảng tin, **không phụ thuộc** seed-admin.

## Cách chạy

```bash
npm run seed:bulletins
```

## Điều kiện

- Đã có **ít nhất 1 profile** trong DB (từ seed:admin hoặc tạo user thủ công)
- Đã chạy `npx supabase db reset` hoặc có migration bulletins (seed.sql có departments)
- Có `.env.local` với `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Hành vi

- Nếu bảng tin **đã có dữ liệu** → bỏ qua, không insert
- Dùng profile đầu tiên trong DB làm `created_by`
- Departments CS, CA (từ seed.sql) dùng cho tag phòng ban
