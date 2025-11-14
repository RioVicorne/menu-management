# Chat Supabase Setup Guide

## Tổng quan

Chat tại `/planner` hiện đã được tích hợp với Supabase để lưu trữ dữ liệu. Mỗi user chỉ có **1 session chat duy nhất** và không được trùng nhau.

## Cài đặt

### Bước 1: Chạy SQL Schema

1. Mở Supabase Dashboard
2. Vào **SQL Editor**
3. Click **"New Query"**
4. Copy toàn bộ nội dung từ file `scripts/chat-schema.sql`
5. Paste vào SQL editor
6. Click **"Run"** để thực thi

Schema sẽ tạo:
- Bảng `chat_sessions` - lưu thông tin session chat (mỗi user chỉ có 1 session)
- Bảng `chat_messages` - lưu các tin nhắn trong session
- RLS Policies - đảm bảo user chỉ có thể xem/sửa chat của chính mình
- Indexes - tối ưu hiệu suất truy vấn

### Bước 2: Kiểm tra Environment Variables

Đảm bảo file `.env.local` có các biến sau:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Bước 3: Restart Development Server

```bash
npm run dev
# hoặc
yarn dev
# hoặc
bun dev
```

## Cách hoạt động

### Lưu trữ

1. **Khi user đăng nhập:**
   - Hệ thống sẽ load session từ Supabase (nếu có)
   - Nếu không có, sẽ tạo session mới
   - Mỗi user chỉ có 1 session duy nhất

2. **Khi gửi tin nhắn:**
   - Tin nhắn được lưu vào localStorage (backup)
   - Đồng thời lưu vào Supabase
   - Session được cập nhật với message count và last message

3. **Khi tải trang:**
   - Ưu tiên load từ Supabase
   - Nếu không có, fallback về localStorage
   - Đồng bộ dữ liệu giữa Supabase và localStorage

### Bảo mật

- **Row Level Security (RLS)** được bật cho cả 2 bảng
- User chỉ có thể xem/sửa/xóa chat của chính mình
- Mỗi user chỉ có 1 session (UNIQUE constraint trên `user_id`)

### API Routes

- `GET /api/chat/sessions` - Lấy session của user hiện tại
- `POST /api/chat/sessions` - Tạo/cập nhật session (upsert)
- `GET /api/chat/messages?sessionId=xxx` - Lấy messages của session
- `POST /api/chat/messages` - Lưu messages vào session

Tất cả API routes yêu cầu authentication token trong header:
```
Authorization: Bearer <access_token>
```

## Troubleshooting

### Lỗi "Not authenticated"
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra access token có hợp lệ không

### Lỗi "Session not found"
- Kiểm tra sessionId có đúng không
- Kiểm tra session có thuộc về user hiện tại không

### Dữ liệu không lưu vào Supabase
- Kiểm tra RLS policies đã được tạo chưa
- Kiểm tra user có quyền truy cập không
- Xem console log để biết lỗi cụ thể

### Mỗi user có nhiều sessions
- Kiểm tra UNIQUE constraint trên `user_id` đã được tạo chưa
- Xóa các session trùng lặp trong database
- Chạy lại SQL schema nếu cần

## Lưu ý

- Dữ liệu vẫn được lưu vào localStorage như backup
- Nếu Supabase không khả dụng, hệ thống sẽ dùng localStorage
- Khi user đăng xuất, dữ liệu vẫn được giữ trong Supabase
- Khi user đăng nhập lại, dữ liệu sẽ được load từ Supabase


