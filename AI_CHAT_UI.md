# 🤖 AI Chat Interface - ChatGPT Style

## Tổng quan

Giao diện chat AI đã được thiết kế lại hoàn toàn để giống ChatGPT với các tính năng hiện đại và trải nghiệm người dùng tốt nhất.

## 🎨 Tính năng giao diện mới

### 1. **Layout giống ChatGPT**

- **Sidebar trái**: Hiển thị lịch sử chat và quản lý cuộc trò chuyện
- **Main area**: Khu vực chat chính với tin nhắn và input
- **Header**: Thông tin AI Assistant và trạng thái hoạt động

### 2. **Chat Messages**

- **Bubble design**: Tin nhắn được hiển thị dưới dạng bubble đẹp mắt
- **User messages**: Màu xanh, căn phải
- **Bot messages**: Màu xám, căn trái với avatar AI
- **AI Results**: Hiển thị kết quả AI với formatting đặc biệt

### 3. **Chat Input**

- **Auto-resize textarea**: Tự động điều chỉnh chiều cao
- **Quick features**: Các nút tính năng nhanh (Gợi ý món ăn, Kế hoạch tuần, v.v.)
- **Suggestions dropdown**: Gợi ý tin nhắn nhanh
- **Voice input**: Nút microphone (UI only)
- **File attachment**: Nút đính kèm file (UI only)

### 4. **Chat Sidebar**

- **Session management**: Tạo, xóa, đổi tên cuộc trò chuyện
- **Chat history**: Lịch sử các cuộc trò chuyện
- **Session info**: Thời gian, số tin nhắn, tin nhắn cuối
- **Empty state**: Giao diện khi chưa có cuộc trò chuyện

### 5. **Interactive Features**

- **Copy message**: Sao chép tin nhắn
- **Like/Dislike**: Đánh giá tin nhắn
- **Regenerate**: Tạo lại phản hồi AI
- **More options**: Menu thêm tùy chọn

## 🚀 Cách sử dụng

### Truy cập Chat AI

1. Điều hướng đến `http://localhost:3001/planner`
2. Chọn "Chat với AI"
3. Bắt đầu trò chuyện với AI Assistant

### Quản lý cuộc trò chuyện

- **Tạo mới**: Nhấn "Cuộc trò chuyện mới" trong sidebar
- **Chuyển đổi**: Click vào cuộc trò chuyện trong sidebar
- **Đổi tên**: Click vào icon edit (✏️) khi hover
- **Xóa**: Click vào icon trash (🗑️) khi hover

### Sử dụng tính năng AI

- **Gợi ý nhanh**: Sử dụng các nút trong input area
- **Gửi tin nhắn**: Nhập và nhấn Enter hoặc click Send
- **Xuống dòng**: Shift + Enter
- **Sao chép**: Click icon copy dưới tin nhắn AI

## 📱 Responsive Design

### Desktop (≥1024px)

- Sidebar hiển thị đầy đủ
- Layout 2 cột
- Hover effects đầy đủ

### Tablet (768px - 1023px)

- Sidebar có thể thu gọn
- Layout responsive
- Touch-friendly buttons

### Mobile (<768px)

- Sidebar overlay
- Full-width chat area
- Optimized touch interface
- Hamburger menu để mở sidebar

## 🎯 Tính năng đặc biệt

### 1. **Smart Session Management**

- Tự động đặt tên cuộc trò chuyện từ tin nhắn đầu tiên
- Cập nhật thời gian và số tin nhắn real-time
- Lưu trữ lịch sử cuộc trò chuyện

### 2. **AI Result Display**

- Formatting đặc biệt cho kết quả AI
- Hiển thị suggestions dưới dạng bullet points
- Error handling với UI thân thiện

### 3. **Typing Indicator**

- Animation typing dots khi AI đang trả lời
- Smooth transitions
- Loading states

### 4. **Keyboard Shortcuts**

- `Enter`: Gửi tin nhắn
- `Shift + Enter`: Xuống dòng
- `Escape`: Thoát edit mode

## 🎨 Styling & Animations

### Animations

- **Fade in**: Tin nhắn xuất hiện với hiệu ứng fade
- **Slide in**: Sidebar slide từ trái
- **Hover effects**: Transform và shadow effects
- **Loading**: Pulse animation cho typing indicator

### Color Scheme

- **Primary**: Blue gradient (#3b82f6 to #8b5cf6)
- **User messages**: Blue (#3b82f6)
- **Bot messages**: Gray (#f3f4f6)
- **Dark mode**: Full dark theme support

### Typography

- **Font**: System fonts với fallbacks
- **Sizes**: Responsive text sizing
- **Line height**: Optimized for readability

## 🔧 Customization

### CSS Classes

```css
.chat-message-enter     /* Message animation */
.message-bubble-user    /* User message styling */
.message-bubble-bot     /* Bot message styling */
.quick-action-button    /* Quick feature buttons */
.session-item          /* Session list items */
```

### Theme Variables

```css
--chat-primary: #3b82f6 --chat-secondary: #8b5cf6 --chat-background: #ffffff
  --chat-text: #374151;
```

## 🐛 Troubleshooting

### Common Issues

1. **Sidebar không hiển thị**: Check responsive breakpoints
2. **Messages không load**: Check API connection
3. **Styling issues**: Ensure CSS import in globals.css

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📈 Performance

### Optimizations

- **Lazy loading**: Messages load on demand
- **Virtual scrolling**: For large chat histories
- **Debounced input**: Prevent excessive API calls
- **Memoized components**: React.memo for performance

### Bundle Size

- **ChatMessage**: ~2KB
- **ChatInput**: ~3KB
- **ChatSidebar**: ~4KB
- **Total**: ~9KB (minified)

## 🔮 Future Enhancements

- [ ] Voice input integration
- [ ] File upload support
- [ ] Message search
- [ ] Export chat history
- [ ] Custom AI personalities
- [ ] Multi-language support
- [ ] Real-time collaboration
- [ ] Chat templates

---

**Lưu ý**: Giao diện này được thiết kế để tương thích với hệ thống AI hiện có và có thể dễ dàng mở rộng với các tính năng mới.
