# Hướng dẫn sửa RLS Policy cho bảng mon_an

## Vấn đề
Policy `update mon_an (public)` có thể có điều kiện không cho phép update một số trường hợp.

## Cách kiểm tra và sửa

### Bước 1: Kiểm tra policy hiện tại

1. Vào Supabase Dashboard
2. Chọn bảng `mon_an`
3. Vào tab **Policies**
4. Click vào policy `update mon_an (public)`
5. Xem định nghĩa policy

### Bước 2: Sửa policy UPDATE

Policy UPDATE cần có cả **USING** và **WITH CHECK** clauses để hoạt động đúng.

#### Option 1: Cho phép update tất cả (cho development)

```sql
-- Xóa policy cũ nếu cần
DROP POLICY IF EXISTS "update mon_an (public)" ON mon_an;

-- Tạo policy mới cho phép update tất cả
CREATE POLICY "update mon_an (public)"
ON mon_an
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
```

#### Option 2: Cho phép update với điều kiện (recommended)

```sql
-- Xóa policy cũ nếu cần
DROP POLICY IF EXISTS "update mon_an (public)" ON mon_an;

-- Tạo policy mới - cho phép update nếu có quyền
CREATE POLICY "update mon_an (public)"
ON mon_an
FOR UPDATE
TO anon
USING (true)  -- Cho phép select row để update
WITH CHECK (true);  -- Cho phép update với bất kỳ giá trị nào
```

### Bước 3: Kiểm tra các policies khác

Đảm bảo các policies khác cũng đúng:

#### SELECT Policy (đã có):
```sql
-- Policy này đã có và hoạt động tốt
-- "Public read mon_an" - SELECT - public
```

#### INSERT Policy (đã có):
```sql
-- Policy này đã có
-- "insert mon_an (public)" - INSERT - anon
```

#### DELETE Policy (đã có):
```sql
-- Policy này đã có
-- "delete mon_an (public)" - DELETE - anon
```

## Kiểm tra sau khi sửa

1. Thử update một món ăn trong ứng dụng
2. Kiểm tra console để xem còn lỗi không
3. Kiểm tra database để xem dữ liệu đã được update chưa

## Nếu vẫn còn lỗi

1. Kiểm tra RLS có đang bật không
2. Kiểm tra role `anon` có đúng không
3. Kiểm tra xem có policy nào khác đang conflict không
4. Thử tạm thời disable RLS để test (không khuyến khích cho production)

