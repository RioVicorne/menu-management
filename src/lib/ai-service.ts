import { logger } from './logger';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  error?: string;
}

interface Dish {
  id: string;
  ten_mon_an: string;
  loai_mon_an?: string;
  ingredients?: Array<{
    name: string;
    so_luong?: number;
    don_vi?: string;
  }>;
}

interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  ton_kho_so_luong?: number | string;
  ton_kho_khoi_luong?: number | string;
}

interface RecipeData {
  dishName: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
}

export class AIService {
  private static instance: AIService;
  
  private constructor() {}
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async callPerplexityAPI(messages: AIMessage[]): Promise<string> {
    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Không thể tạo phản hồi từ AI.';
    } catch (error) {
      logger.error('Error calling Perplexity API:', error);
      throw error;
    }
  }

  // Tạo gợi ý món ăn dựa trên nguyên liệu có sẵn
  async suggestDishesFromIngredients(availableIngredients: string[]): Promise<AIResponse> {
    try {
      // Lấy dữ liệu từ database
      const response = await fetch('/api/ai-data?type=ingredients');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'Không thể lấy dữ liệu nguyên liệu');
      }

      const { availableIngredients: dbIngredients, dishesByCategory } = await this.getDishesData();
      
      // Sử dụng nguyên liệu từ database nếu không có input
      const ingredients = availableIngredients.length > 0 ? availableIngredients : dbIngredients;
      
      if (ingredients.length === 0) {
        return {
          content: `❌ **Không có nguyên liệu**\n\nHiện tại kho không có nguyên liệu nào đủ dùng để nấu ăn.\n\n**Gợi ý:**\n• Kiểm tra tồn kho tại trang Storage\n• Mua sắm nguyên liệu cần thiết\n• Cập nhật số lượng nguyên liệu`,
          suggestions: [
            'Kiểm tra tồn kho',
            'Mua sắm nguyên liệu',
            'Cập nhật số lượng'
          ]
        };
      }

      // Tìm món ăn phù hợp từ database
      const suitableDishes = await this.findSuitableDishes(ingredients, dishesByCategory);
      
      if (suitableDishes.length === 0) {
        return {
          content: `🤔 **Không tìm thấy món phù hợp**\n\nVới nguyên liệu hiện có: ${ingredients.join(', ')}\n\n**Gợi ý:**\n• Thêm nguyên liệu mới vào kho\n• Kiểm tra các món ăn khác\n• Tạo công thức mới`,
          suggestions: [
            'Thêm nguyên liệu mới',
            'Kiểm tra món ăn khác',
            'Tạo công thức mới'
          ]
        };
      }

      // Tạo response từ dữ liệu thực
      let content = `🍽️ **Gợi ý món ăn từ nguyên liệu có sẵn**\n\n`;
      content += `**Nguyên liệu có sẵn:** ${ingredients.join(', ')}\n\n`;
      content += `**Món ăn phù hợp:**\n\n`;

      suitableDishes.forEach((dish, index) => {
        content += `**${index + 1}. ${dish.name}**\n`;
        content += `• Loại: ${dish.category}\n`;
        content += `• Mô tả: ${dish.description || 'Món ăn ngon'}\n`;
        content += `• Nguyên liệu cần: ${dish.ingredients.join(', ')}\n\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      content += `• Chọn món phù hợp với sở thích\n`;
      content += `• Kiểm tra đủ nguyên liệu trước khi nấu\n`;
      content += `• Có thể điều chỉnh công thức theo ý muốn`;

      const suggestions = suitableDishes.map(dish => dish.name).slice(0, 5);

      return {
        content,
        suggestions
      };
    } catch (error) {
      logger.error('Error creating dish suggestions:', error);
      
      // Fallback response
      const ingredients = availableIngredients.length > 0 ? availableIngredients.join(', ') : 'chưa có thông tin';
      
      return {
        content: `Dựa trên nguyên liệu có sẵn: ${ingredients}\n\nTôi gợi ý bạn có thể nấu các món sau:\n\n**1. Cơm tấm với thịt nướng**\n- Mô tả: Món ăn truyền thống miền Nam\n- Cách chế biến: Ướp thịt với gia vị, nướng vàng\n- Thời gian: 30 phút\n\n**2. Canh chua cá**\n- Mô tả: Món canh chua đậm đà\n- Cách chế biến: Nấu cá với cà chua, dứa\n- Thời gian: 20 phút\n\n**3. Rau muống xào tỏi**\n- Mô tả: Món rau xanh giòn\n- Cách chế biến: Xào nhanh với tỏi\n- Thời gian: 5 phút\n\n**4. Thịt kho tàu**\n- Mô tả: Thịt kho đậm đà\n- Cách chế biến: Kho với nước dừa\n- Thời gian: 45 phút`,
        suggestions: [
          'Cơm tấm với thịt nướng',
          'Canh chua cá',
          'Rau muống xào tỏi',
          'Thịt kho tàu'
        ],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Lập kế hoạch bữa ăn theo tuần
  async createWeeklyMealPlan(preferences: {
    dietaryRestrictions?: string[];
    favoriteCuisines?: string[];
    budget?: string;
    familySize?: number;
  }): Promise<AIResponse> {
    try {
      // Lấy dữ liệu từ database
      const dishesData = await this.getDishesData();
      const menuData = await this.getMenuData();
      
      const familySize = preferences.familySize || 4;
      const budget = preferences.budget || 'trung bình';
      
      // Lấy các món ăn có sẵn
      const availableDishes = dishesData.allDishes || [];
      
      if (availableDishes.length === 0) {
        return {
          content: `❌ **Không có món ăn**\n\nHiện tại chưa có món ăn nào trong hệ thống.\n\n**Gợi ý:**\n• Thêm món ăn mới tại trang Ingredients\n• Tạo công thức cho các món ăn\n• Cập nhật thông tin món ăn`,
          suggestions: [
            'Thêm món ăn mới',
            'Tạo công thức',
            'Cập nhật thông tin'
          ]
        };
      }

      // Tạo kế hoạch từ dữ liệu thực
      let content = `📅 **Kế hoạch bữa ăn tuần**\n\n`;
      content += `**Thông tin:**\n• Số người: ${familySize}\n• Ngân sách: ${budget}\n• Món có sẵn: ${availableDishes.length}\n\n`;
      
      // Phân chia món ăn theo ngày
      const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      const mealsPerDay = ['Sáng', 'Trưa', 'Tối'];
      
      // Chia món ăn thành các nhóm
      const dishGroups = this.groupDishesByCategory(availableDishes);
      
      content += `**Kế hoạch chi tiết:**\n\n`;
      
      days.forEach((day, dayIndex) => {
        content += `**${day}:**\n`;
        mealsPerDay.forEach((meal, mealIndex) => {
          const dishIndex = (dayIndex * 3 + mealIndex) % availableDishes.length;
          const dish = availableDishes[dishIndex];
          content += `• ${meal}: ${dish.ten_mon_an} (${dish.loai_mon_an || 'Món chính'})\n`;
        });
        content += `\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      content += `• Điều chỉnh món ăn theo sở thích\n`;
      content += `• Kiểm tra nguyên liệu trước khi nấu\n`;
      content += `• Có thể thay đổi thứ tự món ăn\n`;
      content += `• Lưu kế hoạch để tham khảo sau`;

      const suggestions = availableDishes.slice(0, 7).map((dish: Dish) => 
        `${dish.ten_mon_an} (${dish.loai_mon_an || 'Món chính'})`
      );

      return {
        content,
        suggestions
      };
    } catch (error) {
      logger.error('Error creating weekly meal plan:', error);
      
      // Fallback response
      const familySize = preferences.familySize || 4;
      const budget = preferences.budget || 'trung bình';
      
      return {
        content: `Kế hoạch bữa ăn tuần cho ${familySize} người (ngân sách ${budget}):\n\n**Thứ 2:**\n- Sáng: Phở bò (15k/người)\n- Trưa: Cơm với thịt kho, canh chua (25k/người)\n- Tối: Bún bò Huế (20k/người)\n\n**Thứ 3:**\n- Sáng: Bánh mì pate (10k/người)\n- Trưa: Cơm với cá chiên, rau luộc (22k/người)\n- Tối: Cháo gà (18k/người)\n\n**Thứ 4:**\n- Sáng: Xôi đậu xanh (12k/người)\n- Trưa: Cơm với thịt nướng, salad (28k/người)\n- Tối: Mì Quảng (25k/người)\n\n**Thứ 5:**\n- Sáng: Cháo lòng (15k/người)\n- Trưa: Cơm với tôm rang me, canh khổ qua (30k/người)\n- Tối: Bún riêu (22k/người)\n\n**Thứ 6:**\n- Sáng: Bánh cuốn (18k/người)\n- Trưa: Cơm với cá kho tộ, rau muống (25k/người)\n- Tối: Lẩu thái (35k/người)\n\n**Thứ 7:**\n- Sáng: Bún bò (20k/người)\n- Trưa: Cơm với gà nướng, rau củ (32k/người)\n- Tối: Pizza (40k/người)\n\n**Chủ nhật:**\n- Sáng: Dimsum (25k/người)\n- Trưa: BBQ ngoài trời (45k/người)\n- Tối: Cơm tấm (20k/người)\n\n**Tổng chi phí ước tính:** ~1,200k/tuần`,
        suggestions: [
          'Thứ 2: Phở bò - Thịt kho - Bún bò Huế',
          'Thứ 3: Bánh mì - Cá chiên - Cháo gà',
          'Thứ 4: Xôi đậu - Thịt nướng - Mì Quảng',
          'Thứ 5: Cháo lòng - Tôm rang me - Bún riêu',
          'Thứ 6: Bánh cuốn - Cá kho tộ - Lẩu thái',
          'Thứ 7: Bún bò - Gà nướng - Pizza',
          'Chủ nhật: Dimsum - BBQ - Cơm tấm'
        ],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Tạo danh sách mua sắm thông minh
  async createSmartShoppingList(menuItems: string[], currentInventory: string[]): Promise<AIResponse> {
    try {
      // Lấy dữ liệu shopping từ API
      const response = await fetch('/api/shopping');
      const shoppingData = await response.json();
      
      if (shoppingData.error) {
        throw new Error(shoppingData.message || 'Không thể lấy dữ liệu shopping');
      }

      const { totalSources, totalIngredients, groupedBySource } = shoppingData;
      
      if (totalIngredients === 0) {
        return {
          content: `🎉 **Tin tốt!**\n\nKho của bạn hiện tại đã đủ nguyên liệu, không cần mua thêm gì cả!\n\n**Tình trạng kho:**\n• Tất cả nguyên liệu đều đủ dùng\n• Không có nguyên liệu nào sắp hết\n• Có thể tiếp tục nấu ăn bình thường\n\n**Gợi ý:**\n• Kiểm tra lại sau vài ngày\n• Lập kế hoạch mua sắm cho tuần tới\n• Tận dụng nguyên liệu hiện có để nấu ăn`,
          suggestions: [
            'Kho đủ nguyên liệu',
            'Không cần mua sắm',
            'Kiểm tra lại sau vài ngày'
          ]
        };
      }

      // Tạo danh sách mua sắm từ dữ liệu thực tế
      let content = `🛒 **Danh sách mua sắm thông minh**\n\n`;
      content += `**Thống kê:**\n• ${totalSources} nguồn nhập\n• ${totalIngredients} nguyên liệu cần mua\n\n`;
      
      content += `**Danh sách theo nguồn:**\n\n`;
      
      for (const [source, ingredients] of Object.entries(groupedBySource)) {
        const ingredientList = ingredients as Ingredient[];
        content += `**📍 ${source}** (${ingredientList.length} món):\n`;
        ingredientList.forEach((ing: Ingredient) => {
          const qty = Number(ing.ton_kho_so_luong || 0);
          const wgt = Number(ing.ton_kho_khoi_luong || 0);
          const value = Math.max(qty, wgt);
          const status = value === 0 ? 'Hết' : 'Sắp hết';
          content += `• ${ing.ten_nguyen_lieu} (${status})\n`;
        });
        content += `\n`;
      }

      content += `**💡 Gợi ý mua sắm:**\n`;
      content += `• Lên kế hoạch mua sắm theo từng nguồn\n`;
      content += `• Ưu tiên mua những món đã hết trước\n`;
      content += `• Có thể mua số lượng lớn để tiết kiệm\n`;
      content += `• Kiểm tra giá tại các nguồn khác nhau\n\n`;
      
      content += `**📱 Sử dụng:**\n`;
      content += `• Truy cập trang Shopping để xem chi tiết\n`;
      content += `• Sao chép danh sách để mang đi mua\n`;
      content += `• Đánh dấu đã mua để cập nhật kho`;

      const suggestions = Object.entries(groupedBySource).map(([source, ingredients]) => 
        `${source}: ${(ingredients as Ingredient[]).length} nguyên liệu`
      ).slice(0, 5);

      return {
        content,
        suggestions
      };
    } catch (error) {
      logger.error('Error creating smart shopping list:', error);
      
      // Fallback response
      const menu = menuItems.length > 0 ? menuItems.join(', ') : 'chưa có thực đơn';
      const inventory = currentInventory.length > 0 ? currentInventory.join(', ') : 'chưa có tồn kho';
      
      return {
        content: `Danh sách mua sắm thông minh:\n\n**Thực đơn:** ${menu}\n**Tồn kho hiện tại:** ${inventory}\n\n**Cần mua:**\n\n**Rau củ:**\n• Rau muống: 2 bó (15k)\n• Cà chua: 1kg (25k)\n• Hành tây: 500g (10k)\n• Tỏi: 200g (8k)\n• Gừng: 100g (5k)\n\n**Thịt cá:**\n• Thịt ba chỉ: 1kg (120k)\n• Cá basa: 1kg (80k)\n• Thịt gà: 1 con (60k)\n• Tôm: 500g (75k)\n\n**Gia vị:**\n• Nước mắm: 1 chai (35k)\n• Đường: 500g (12k)\n• Muối: 1 gói (5k)\n• Dầu ăn: 1 chai (25k)\n• Hạt nêm: 1 gói (15k)\n\n**Khác:**\n• Gạo: 5kg (50k)\n• Mì gói: 10 gói (30k)\n• Trứng: 30 quả (45k)\n\n**Tổng chi phí ước tính:** ~600k\n\n**Gợi ý mua sắm:**\n• Siêu thị Big C: Giá tốt cho thịt cá\n• Chợ địa phương: Rau củ tươi\n• VinMart: Gia vị và đồ khô`,
        suggestions: [
          'Rau muống: 2 bó (15k)',
          'Thịt ba chỉ: 1kg (120k)',
          'Cá basa: 1kg (80k)',
          'Nước mắm: 1 chai (35k)',
          'Gạo: 5kg (50k)'
        ],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Tạo công thức nấu ăn chi tiết
  async generateRecipe(dishName: string, ingredients: string[]): Promise<AIResponse> {
    try {
      // Lấy dữ liệu công thức từ database
      const response = await fetch('/api/ai-data?type=recipes');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'Không thể lấy dữ liệu công thức');
      }

      // Tìm công thức cho món ăn
      const recipe = (Object.values(data.recipesByDish) as RecipeData[]).find((dish: RecipeData) => 
        dish.dishName.toLowerCase().includes(dishName.toLowerCase()) ||
        dishName.toLowerCase().includes(dish.dishName.toLowerCase())
      );

      if (!recipe) {
        return {
          content: `❌ **Không tìm thấy công thức**\n\nKhông tìm thấy công thức cho món "${dishName}" trong hệ thống.\n\n**Gợi ý:**\n• Kiểm tra tên món ăn\n• Thêm công thức mới\n• Xem các món ăn có sẵn`,
          suggestions: [
            'Kiểm tra tên món ăn',
            'Thêm công thức mới',
            'Xem món ăn có sẵn'
          ]
        };
      }

      // Tạo công thức từ dữ liệu thực
      let content = `👨‍🍳 **Công thức: ${recipe.dishName}**\n\n`;
      
      content += `**Nguyên liệu:**\n`;
      recipe.ingredients.forEach((ingredient: { name: string; quantity: number; unit: string }, index: number) => {
        content += `${index + 1}. ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}\n`;
      });

      content += `\n**Cách làm:**\n\n`;
      content += `**Bước 1:** Chuẩn bị nguyên liệu\n`;
      content += `- Rửa sạch và cắt thái phù hợp\n`;
      content += `- Chuẩn bị gia vị cần thiết\n\n`;
      
      content += `**Bước 2:** Chế biến\n`;
      content += `- Ướp gia vị theo công thức\n`;
      content += `- Chế biến theo từng bước\n\n`;
      
      content += `**Bước 3:** Hoàn thiện\n`;
      content += `- Nếm và điều chỉnh gia vị\n`;
      content += `- Trang trí đẹp mắt\n\n`;

      content += `**Thời gian:** 30-45 phút\n`;
      content += `**Độ khó:** Trung bình\n`;
      content += `**Số phần:** 4 người\n\n`;

      content += `**💡 Mẹo nấu ăn:**\n`;
      content += `• Chuẩn bị nguyên liệu trước khi nấu\n`;
      content += `• Điều chỉnh lửa phù hợp\n`;
      content += `• Nếm thử trong quá trình nấu\n`;
      content += `• Trang trí đẹp mắt để tăng hương vị`;

      const suggestions = [
        'Bước 1: Chuẩn bị nguyên liệu',
        'Bước 2: Ướp gia vị',
        'Bước 3: Chế biến',
        'Bước 4: Hoàn thiện',
        'Mẹo: Điều chỉnh gia vị'
      ];

      return {
        content,
        suggestions
      };
    } catch (error) {
      logger.error('Error generating recipe:', error);
      
      // Fallback response
      const dish = dishName || 'Thịt kho tàu';
      const availableIngredients = ingredients.length > 0 ? ingredients.join(', ') : 'thịt ba chỉ, trứng, nước dừa';
      
      return {
        content: `**Công thức: ${dish}**\n\n**Nguyên liệu:**\n• Thịt ba chỉ: 500g\n• Trứng: 6 quả\n• Nước dừa: 1 trái\n• Hành tím: 2 củ\n• Tỏi: 3 tép\n• Nước mắm: 3 muỗng canh\n• Đường: 2 muỗng canh\n• Hạt nêm: 1 muỗng cà phê\n• Tiêu: 1/2 muỗng cà phê\n\n**Cách làm:**\n\n**Bước 1:** Chuẩn bị nguyên liệu\n- Thịt ba chỉ cắt miếng vuông 3x3cm\n- Trứng luộc chín, bóc vỏ\n- Hành tím, tỏi băm nhỏ\n\n**Bước 2:** Ướp thịt\n- Ướp thịt với nước mắm, đường, hạt nêm, tiêu\n- Để 15 phút cho thấm gia vị\n\n**Bước 3:** Kho thịt\n- Cho thịt vào nồi, đổ nước dừa ngập mặt\n- Đun sôi, hạ lửa nhỏ kho 30 phút\n- Thêm trứng vào kho thêm 15 phút\n\n**Bước 4:** Hoàn thiện\n- Nêm nếm lại cho vừa ăn\n- Kho đến khi nước cạn, thịt mềm\n- Rắc hành tím, tỏi băm lên trên\n\n**Thời gian:** 60 phút\n**Độ khó:** Trung bình\n**Số phần:** 4 người\n\n**Mẹo:**\n• Dùng nước dừa tươi sẽ ngon hơn\n• Kho lửa nhỏ để thịt mềm\n• Có thể thêm cà rốt, khoai tây`,
        suggestions: [
          'Bước 1: Chuẩn bị nguyên liệu',
          'Bước 2: Ướp thịt 15 phút',
          'Bước 3: Kho thịt 30 phút',
          'Bước 4: Thêm trứng kho 15 phút',
          'Hoàn thiện: Nêm nếm và trang trí'
        ],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Chat tổng quát về quản lý menu
  async chatAboutMenuManagement(message: string, context?: {
    currentMenu?: string[];
    availableIngredients?: string[];
    dietaryPreferences?: string[];
  }): Promise<AIResponse> {
    try {
      // Lấy dữ liệu từ database để trả lời
      const ingredientsData = await fetch('/api/ai-data?type=ingredients').then(res => res.json());
      const dishesData = await fetch('/api/ai-data?type=dishes').then(res => res.json());
      const menuData = await fetch('/api/ai-data?type=menu').then(res => res.json());

      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('gợi ý') || lowerMessage.includes('món ăn')) {
        const availableIngredients = context?.availableIngredients || ingredientsData.availableIngredients || [];
        const suitableDishes = await this.findSuitableDishes(availableIngredients, dishesData.dishesByCategory);
        
        if (suitableDishes.length > 0) {
          return {
            content: `Dựa trên nguyên liệu có sẵn: ${availableIngredients.join(', ')}, tôi gợi ý bạn có thể nấu:\n\n${suitableDishes.map((dish, index) => `${index + 1}. ${dish.name} (${dish.category})`).join('\n')}\n\nBạn có muốn tôi tạo công thức chi tiết cho món nào không?`,
            suggestions: suitableDishes.map(dish => dish.name).slice(0, 4)
          };
        } else {
          return {
            content: `Dựa trên nguyên liệu có sẵn: ${availableIngredients.join(', ')}, tôi gợi ý bạn có thể nấu:\n\n• Cơm tấm với thịt nướng\n• Canh chua cá\n• Rau muống xào tỏi\n• Thịt kho tàu\n\nBạn có muốn tôi tạo công thức chi tiết cho món nào không?`,
            suggestions: ['Cơm tấm với thịt nướng', 'Canh chua cá', 'Rau muống xào tỏi', 'Thịt kho tàu']
          };
        }
      }
      
      if (lowerMessage.includes('kế hoạch') || lowerMessage.includes('tuần')) {
        const availableDishes = dishesData.allDishes || [];
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const mealsPerDay = ['Sáng', 'Trưa', 'Tối'];
        
        let content = `Tôi sẽ giúp bạn lập kế hoạch bữa ăn cho tuần này:\n\n`;
        
        days.forEach((day, dayIndex) => {
          content += `**${day}:**\n`;
          mealsPerDay.forEach((meal, mealIndex) => {
            const dishIndex = (dayIndex * 3 + mealIndex) % availableDishes.length;
            const dish = availableDishes[dishIndex];
            content += `- ${meal}: ${dish.ten_mon_an} (${dish.loai_mon_an || 'Món chính'})\n`;
          });
          content += `\n`;
        });
        
        content += `Bạn có muốn tôi điều chỉnh kế hoạch này không?`;
        
        return {
          content,
          suggestions: ['Điều chỉnh kế hoạch', 'Thêm món mới', 'Xem công thức', 'Lưu kế hoạch']
        };
      }
      
      if (lowerMessage.includes('mua sắm') || lowerMessage.includes('shopping')) {
        const lowStockIngredients = ingredientsData.lowStockIngredients || [];
        const outOfStockIngredients = ingredientsData.outOfStockIngredients || [];
        
        let content = `Dựa trên tình trạng kho hiện tại, bạn cần mua:\n\n`;
        
        if (outOfStockIngredients.length > 0) {
          content += `**Cần mua ngay (hết hàng):**\n`;
          outOfStockIngredients.forEach((ingredient: string) => {
            content += `• ${ingredient}\n`;
          });
          content += `\n`;
        }
        
        if (lowStockIngredients.length > 0) {
          content += `**Sắp hết (cần bổ sung):**\n`;
          lowStockIngredients.forEach((ingredient: string) => {
            content += `• ${ingredient}\n`;
          });
          content += `\n`;
        }
        
        content += `Bạn có muốn tôi tạo danh sách chi tiết hơn không?`;
        
        return {
          content,
          suggestions: ['Tạo danh sách chi tiết', 'Kiểm tra tồn kho', 'Mua sắm online', 'Lưu danh sách']
        };
      }
      
      if (lowerMessage.includes('công thức') || lowerMessage.includes('nấu')) {
        const availableDishes = dishesData.allDishes || [];
        const dishSuggestions = availableDishes.slice(0, 4).map((dish: Dish) => dish.ten_mon_an);
        
        return {
          content: `Tôi có thể giúp bạn tạo công thức nấu ăn chi tiết. Bạn muốn nấu món gì?\n\nMột số gợi ý từ hệ thống:\n${dishSuggestions.map((dishName: string, index: number) => `${index + 1}. ${dishName}`).join('\n')}\n\nHãy cho tôi biết món bạn muốn nấu, tôi sẽ tạo công thức từng bước cho bạn!`,
          suggestions: dishSuggestions
        };
      }
      
      // Default response với thông tin từ database
      const availableCount = ingredientsData.available || 0;
      const totalDishes = dishesData.total || 0;
      const totalMenuItems = menuData.total || 0;
      
      return {
        content: `Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn.\n\n**Tình trạng hiện tại:**\n• Nguyên liệu có sẵn: ${availableCount} loại\n• Món ăn trong hệ thống: ${totalDishes} món\n• Món trong menu: ${totalMenuItems} món\n\n**Tôi có thể giúp bạn:**\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?`,
        suggestions: ['Gợi ý món ăn', 'Lập kế hoạch tuần', 'Tạo danh sách mua sắm', 'Tạo công thức']
      };
    } catch (error) {
      logger.error('Error in chat:', error);
      
      // Fallback response
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('gợi ý') || lowerMessage.includes('món ăn')) {
        return {
          content: `Dựa trên nguyên liệu có sẵn: ${context?.availableIngredients?.join(', ') || 'chưa có thông tin'}, tôi gợi ý bạn có thể nấu:\n\n• Cơm tấm với thịt nướng\n• Canh chua cá\n• Rau muống xào tỏi\n• Thịt kho tàu\n\nBạn có muốn tôi tạo công thức chi tiết cho món nào không?`,
          suggestions: ['Cơm tấm với thịt nướng', 'Canh chua cá', 'Rau muống xào tỏi', 'Thịt kho tàu']
        };
      }
      
      return {
        content: `Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?`,
        suggestions: ['Gợi ý món ăn', 'Lập kế hoạch tuần', 'Tạo danh sách mua sắm', 'Tạo công thức'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods để làm việc với database
  private async getDishesData() {
    const response = await fetch('/api/ai-data?type=dishes');
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message || 'Không thể lấy dữ liệu món ăn');
    }
    
    return data;
  }

  private async getMenuData() {
    const response = await fetch('/api/ai-data?type=menu');
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message || 'Không thể lấy dữ liệu menu');
    }
    
    return data;
  }

  private groupDishesByCategory(dishes: Dish[]) {
    return dishes.reduce((acc: Record<string, Dish[]>, dish: Dish) => {
      const category = dish.loai_mon_an || 'Khác';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(dish);
      return acc;
    }, {});
  }

  private async findSuitableDishes(ingredients: string[], dishesByCategory: Record<string, Dish[]>) {
    // Lấy dữ liệu công thức để tìm món phù hợp
    const response = await fetch('/api/ai-data?type=recipes');
    const data = await response.json();
    
    if (data.error) {
      return [];
    }

    const suitableDishes = [];
    
    // Tìm món ăn có nguyên liệu phù hợp
    for (const [dishId, recipe] of Object.entries(data.recipesByDish)) {
      const dish = recipe as RecipeData;
      const requiredIngredients = dish.ingredients?.map((ing: { name: string }) => ing.name.toLowerCase()) || [];
      
      // Kiểm tra xem có đủ nguyên liệu không
      const availableIngredientsLower = ingredients.map(ing => ing.toLowerCase());
      const hasEnoughIngredients = requiredIngredients.every((reqIng: string) => 
        availableIngredientsLower.some(availIng => 
          availIng.includes(reqIng) || reqIng.includes(availIng)
        )
      );
      
      if (hasEnoughIngredients) {
        suitableDishes.push({
          name: dish.dishName,
          category: 'Món ăn',
          description: 'Món ăn ngon từ nguyên liệu có sẵn',
          ingredients: requiredIngredients
        });
      }
    }
    
    return suitableDishes.slice(0, 5); // Giới hạn 5 món
  }

  // Helper methods để extract thông tin từ response
  private extractDishSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('món') || line.includes('ăn') || line.includes(':')) {
        const cleanLine = line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (cleanLine.length > 10) {
          suggestions.push(cleanLine);
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private extractMealPlanSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    
    for (const day of days) {
      if (content.includes(day)) {
        suggestions.push(`${day}: ${content.split(day)[1]?.split('\n')[0] || ''}`);
      }
    }
    
    return suggestions;
  }

  private extractShoppingListItems(content: string): string[] {
    const items: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('kg') || line.includes('g') || line.includes('cái') || line.includes('bó')) {
        const cleanLine = line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (cleanLine.length > 5) {
          items.push(cleanLine);
        }
      }
    }
    
    return items.slice(0, 10); // Limit to 10 items
  }

  private extractRecipeSteps(content: string): string[] {
    const steps: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\./) || line.includes('Bước') || line.includes('bước')) {
        const cleanLine = line.replace(/^\d+\.?\s*/, '').replace(/^Bước\s*\d+:\s*/, '').trim();
        if (cleanLine.length > 10) {
          steps.push(cleanLine);
        }
      }
    }
    
    return steps.slice(0, 8); // Limit to 8 steps
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();
