# AI Database Integration - Cập nhật AI chỉ sử dụng dữ liệu từ Database

## Tổng quan

Đã cập nhật hệ thống AI để chỉ sử dụng dữ liệu từ database thay vì dựa vào API bên ngoài. Tất cả các tính năng AI giờ đây sẽ hoạt động dựa trên dữ liệu thực tế trong hệ thống.

## Thay đổi chính

### 1. API Data Endpoint (`/api/ai-data`)

**File:** `src/app/api/ai-data/route.ts`

Tạo endpoint mới để cung cấp dữ liệu cho AI:

- **GET `/api/ai-data?type=ingredients`** - Lấy dữ liệu nguyên liệu
- **GET `/api/ai-data?type=dishes`** - Lấy dữ liệu món ăn
- **GET `/api/ai-data?type=menu`** - Lấy dữ liệu menu
- **GET `/api/ai-data?type=recipes`** - Lấy dữ liệu công thức

**Tính năng:**

- Phân loại nguyên liệu theo tình trạng tồn kho
- Nhóm món ăn theo loại
- Tổng hợp menu theo ngày
- Liên kết công thức với món ăn và nguyên liệu

### 2. Cập nhật AI Service

**File:** `src/lib/ai-service.ts`

#### Gợi ý món ăn từ nguyên liệu (`suggestDishesFromIngredients`)

- Lấy dữ liệu nguyên liệu từ database
- Tìm món ăn phù hợp dựa trên công thức có sẵn
- Kiểm tra nguyên liệu có đủ để nấu món không
- Đưa ra gợi ý dựa trên dữ liệu thực tế

#### Lập kế hoạch bữa ăn (`createWeeklyMealPlan`)

- Sử dụng món ăn có sẵn trong hệ thống
- Phân chia món ăn theo ngày và bữa ăn
- Tạo kế hoạch dựa trên dữ liệu thực tế
- Hiển thị thông tin chi tiết về món ăn

#### Tạo công thức (`generateRecipe`)

- Tìm công thức từ database
- Hiển thị nguyên liệu và số lượng chính xác
- Tạo hướng dẫn nấu ăn dựa trên công thức có sẵn
- Điều chỉnh khẩu phần theo yêu cầu

#### Chat thông minh (`chatAboutMenuManagement`)

- Phân tích câu hỏi của người dùng
- Lấy dữ liệu từ database để trả lời
- Đưa ra gợi ý dựa trên tình trạng thực tế
- Cung cấp thông tin chi tiết về hệ thống

### 3. Helper Methods

Thêm các helper methods để làm việc với database:

- `getDishesData()` - Lấy dữ liệu món ăn
- `getMenuData()` - Lấy dữ liệu menu
- `groupDishesByCategory()` - Nhóm món ăn theo loại
- `findSuitableDishes()` - Tìm món ăn phù hợp với nguyên liệu

## Lợi ích

### 1. Dữ liệu thực tế

- Tất cả gợi ý dựa trên dữ liệu thực trong hệ thống
- Không phụ thuộc vào API bên ngoài
- Đảm bảo tính chính xác và phù hợp

### 2. Tích hợp tốt hơn

- AI hiểu được tình trạng kho nguyên liệu
- Gợi ý món ăn dựa trên nguyên liệu có sẵn
- Lập kế hoạch dựa trên món ăn trong hệ thống

### 3. Hiệu suất cao

- Không cần gọi API bên ngoài
- Phản hồi nhanh hơn
- Tiết kiệm chi phí API

### 4. Bảo mật

- Không chia sẻ dữ liệu với bên thứ ba
- Dữ liệu được xử lý nội bộ
- Kiểm soát hoàn toàn thông tin

## Cách hoạt động

### 1. Gợi ý món ăn

```
Người dùng: "Gợi ý món ăn"
AI: Lấy dữ liệu nguyên liệu từ database
    → Tìm món ăn phù hợp
    → Kiểm tra đủ nguyên liệu
    → Đưa ra gợi ý dựa trên dữ liệu thực
```

### 2. Lập kế hoạch

```
Người dùng: "Lập kế hoạch tuần"
AI: Lấy danh sách món ăn từ database
    → Phân chia theo ngày và bữa ăn
    → Tạo kế hoạch chi tiết
    → Hiển thị thông tin món ăn
```

### 3. Tạo công thức

```
Người dùng: "Công thức thịt kho tàu"
AI: Tìm công thức trong database
    → Hiển thị nguyên liệu chính xác
    → Tạo hướng dẫn nấu ăn
    → Điều chỉnh khẩu phần
```

### 4. Chat thông minh

```
Người dùng: "Tình trạng kho như thế nào?"
AI: Lấy dữ liệu tồn kho từ database
    → Phân tích tình trạng
    → Đưa ra gợi ý mua sắm
    → Cung cấp thông tin chi tiết
```

## Fallback System

Nếu có lỗi khi lấy dữ liệu từ database, hệ thống sẽ:

- Sử dụng dữ liệu mặc định
- Hiển thị thông báo lỗi rõ ràng
- Đề xuất các hành động khắc phục
- Đảm bảo tính ổn định của hệ thống

## Kết luận

Hệ thống AI giờ đây hoàn toàn độc lập và chỉ sử dụng dữ liệu từ database. Điều này đảm bảo:

- Tính chính xác cao
- Hiệu suất tốt
- Bảo mật dữ liệu
- Tích hợp sâu với hệ thống

Tất cả các tính năng AI đều hoạt động dựa trên dữ liệu thực tế, mang lại trải nghiệm người dùng tốt hơn và gợi ý phù hợp hơn.
