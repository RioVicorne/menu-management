# 🤖 AI Menu Management Features

## Tổng quan

Hệ thống AI Menu Management đã được tích hợp với Perplexity AI API để cung cấp các tính năng thông minh giúp quản lý menu và lập kế hoạch bữa ăn.

## 🚀 Tính năng AI

### 1. Gợi ý món ăn từ nguyên liệu có sẵn

- **Mô tả**: AI sẽ phân tích nguyên liệu có trong kho và gợi ý các món ăn phù hợp
- **Cách sử dụng**:
  - Truy cập trang Planner (`/planner`)
  - Chọn "Tính năng AI" hoặc "Chat với AI"
  - Nhấn "Gợi ý món ăn"
- **Lợi ích**: Tối ưu hóa việc sử dụng nguyên liệu, giảm lãng phí

### 2. Lập kế hoạch bữa ăn tuần

- **Mô tả**: AI tạo kế hoạch bữa ăn cân bằng cho cả tuần
- **Tính năng**:
  - Phân bổ bữa sáng, trưa, tối
  - Đa dạng món ăn, cân bằng dinh dưỡng
  - Phù hợp với ngân sách và sở thích
- **Cách sử dụng**: Chọn "Lập kế hoạch tuần" trong AI Features

### 3. Danh sách mua sắm thông minh

- **Mô tả**: Tự động tạo danh sách mua sắm dựa trên thực đơn và tồn kho
- **Tính năng**:
  - Loại trừ nguyên liệu đã có
  - Ước tính số lượng cần mua
  - Phân loại theo nhóm (rau củ, thịt cá, gia vị)
  - Gợi ý nơi mua tốt nhất
- **Cách sử dụng**: Chọn "Danh sách mua sắm" trong AI Features

### 4. Tạo công thức nấu ăn

- **Mô tả**: AI tạo công thức chi tiết cho món ăn
- **Tính năng**:
  - Danh sách nguyên liệu với số lượng
  - Các bước nấu ăn từng bước
  - Thời gian nấu cho mỗi bước
  - Mẹo nấu ăn và lưu ý quan trọng
  - Mức độ khó và số phần ăn
- **Cách sử dụng**: Chọn "Tạo công thức" trong AI Features

### 5. Chat với AI Assistant

- **Mô tả**: Trò chuyện trực tiếp với AI để được tư vấn về quản lý menu
- **Tính năng**:
  - Trả lời câu hỏi về nấu ăn và dinh dưỡng
  - Tư vấn lập kế hoạch bữa ăn
  - Giải đáp thắc mắc về nguyên liệu
  - Hỗ trợ đa ngôn ngữ (tiếng Việt)
- **Cách sử dụng**: Chọn "Chat với AI" trong Planner

## 🛠️ Cách sử dụng

### Truy cập tính năng AI

1. Điều hướng đến trang Planner: `http://localhost:3000/planner`
2. Chọn một trong hai chế độ:
   - **Tính năng AI**: Giao diện card với các tính năng chính
   - **Chat với AI**: Giao diện chat trực tiếp

### Sử dụng AI Quick Actions

- Component `AIQuickActions` có thể được tích hợp vào các trang khác
- Tự động load dữ liệu từ kho và thực đơn hiện tại
- Cung cấp các hành động nhanh cho AI

## 🔧 Cấu hình API

### Perplexity AI API

- **API Key**: `process.env.PERPLEXITY_API_KEY` (cần cấu hình trong file .env.local)
- **Model**: `llama-3.1-sonar-small-128k-online`
- **Endpoint**: `/api/ai`

### Cấu trúc API Request

```typescript
{
  type: 'suggest-dishes' | 'weekly-plan' | 'shopping-list' | 'generate-recipe' | 'chat',
  data: {
    // Dữ liệu cụ thể cho từng loại request
  }
}
```

## 📁 Cấu trúc file

```
src/
├── lib/
│   └── ai-service.ts          # Service chính để gọi Perplexity API
├── app/
│   └── api/
│       └── ai/
│           └── route.ts        # API endpoint cho AI
└── components/
    └── features/
        └── ai/
            ├── index.ts        # Export các component AI
            ├── ai-features.tsx # Component hiển thị các tính năng AI
            ├── ai-chat.tsx     # Component chat với AI
            ├── ai-result.tsx   # Component hiển thị kết quả AI
            └── ai-quick-actions.tsx # Component AI actions nhanh
```

## 🎯 Lợi ích

1. **Tiết kiệm thời gian**: Tự động hóa việc lập kế hoạch bữa ăn
2. **Tối ưu hóa nguyên liệu**: Giảm lãng phí thực phẩm
3. **Cân bằng dinh dưỡng**: AI đảm bảo bữa ăn đa dạng và cân bằng
4. **Trải nghiệm người dùng**: Giao diện thân thiện, dễ sử dụng
5. **Tích hợp thông minh**: Kết nối với dữ liệu hiện có của ứng dụng

## 🔮 Tính năng tương lai

- [ ] Tích hợp với camera để nhận diện nguyên liệu
- [ ] Phân tích dinh dưỡng chi tiết
- [ ] Gợi ý món ăn theo mùa
- [ ] Tích hợp với các ứng dụng mua sắm online
- [ ] Học từ sở thích cá nhân của người dùng
- [ ] Tạo menu cho các dịp đặc biệt

## 🐛 Xử lý lỗi

- **API Error**: Hiển thị thông báo lỗi thân thiện
- **Network Error**: Retry tự động và fallback
- **Invalid Response**: Xử lý graceful với thông báo phù hợp
- **Rate Limiting**: Thông báo khi vượt quá giới hạn API

## 📞 Hỗ trợ

Nếu gặp vấn đề với tính năng AI, vui lòng:

1. Kiểm tra kết nối internet
2. Xác nhận API key còn hiệu lực
3. Kiểm tra console để xem lỗi chi tiết
4. Thử lại sau vài phút nếu có lỗi tạm thời
