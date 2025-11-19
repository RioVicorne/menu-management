# Supabase MCP Setup Guide

## Tổng quan

Supabase MCP (Model Context Protocol) cho phép AI assistant (như Cursor) tương tác trực tiếp với cơ sở dữ liệu Supabase của bạn thông qua các lệnh ngôn ngữ tự nhiên. Điều này giúp AI có thể:

- Truy vấn dữ liệu từ database
- Xem cấu trúc bảng (schema)
- Quản lý database một cách an toàn

## Cài đặt

✅ **Đã được cấu hình tự động!** File `/home/khoatran/.cursor/mcp.json` đã được setup với Supabase MCP remote server.

### Cấu hình hiện tại

File MCP config đã được cấu hình với remote Supabase MCP server:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

**Lợi ích của remote server:**

- Không cần lưu credentials trong config file (an toàn hơn)
- Xác thực qua OAuth (tự động)
- Không cần cài đặt thêm package

### Bước 1: Restart Cursor và Xác thực

1. **Restart Cursor** để áp dụng cấu hình MCP mới:
   - Đóng và mở lại Cursor
   - Hoặc reload window: `Cmd/Ctrl + Shift + P` → "Developer: Reload Window"

2. **Xác thực OAuth (lần đầu tiên):**
   - Khi lần đầu sử dụng MCP, Cursor sẽ mở trình duyệt để đăng nhập vào Supabase
   - Đăng nhập với tài khoản Supabase của bạn (tài khoản đã tạo project `xluqmujatlsgevphkagz`)
   - Cấp quyền truy cập cho MCP server
   - Quay lại Cursor và xác nhận kết nối thành công

### Bước 2: Kiểm tra kết nối

Sau khi cấu hình, bạn có thể kiểm tra bằng cách:

1. Mở chat với AI assistant trong Cursor
2. Thử hỏi: "Hiển thị các bảng trong database của tôi"
3. Hoặc: "Truy vấn 10 bản ghi đầu tiên từ bảng `menu_items`"

## Cấu hình nâng cao

### Sử dụng Service Role Key (chỉ đọc)

Để tăng cường bảo mật, bạn có thể sử dụng Service Role Key với quyền chỉ đọc:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "SUPABASE_READ_ONLY": "true"
      }
    }
  }
}
```

### Giới hạn quyền truy cập

Bạn có thể giới hạn MCP server chỉ truy cập vào một số bảng nhất định:

```json
{
  "env": {
    "SUPABASE_ALLOWED_TABLES": "menu_items,dishes,recipes"
  }
}
```

## Sử dụng

### Ví dụ các lệnh bạn có thể dùng với AI:

1. **Xem schema:**
   - "Hiển thị cấu trúc bảng `menu_items`"
   - "Có những bảng nào trong database?"
   - "Mô tả schema của bảng `dishes`"

2. **Truy vấn dữ liệu:**
   - "Lấy tất cả món ăn được lên menu hôm nay"
   - "Tìm 5 món ăn phổ biến nhất"
   - "Hiển thị menu của tuần này"

3. **Phân tích dữ liệu:**
   - "Thống kê số lượng món ăn theo ngày"
   - "Món ăn nào được sử dụng nhiều nhất?"
   - "Tạo báo cáo menu của tháng"

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG:**

1. **Không sử dụng với dữ liệu production:**
   - MCP được thiết kế cho môi trường development
   - Không kết nối với database chứa dữ liệu thực tế nhạy cảm

2. **Sử dụng chỉ đọc khi có thể:**
   - Bật `SUPABASE_READ_ONLY=true` nếu chỉ cần xem dữ liệu
   - Tránh để AI thực hiện các thao tác write/delete không mong muốn

3. **Giới hạn phạm vi:**
   - Chỉ cho phép truy cập vào các bảng cần thiết
   - Sử dụng Service Role Key thay vì Anon Key nếu cần quyền cao hơn

4. **Kiểm tra RLS Policies:**
   - Đảm bảo Row Level Security đã được bật
   - MCP sẽ tuân theo các RLS policies của bạn

## Troubleshooting

### Lỗi "MCP server not found"

- Kiểm tra xem package `@modelcontextprotocol/server-supabase` đã được cài đặt chưa
- Thử chạy: `npx @modelcontextprotocol/server-supabase --help`

### Lỗi "Authentication failed"

- Kiểm tra lại `SUPABASE_URL` và `SUPABASE_ANON_KEY`
- Đảm bảo các giá trị từ `.env.local` được copy đúng

### Không thể truy vấn dữ liệu

- Kiểm tra RLS policies đã được cấu hình đúng chưa
- Xem console logs trong Cursor để biết lỗi cụ thể
- Đảm bảo database connection string hợp lệ

### Kết nối chậm

- Kiểm tra kết nối mạng
- Đảm bảo Supabase project đang hoạt động
- Thử restart Cursor và MCP server

## Tài liệu tham khảo

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Supabase Dashboard](https://supabase.com/dashboard)

## Kiểm tra nhanh

Sau khi setup xong, chạy lệnh này trong terminal để test:

```bash
# Kiểm tra environment variables
cat .env.local | grep SUPABASE

# Test kết nối Supabase (nếu có script test)
bun run test:db
```
