# 🛒 Shopping Integration với AI

## Tổng quan

Tính năng Shopping đã được tích hợp hoàn toàn với AI Assistant, cho phép AI lấy dữ liệu thực tế từ trang Shopping và tạo danh sách mua sắm thông minh.

## 🚀 Tính năng mới

### 1. **API Shopping** (`/api/shopping`)

- **Endpoint**: `GET /api/shopping`
- **Chức năng**: Lấy dữ liệu nguyên liệu cần mua từ database
- **Dữ liệu trả về**:
  - `totalSources`: Số nguồn nhập
  - `totalIngredients`: Số nguyên liệu cần mua
  - `groupedBySource`: Nhóm nguyên liệu theo nguồn
  - `ingredients`: Danh sách chi tiết nguyên liệu

### 2. **AI Shopping Integration**

- **Tính năng**: AI có thể lấy dữ liệu thực tế từ trang Shopping
- **Logic**: Tự động phân tích tồn kho và tạo danh sách mua sắm
- **Fallback**: Có response dự phòng khi API không khả dụng

### 3. **Quick Access**

- **Nút "Mở Shopping"**: Mở trang Shopping trong tab mới
- **Tích hợp**: Từ AI chat có thể truy cập trực tiếp trang Shopping

## 📊 Dữ liệu thực tế

### Cấu trúc dữ liệu từ API:

```json
{
  "totalSources": 4,
  "totalIngredients": 16,
  "groupedBySource": {
    "nhà bà nội": [
      {
        "id": "fc0237d0-7831-40f4-9484-563425006d9f",
        "ten_nguyen_lieu": "Bò",
        "nguon_nhap": "nhà bà nội",
        "ton_kho_so_luong": null,
        "ton_kho_khoi_luong": 0
      }
    ]
  },
  "ingredients": [...]
}
```

### Logic phân loại:

- **Cần mua**: `ton_kho_so_luong = 0` hoặc `ton_kho_khoi_luong = 0`
- **Sắp hết**: `ton_kho_so_luong <= 5` hoặc `ton_kho_khoi_luong <= 5`
- **Đủ dùng**: Các trường hợp khác

## 🎯 Cách sử dụng

### 1. **Từ AI Chat**

1. Truy cập `http://localhost:3001/planner`
2. Chọn "Chat với AI"
3. Sử dụng nút "Mua sắm" hoặc "Mở Shopping"
4. AI sẽ phân tích và tạo danh sách mua sắm

### 2. **Từ trang Shopping**

1. Truy cập `http://localhost:3001/shopping`
2. Xem danh sách nguyên liệu cần mua
3. Chọn nguyên liệu và mua sắm
4. Cập nhật tồn kho sau khi mua

### 3. **AI Response Examples**

**Khi có nguyên liệu cần mua:**

```
🛒 Danh sách mua sắm thông minh

Thống kê:
• 4 nguồn nhập
• 16 nguyên liệu cần mua

Danh sách theo nguồn:

📍 nhà bà nội (4 món):
• Bò (Hết)
• Hành tây (Hết)
• Khoai tây (Sắp hết)
• Sườn (Sắp hết)

📍 nhà bà ngoại (4 món):
• Cá ngừ (Sắp hết)
• Cải thảo (Sắp hết)
• Rau sống (Sắp hết)
• Thịt heo (Hết)
```

**Khi kho đủ nguyên liệu:**

```
🎉 Tin tốt!

Kho của bạn hiện tại đã đủ nguyên liệu, không cần mua thêm gì cả!

Tình trạng kho:
• Tất cả nguyên liệu đều đủ dùng
• Không có nguyên liệu nào sắp hết
• Có thể tiếp tục nấu ăn bình thường
```

## 🔧 Technical Details

### API Endpoint

```typescript
// GET /api/shopping
interface ShoppingResponse {
  totalSources: number;
  totalIngredients: number;
  groupedBySource: Record<string, Ingredient[]>;
  ingredients: Ingredient[];
}

interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  nguon_nhap?: string;
  ton_kho_so_luong?: number;
  ton_kho_khoi_luong?: number;
}
```

### AI Service Integration

```typescript
// src/lib/ai-service.ts
async createSmartShoppingList(menuItems: string[], currentInventory: string[]): Promise<AIResponse> {
  try {
    const response = await fetch('/api/shopping');
    const shoppingData = await response.json();

    // Process real data and create smart shopping list
    // ...
  } catch (error) {
    // Fallback to static response
    // ...
  }
}
```

### Error Handling

- **API Error**: Fallback to static shopping list
- **Network Error**: Graceful error message
- **Empty Data**: Special message for "no shopping needed"

## 📱 UI Integration

### Chat Input Features

- **Quick Features**: 5 nút tính năng nhanh
- **Shopping List**: Tạo danh sách từ dữ liệu thực
- **Open Shopping**: Mở trang Shopping trong tab mới

### Chat Response

- **Rich Formatting**: Markdown formatting cho dễ đọc
- **Suggestions**: Gợi ý chi tiết theo nguồn
- **Action Links**: Link đến trang Shopping

## 🎨 Styling

### Shopping Cards

- **Source Grouping**: Nhóm theo nguồn nhập
- **Status Indicators**: Hết/Sắp hết
- **Color Coding**: Màu sắc phân biệt trạng thái

### AI Response Display

- **Emoji Icons**: 🛒, 🎉, 📍, 💡
- **Bullet Points**: Dễ đọc và scan
- **Bold Headers**: Phân chia rõ ràng

## 🔮 Future Enhancements

- [ ] **Price Integration**: Tích hợp giá cả từ các nguồn
- [ ] **Smart Suggestions**: Gợi ý mua sắm theo ngân sách
- [ ] **Location-based**: Gợi ý nơi mua gần nhất
- [ ] **Seasonal Recommendations**: Gợi ý theo mùa
- [ ] **Bulk Purchase**: Mua số lượng lớn để tiết kiệm
- [ ] **Expiry Tracking**: Theo dõi hạn sử dụng
- [ ] **Nutritional Analysis**: Phân tích dinh dưỡng

## 🐛 Troubleshooting

### Common Issues

1. **API không trả về dữ liệu**: Kiểm tra kết nối database
2. **AI không hiển thị danh sách**: Check API endpoint
3. **Dữ liệu không chính xác**: Verify tồn kho trong database

### Debug Steps

1. Test API: `curl http://localhost:3001/api/shopping`
2. Check console logs for errors
3. Verify database connection
4. Check AI service logs

---

**Lưu ý**: Tính năng này sử dụng dữ liệu thực từ database, đảm bảo tính chính xác và cập nhật real-time.
