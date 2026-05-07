# Migration: Text to text[] for source and person_in_charge

## Tóm tắt

Migrate 2 fields từ `text` sang `text[]` (PostgreSQL array) để query hiệu quả hơn:
- `source` (Nguồn)
- `person_in_charge` (Người phụ trách)

## Lý do migrate

### Trước (text):
```sql
-- ❌ Query bẩn, không chính xác
WHERE source LIKE '%Facebook%'  -- dính "MyFacebook", "Facebook123"

-- ❌ Không index hiệu quả
-- ❌ Phải split string ở backend
```

### Sau (text[]):
```sql
-- ✅ Query chuẩn, chính xác
WHERE 'Facebook' = ANY(source)

-- ✅ GIN index hiệu quả
CREATE INDEX idx_source ON customer_leads USING GIN (source);

-- ✅ Không cần parse string
```

## Các thay đổi

### 1. Database Schema
- File: `supabase/migrations/20260507_migrate_to_text_array.sql`
- Migrate data từ `"Facebook, Zalo"` → `["Facebook", "Zalo"]`
- Tạo GIN indexes

### 2. TypeScript Types
- `CustomerLeadInput.source`: `string` → `string[]`
- `CustomerLeadInput.person_in_charge`: `string` → `string[]`

### 3. Backend Queries
- `query.ilike("source", "%Facebook%")` → `query.contains("source", ["Facebook"])`
- `query.ilike("person_in_charge", "%Thu%")` → `query.contains("person_in_charge", ["Thu"])`

### 4. Frontend UI
- Form: Đã xử lý array trực tiếp (không cần join/split)
- Table: Hiển thị array items
- Import: Convert `"Facebook, Zalo"` → `["Facebook", "Zalo"]`

## Cách chạy migration

### Bước 1: Backup data
```sql
-- Backup trước khi migrate
CREATE TABLE customer_leads_backup AS 
SELECT * FROM customer_leads;
```

### Bước 2: Chạy migration
```bash
# Nếu dùng Supabase CLI
supabase db push

# Hoặc chạy trực tiếp SQL file
psql -f supabase/migrations/20260507_migrate_to_text_array.sql
```

### Bước 3: Verify
```sql
-- Kiểm tra data đã migrate đúng
SELECT 
  id,
  source,
  person_in_charge
FROM customer_leads
LIMIT 10;

-- Test query mới
SELECT * FROM customer_leads
WHERE 'Facebook' = ANY(source);
```

### Bước 4: Deploy code mới
```bash
# Deploy backend + frontend với code đã update
npm run build
# Deploy lên production
```

## Rollback (nếu cần)

```sql
-- Restore từ backup
DROP TABLE customer_leads;
ALTER TABLE customer_leads_backup RENAME TO customer_leads;

-- Recreate indexes
CREATE INDEX idx_customer_leads_source ON customer_leads (source);
CREATE INDEX idx_customer_leads_person_in_charge ON customer_leads (person_in_charge);
```

## Performance Benefits

### Query Performance
- **Before**: Full table scan với LIKE
- **After**: GIN index lookup (10-100x nhanh hơn)

### Code Quality
- **Before**: `source.split(", ")` ở khắp nơi
- **After**: Xử lý array trực tiếp, type-safe

### Scalability
- **Before**: Khó mở rộng, dễ bug
- **After**: Chuẩn SQL, dễ maintain

## Testing Checklist

- [ ] Migration chạy thành công
- [ ] Data migrate đúng (check random samples)
- [ ] Indexes được tạo
- [ ] Frontend form hoạt động (create/edit)
- [ ] Table hiển thị đúng
- [ ] Filter hoạt động
- [ ] Import Excel hoạt động
- [ ] Search hoạt động
- [ ] Stats cards hiển thị đúng

## Notes

- Excel import tự động convert `"Facebook, Zalo"` → `["Facebook", "Zalo"]`
- Validation: Phải có ít nhất 1 person_in_charge
- UI: Multiple select với chips
- Query: Dùng `contains()` thay vì `ilike()`
