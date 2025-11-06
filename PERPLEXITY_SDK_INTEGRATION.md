# Perplexity SDK Integration với Supabase

## Tổng quan

Dự án đã được tích hợp Perplexity SDK với Function Calling để tự động lấy dữ liệu từ Supabase khi cần thiết.

## Cách hoạt động

### 1. Function Calling Flow

```
User hỏi → Perplexity AI → Quyết định cần tool nào → Gọi tool → Lấy data từ Supabase → Trả lời user
```

### 2. Tools có sẵn

#### `get_dishes`
- **Mô tả**: Lấy danh sách món ăn từ database
- **Khi dùng**: User hỏi về món ăn, tìm kiếm món, danh sách món
- **Parameters**:
  - `category` (optional): Lọc theo loại món
  - `search` (optional): Tìm kiếm theo tên
  - `limit` (optional): Giới hạn số lượng

#### `get_ingredients`
- **Mô tả**: Lấy nguyên liệu từ kho
- **Khi dùng**: User hỏi về nguyên liệu, tồn kho, nguyên liệu có sẵn
- **Parameters**:
  - `availableOnly` (optional): Chỉ lấy nguyên liệu còn trong kho
  - `search` (optional): Tìm kiếm theo tên
  - `source` (optional): Lọc theo nguồn nhập
  - `limit` (optional): Giới hạn số lượng

#### `get_menu`
- **Mô tả**: Lấy menu cho một ngày cụ thể
- **Khi dùng**: User hỏi về menu hôm nay, ngày mai, hoặc một ngày nào đó
- **Parameters**:
  - `date` (required): Format YYYY-MM-DD (ví dụ: "2025-01-15")

#### `find_dishes_by_ingredients`
- **Mô tả**: Tìm món ăn có thể nấu với nguyên liệu có sẵn
- **Khi dùng**: User hỏi "món nào có thể nấu với X, Y, Z"
- **Parameters**:
  - `ingredients` (required): Mảng tên nguyên liệu
  - `limit` (optional): Giới hạn số lượng

#### `get_dish_detail`
- **Mô tả**: Lấy thông tin chi tiết một món ăn
- **Khi dùng**: User hỏi về công thức, nguyên liệu của món cụ thể
- **Parameters**:
  - `dishId` (required): ID của món ăn

## Cấu trúc Code

### Files chính

1. **`src/lib/perplexity-tools.ts`**
   - Định nghĩa các tools
   - Handler functions để lấy data từ Supabase
   - Export `getPerplexityToolsFormat()` và `executeTool()`

2. **`src/lib/ai-service.ts`**
   - Sử dụng Perplexity SDK
   - Xử lý tool calling logic
   - Fallback về fetch API nếu SDK lỗi

### Ví dụ sử dụng

```typescript
// Trong ai-service.ts
const content = await this.callPerplexityAPI([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: message },
], true); // useTools = true
```

## Environment Variables

Đảm bảo có các biến môi trường sau trong `.env.local`:

```bash
PERPLEXITY_API_KEY=your_api_key_here
# hoặc
PPLX_API_KEY=your_api_key_here
# hoặc
PPLX_KEY=your_api_key_here

# Optional
PPLX_MODEL=sonar  # Mặc định: sonar

# Supabase (đã có sẵn)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Testing

### Test cases

1. **User hỏi chào hỏi**
   - Expected: AI trả lời trực tiếp, không gọi tools

2. **User hỏi "Có bao nhiêu món ăn?"**
   - Expected: AI gọi `get_dishes()`, đếm và trả lời

3. **User hỏi "Món nào có thể nấu với thịt heo?"**
   - Expected: AI gọi `find_dishes_by_ingredients({ ingredients: ["thịt heo"] })`

4. **User hỏi "Menu hôm nay có gì?"**
   - Expected: AI gọi `get_menu({ date: "2025-01-15" })` với ngày hôm nay

## Troubleshooting

### Lỗi: "Tool not found"
- Kiểm tra tên tool trong `perplexity-tools.ts`
- Đảm bảo tool đã được export trong `getPerplexityToolsFormat()`

### Lỗi: "Missing Perplexity API key"
- Kiểm tra `.env.local` có `PERPLEXITY_API_KEY`
- Restart dev server sau khi thêm env var

### Tools không được gọi
- Kiểm tra system prompt có hướng dẫn AI dùng tools
- Kiểm tra `useTools = true` trong `callPerplexityAPI()`
- Xem logs để debug: `logger.info('Executing tool: ...')`

### Fallback về fetch API
- Nếu SDK lỗi, code sẽ tự động fallback về fetch API
- Kiểm tra logs để xem lỗi gì

## Lợi ích

1. **Thông minh hơn**: AI tự quyết định khi nào cần data
2. **Hiệu quả hơn**: Chỉ fetch data khi cần, không fetch tất cả
3. **Linh hoạt hơn**: Dễ thêm tools mới
4. **Chính xác hơn**: Data luôn từ database thực tế

## Mở rộng

Để thêm tool mới:

1. Tạo handler function trong `perplexity-tools.ts`
2. Thêm vào `perplexityTools` array
3. Cập nhật system prompt nếu cần

Ví dụ:

```typescript
// Thêm tool mới
{
  name: 'get_recipe',
  description: 'Lấy công thức nấu ăn',
  parameters: {
    type: 'object',
    properties: {
      dishId: { type: 'string' }
    },
    required: ['dishId']
  },
  handler: getRecipeTool
}
```

