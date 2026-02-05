# Setup Google Drive cho file bảng tin (chuẩn hệ thống approve)

## Kiến trúc

```
Shared Drive: APPROVE-DATA
Member: approve-bot@company (Manager) – CHỈ Service Account

❌ KHÔNG add user người thật
❌ KHÔNG add phòng ban

User KHÔNG truy cập Drive trực tiếp.
Drive chỉ là storage. User xem file qua app.
```

**Luồng:**
1. Upload → Backend dùng Service Account đẩy file lên Drive
2. Lưu `fileId` vào DB (không lưu link)
3. User click tải → `/api/bulletin-files?fileId=...&bulletinId=...`
4. Backend kiểm tra quyền → stream file từ Drive hoặc trả 403

**User không bao giờ thấy link Drive thật. Không share được ra ngoài.**

---

## Bước 1: Tạo Shared Drive (khuyến nghị)

1. Trên Drive: **Shared drives** → **New** → Đặt tên `APPROVE-DATA`
2. Thêm member: **approve-bot@project-id.iam.gserviceaccount.com** (Service Account) với quyền **Manager**
3. Tạo folder con (vd: `bulletins`) trong Shared Drive
4. Copy **Folder ID** từ URL: `https://drive.google.com/drive/folders/XXX`

(Nếu dùng Drive thường: tạo folder, share với Service Account – tương tự.)

**Lưu ý Shared Drive:** Code đã dùng `supportsAllDrives: true`; nếu folder nằm trong **Drive dùng chung** (Shared Drive) thì API sẽ hoạt động. Nếu vẫn 404: kiểm tra đúng folder ID trong URL và Service Account (client_email) trùng với tài khoản đã share.

## Bước 2: Google Cloud + Service Account

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → bật **Google Drive API**
2. **Credentials** → **Create Credentials** → **Service Account** → đặt tên (vd: `approve-bot`)
3. **Keys** → **Add Key** → **JSON** → tải file

## Bước 3: .env.local

Env tách theo feature: **bulletin** (file bảng tin) và **approve** (file approve, khi có feature).

```env
# Service Account chung (dùng cho cả bulletin và approve)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Folder Drive cho file bảng tin (bulletins)
BULLETIN_GOOGLE_DRIVE_FOLDER_ID=xxx

# Folder Drive cho file approve (optional, khi có feature)
# APPROVE_GOOGLE_DRIVE_FOLDER_ID=yyy
```

## Bước 4: npm install

```bash
npm install
```

---

## Xử lý lỗi

| Lỗi | Nguyên nhân |
|-----|-------------|
| "Chưa cấu hình Google Drive cho bảng tin" | Thiếu `GOOGLE_SERVICE_ACCOUNT_JSON` hoặc `BULLETIN_GOOGLE_DRIVE_FOLDER_ID` |
| "Folder Drive không tìm thấy (404)" / "File not found: &lt;folderId&gt;" | Folder chưa share với Service Account. Mở folder → Chia sẻ → Thêm email Service Account (client_email trong JSON) → quyền Biên tập viên |
| "Upload failed" | Service account chưa được share folder (Manager) |
| 403 khi tải file | User không thuộc bộ phận được target của bulletin |

**Lưu ý:** Nếu trước đây dùng `GOOGLE_DRIVE_FOLDER_ID`, đổi sang `BULLETIN_GOOGLE_DRIVE_FOLDER_ID` (cùng giá trị). Folder approve dùng `APPROVE_GOOGLE_DRIVE_FOLDER_ID` khi có feature.
