import { logger } from "./logger";
import { Perplexity } from "@perplexity-ai/perplexity_ai";
import { getMenuItems } from "./api";

// Support multiple env var names to avoid misconfig in different runtimes (Node/Bun)
const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY ||
  process.env.PPLX_API_KEY ||
  process.env.PPLX_KEY;
const PERPLEXITY_MODEL = process.env.PPLX_MODEL || "sonar"; // optional override

// Initialize Perplexity client
let perplexityClient: Perplexity | null = null;

function getPerplexityClient(): Perplexity {
  if (!PERPLEXITY_API_KEY) {
    throw new Error(
      "Missing Perplexity API key. Set PERPLEXITY_API_KEY in .env.local"
    );
  }

  if (!perplexityClient) {
    perplexityClient = new Perplexity({
      apiKey: PERPLEXITY_API_KEY,
    });
  }

  return perplexityClient;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type AIData =
  | {
      type: "advanced-meal-plan";
      mealPlan: unknown;
      analysis: unknown;
      shoppingList: unknown;
    }
  | {
      type: "seasonal-recommendations";
      weatherInfo: unknown;
      recommendations: unknown;
      suggestions: unknown;
    }
  | {
      type: "special-occasions";
      occasions: unknown;
      preferences: unknown;
    };

export interface AIResponse {
  content: string;
  suggestions?: string[];
  error?: string;
  aiData?: AIData;
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

type MenuIntent =
  | { type: "today" }
  | { type: "yesterday" }
  | { type: "random-menu"; adults?: number; kids?: number };

export class AIService {
  private static instance: AIService;

  private constructor() {}

  // Normalize Perplexity message content into a plain string
  private normalizeMessageContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      try {
        const parts = content
          .map((chunk: unknown) => {
            if (typeof chunk === "string") return chunk;
            if (chunk && typeof chunk === "object") {
              const anyChunk = chunk as Record<string, unknown>;
              // Common shape: { type: 'text', text: '...' }
              if (
                anyChunk.type === "text" &&
                typeof anyChunk.text === "string"
              ) {
                return String(anyChunk.text);
              }
              // Fallback: stringify non-text chunks minimally
              return "";
            }
            return "";
          })
          .filter(Boolean);
        return parts.join("\n").trim() || "Không thể tạo phản hồi từ AI.";
      } catch {
        return "Không thể tạo phản hồi từ AI.";
      }
    }
    // Last resort
    try {
      return JSON.stringify(content);
    } catch {
      return "Không thể tạo phản hồi từ AI.";
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Gọi Perplexity API (đơn giản, không dùng tools)
  private async callPerplexityAPI(messages: AIMessage[]): Promise<string> {
    try {
      const client = getPerplexityClient();
      const model = PERPLEXITY_MODEL;

      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const content = response.choices?.[0]?.message?.content as unknown;
      const text = this.normalizeMessageContent(content);
      if (!text) throw new Error("No response from Perplexity API");
      return text;
    } catch (error) {
      logger.error("Error calling Perplexity API (SDK):", error);
      // Fallback to fetch API
      return this.callPerplexityAPIFallback(messages);
    }
  }

  // (Đã bỏ tool-calling fallback: không cần pre-fetch đặc biệt ở đây)

  /**
   * Fallback method using fetch API (for compatibility)
   */
  private async callPerplexityAPIFallback(
    messages: AIMessage[]
  ): Promise<string> {
    try {
      const model = PERPLEXITY_MODEL;
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
          }),
        }
      );

      if (!response.ok) {
        let errBody: unknown;
        try {
          errBody = await response.json();
        } catch {
          try {
            errBody = await response.text();
          } catch {
            errBody = undefined;
          }
        }
        logger.error(
          `Perplexity API error (model=${model}): ${response.status} ${response.statusText}`,
          errBody
        );
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content as unknown;
      return this.normalizeMessageContent(content);
    } catch (error) {
      logger.error("Error in fallback API call:", error);
      throw error;
    }
  }

  // Tạo gợi ý món ăn dựa trên nguyên liệu có sẵn
  async suggestDishesFromIngredients(
    availableIngredients: string[]
  ): Promise<AIResponse> {
    try {
      // Lấy dữ liệu từ database
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/ai-data?type=ingredients`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Không thể lấy dữ liệu nguyên liệu");
      }

      const { availableIngredients: dbIngredients, dishesByCategory } =
        await this.getDishesData();

      // Sử dụng nguyên liệu từ database nếu không có input
      const ingredients =
        availableIngredients && availableIngredients.length > 0
          ? availableIngredients
          : dbIngredients || [];

      if (!ingredients || ingredients.length === 0) {
        return {
          content: `❌ **Không có nguyên liệu**\n\nHiện tại kho không có nguyên liệu nào đủ dùng để nấu ăn.\n\n**Gợi ý:**\n• Kiểm tra tồn kho tại trang Storage\n• Mua sắm nguyên liệu cần thiết\n• Cập nhật số lượng nguyên liệu`,
          suggestions: [
            "Kiểm tra tồn kho",
            "Mua sắm nguyên liệu",
            "Cập nhật số lượng",
          ],
        };
      }

      // Tìm món ăn phù hợp từ database
      const suitableDishes = await this.findSuitableDishes(
        ingredients,
        dishesByCategory
      );

      if (!suitableDishes || suitableDishes.length === 0) {
        return {
          content: `🤔 **Không tìm thấy món phù hợp**\n\nVới nguyên liệu hiện có: ${ingredients.join(", ")}\n\n**Gợi ý:**\n• Thêm nguyên liệu mới vào kho\n• Kiểm tra các món ăn khác\n• Tạo công thức mới`,
          suggestions: [
            "Thêm nguyên liệu mới",
            "Kiểm tra món ăn khác",
            "Tạo công thức mới",
          ],
        };
      }

      // Tạo response từ dữ liệu thực
      let content = `🍽️ **Gợi ý món ăn từ nguyên liệu có sẵn**\n\n`;
      content += `**Nguyên liệu có sẵn:** ${ingredients.join(", ")}\n\n`;
      content += `**Món ăn phù hợp:**\n\n`;

      suitableDishes.forEach((dish, index) => {
        content += `**${index + 1}. ${dish.name}**\n`;
        content += `• Loại: ${dish.category}\n`;
        content += `• Mô tả: ${dish.description || "Món ăn ngon"}\n`;
        content += `• Nguyên liệu cần: ${dish.ingredients.join(", ")}\n\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      content += `• Chọn món phù hợp với sở thích\n`;
      content += `• Kiểm tra đủ nguyên liệu trước khi nấu\n`;
      content += `• Có thể điều chỉnh công thức theo ý muốn`;

      const suggestions = suitableDishes.map((dish) => dish.name).slice(0, 5);

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error creating dish suggestions:", error);

      // Fallback response
      const ingredients =
        availableIngredients && availableIngredients.length > 0
          ? availableIngredients.join(", ")
          : "chưa có thông tin";

      return {
        content: `Dựa trên nguyên liệu có sẵn: ${ingredients}\n\nTôi gợi ý bạn có thể nấu các món sau:\n\n**1. Cơm tấm với thịt nướng**\n- Mô tả: Món ăn truyền thống miền Nam\n- Cách chế biến: Ướp thịt với gia vị, nướng vàng\n- Thời gian: 30 phút\n\n**2. Canh chua cá**\n- Mô tả: Món canh chua đậm đà\n- Cách chế biến: Nấu cá với cà chua, dứa\n- Thời gian: 20 phút\n\n**3. Rau muống xào tỏi**\n- Mô tả: Món rau xanh giòn\n- Cách chế biến: Xào nhanh với tỏi\n- Thời gian: 5 phút\n\n**4. Thịt kho tàu**\n- Mô tả: Thịt kho đậm đà\n- Cách chế biến: Kho với nước dừa\n- Thời gian: 45 phút`,
        suggestions: [
          "Cơm tấm với thịt nướng",
          "Canh chua cá",
          "Rau muống xào tỏi",
          "Thịt kho tàu",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Lập kế hoạch bữa ăn theo tuần (cơ bản)
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
      const budget = preferences.budget || "trung bình";

      // Lấy các món ăn có sẵn
      const availableDishes = dishesData.allDishes || [];

      if (availableDishes.length === 0) {
        return {
          content: `❌ **Không có món ăn**\n\nHiện tại chưa có món ăn nào trong hệ thống.\n\n**Gợi ý:**\n• Thêm món ăn mới tại trang Ingredients\n• Tạo công thức cho các món ăn\n• Cập nhật thông tin món ăn`,
          suggestions: [
            "Thêm món ăn mới",
            "Tạo công thức",
            "Cập nhật thông tin",
          ],
        };
      }

      // Tạo kế hoạch từ dữ liệu thực
      let content = `📅 **Kế hoạch bữa ăn tuần**\n\n`;
      content += `**Thông tin:**\n• Số người: ${familySize}\n• Ngân sách: ${budget}\n• Món có sẵn: ${availableDishes.length}\n\n`;

      // Phân chia món ăn theo ngày
      const days = [
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
        "Chủ nhật",
      ];
      const mealsPerDay = ["Sáng", "Trưa", "Tối"];

      // Chia món ăn thành các nhóm
      const dishGroups = this.groupDishesByCategory(availableDishes);

      content += `**Kế hoạch chi tiết:**\n\n`;

      days.forEach((day, dayIndex) => {
        content += `**${day}:**\n`;
        mealsPerDay.forEach((meal, mealIndex) => {
          const dishIndex = (dayIndex * 3 + mealIndex) % availableDishes.length;
          const dish = availableDishes[dishIndex];
          content += `• ${meal}: ${dish.ten_mon_an} (${dish.loai_mon_an || "Món chính"})\n`;
        });
        content += `\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      content += `• Điều chỉnh món ăn theo sở thích\n`;
      content += `• Kiểm tra nguyên liệu trước khi nấu\n`;
      content += `• Có thể thay đổi thứ tự món ăn\n`;
      content += `• Lưu kế hoạch để tham khảo sau`;

      const suggestions = availableDishes
        .slice(0, 7)
        .map(
          (dish: Dish) =>
            `${dish.ten_mon_an} (${dish.loai_mon_an || "Món chính"})`
        );

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error creating weekly meal plan:", error);

      // Fallback response
      const familySize = preferences.familySize || 4;
      const budget = preferences.budget || "trung bình";

      return {
        content: `Kế hoạch bữa ăn tuần cho ${familySize} người (ngân sách ${budget}):\n\n**Thứ 2:**\n- Sáng: Phở bò (15k/người)\n- Trưa: Cơm với thịt kho, canh chua (25k/người)\n- Tối: Bún bò Huế (20k/người)\n\n**Thứ 3:**\n- Sáng: Bánh mì pate (10k/người)\n- Trưa: Cơm với cá chiên, rau luộc (22k/người)\n- Tối: Cháo gà (18k/người)\n\n**Thứ 4:**\n- Sáng: Xôi đậu xanh (12k/người)\n- Trưa: Cơm với thịt nướng, salad (28k/người)\n- Tối: Mì Quảng (25k/người)\n\n**Thứ 5:**\n- Sáng: Cháo lòng (15k/người)\n- Trưa: Cơm với tôm rang me, canh khổ qua (30k/người)\n- Tối: Bún riêu (22k/người)\n\n**Thứ 6:**\n- Sáng: Bánh cuốn (18k/người)\n- Trưa: Cơm với cá kho tộ, rau muống (25k/người)\n- Tối: Lẩu thái (35k/người)\n\n**Thứ 7:**\n- Sáng: Bún bò (20k/người)\n- Trưa: Cơm với gà nướng, rau củ (32k/người)\n- Tối: Pizza (40k/người)\n\n**Chủ nhật:**\n- Sáng: Dimsum (25k/người)\n- Trưa: BBQ ngoài trời (45k/người)\n- Tối: Cơm tấm (20k/người)\n\n**Tổng chi phí ước tính:** ~1,200k/tuần`,
        suggestions: [
          "Thứ 2: Phở bò - Thịt kho - Bún bò Huế",
          "Thứ 3: Bánh mì - Cá chiên - Cháo gà",
          "Thứ 4: Xôi đậu - Thịt nướng - Mì Quảng",
          "Thứ 5: Cháo lòng - Tôm rang me - Bún riêu",
          "Thứ 6: Bánh cuốn - Cá kho tộ - Lẩu thái",
          "Thứ 7: Bún bò - Gà nướng - Pizza",
          "Chủ nhật: Dimsum - BBQ - Cơm tấm",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Lập kế hoạch bữa ăn nâng cao với tối ưu hóa dinh dưỡng và ngân sách
  async createAdvancedMealPlan(preferences: {
    familySize: number;
    budget: number; // VND per week
    dietaryRestrictions: string[];
    favoriteCuisines: string[];
    healthGoals: string[];
    mealFrequency: number;
    cookingTime: "quick" | "moderate" | "extensive";
    duration: number; // days
  }): Promise<AIResponse> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/advanced-meal-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences,
          duration: preferences.duration,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(
          data.message || "Không thể tạo kế hoạch bữa ăn nâng cao"
        );
      }

      // Format response for AI display
      let content = `🎯 **Kế hoạch bữa ăn nâng cao**\n\n`;
      content += `**Thông tin:**\n`;
      content += `• Số người: ${preferences.familySize}\n`;
      content += `• Ngân sách: ${preferences.budget.toLocaleString()}VND/tuần\n`;
      content += `• Thời gian: ${preferences.duration} ngày\n`;
      content += `• Mục tiêu sức khỏe: ${preferences.healthGoals.join(", ")}\n`;
      content += `• Thời gian nấu: ${preferences.cookingTime}\n\n`;

      content += `**Phân tích dinh dưỡng:**\n`;
      content += `• Tổng chi phí: ${data.analysis.totalCost.toLocaleString()}VND\n`;
      content += `• Chi phí trung bình/ngày: ${data.analysis.avgDailyCost.toLocaleString()}VND\n`;
      content += `• Điểm sức khỏe: ${data.analysis.healthScore}/100\n\n`;

      content += `**Dinh dưỡng trung bình/ngày:**\n`;
      content += `• Calo: ${Math.round(data.analysis.totalNutrition.calories / preferences.duration)}\n`;
      content += `• Protein: ${Math.round((data.analysis.totalNutrition.protein / preferences.duration) * 10) / 10}g\n`;
      content += `• Carb: ${Math.round((data.analysis.totalNutrition.carbs / preferences.duration) * 10) / 10}g\n`;
      content += `• Chất béo: ${Math.round((data.analysis.totalNutrition.fat / preferences.duration) * 10) / 10}g\n\n`;

      content += `**Kế hoạch chi tiết:**\n\n`;

      data.mealPlan.forEach((day: any, index: number) => {
        content += `**${day.day} (${day.date}):**\n`;
        day.meals.forEach((meal: any) => {
          content += `• ${meal.mealType}: ${meal.dish.dishName}\n`;
          content += `  - Calo: ${meal.nutrition.calories}, Protein: ${meal.nutrition.protein}g\n`;
          content += `  - Chi phí: ${meal.dish.estimatedCost.toLocaleString()}VND\n`;
        });
        content += `• Tổng ngày: ${day.dailyNutrition.calories} calo, ${day.dailyNutrition.cost.toLocaleString()}VND\n\n`;
      });

      content += `**Khuyến nghị:**\n`;
      data.analysis.recommendations.forEach((rec: string) => {
        content += `${rec}\n`;
      });

      content += `\n**Danh sách mua sắm:**\n`;
      data.shoppingList.slice(0, 10).forEach((item: any) => {
        content += `• ${item.ingredient}: ${item.totalQuantity} ${item.unit} (${item.estimatedCost.toLocaleString()}VND)\n`;
      });

      const suggestions = data.mealPlan
        .slice(0, 3)
        .map(
          (day: any) =>
            `${day.day}: ${day.meals.map((m: any) => m.dish.dishName).join(", ")}`
        );

      return {
        content,
        suggestions,
        aiData: {
          type: "advanced-meal-plan",
          mealPlan: data.mealPlan,
          analysis: data.analysis,
          shoppingList: data.shoppingList,
        },
      };
    } catch (error) {
      logger.error("Error creating advanced meal plan:", error);

      return {
        content: `❌ **Lỗi tạo kế hoạch bữa ăn nâng cao**\n\nCó lỗi xảy ra khi tạo kế hoạch bữa ăn nâng cao.\n\n**Nguyên nhân có thể:**\n• Không có món ăn trong hệ thống\n• Dữ liệu dinh dưỡng chưa đầy đủ\n• Lỗi kết nối cơ sở dữ liệu\n\n**Gợi ý:**\n• Thêm món ăn và công thức\n• Kiểm tra kết nối database\n• Thử lại sau vài phút`,
        suggestions: [
          "Thêm món ăn mới",
          "Kiểm tra công thức",
          "Thử lại sau",
          "Liên hệ hỗ trợ",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Gợi ý món ăn theo mùa và thời tiết
  async suggestSeasonalDishes(preferences?: {
    healthCondition?: string;
    category?: string;
    customWeather?: {
      temperature: number;
      condition: string;
      season: string;
    };
  }): Promise<AIResponse> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/seasonal-recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weather: preferences?.customWeather,
          healthCondition: preferences?.healthCondition,
          preferences: {
            category: preferences?.category,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Không thể tạo gợi ý theo mùa");
      }

      // Format response for AI display
      let content = `🌤️ **Gợi ý món ăn theo mùa và thời tiết**\n\n`;

      content += `**Thông tin thời tiết:**\n`;
      content += `• Mùa: ${this.getSeasonName(data.analysis.season)}\n`;
      content += `• Nhiệt độ: ${data.analysis.temperature}°C\n`;
      content += `• Thời tiết: ${this.getWeatherName(data.analysis.condition)}\n`;
      content += `• Độ ẩm: ${data.analysis.humidity}%\n\n`;

      content += `**Món ăn phù hợp:**\n\n`;

      data.recommendations.forEach((dish: any, index: number) => {
        content += `**${index + 1}. ${dish.dishName}**\n`;
        content += `• Danh mục: ${dish.category}\n`;
        content += `• Mô tả: ${dish.description}\n`;
        content += `• Lợi ích: ${dish.benefits.join(", ")}\n`;
        content += `• Nguyên liệu: ${dish.ingredients.slice(0, 3).join(", ")}${dish.ingredients.length > 3 ? "..." : ""}\n\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      data.suggestions.forEach((suggestion: string) => {
        content += `${suggestion}\n`;
      });

      const suggestions = data.recommendations
        .map((dish: any) => dish.dishName)
        .slice(0, 5);

      return {
        content,
        suggestions,
        aiData: {
          type: "seasonal-recommendations",
          weatherInfo: data.weatherInfo,
          recommendations: data.recommendations,
          suggestions: data.suggestions,
        },
      };
    } catch (error) {
      logger.error("Error creating seasonal recommendations:", error);

      return {
        content: `❌ **Lỗi tạo gợi ý theo mùa**\n\nCó lỗi xảy ra khi tạo gợi ý món ăn theo mùa và thời tiết.\n\n**Nguyên nhân có thể:**\n• Lỗi kết nối API\n• Dữ liệu thời tiết không khả dụng\n• Lỗi xử lý dữ liệu\n\n**Gợi ý:**\n• Thử lại sau vài phút\n• Kiểm tra kết nối internet\n• Liên hệ hỗ trợ nếu vấn đề tiếp tục`,
        suggestions: [
          "Thử lại sau",
          "Kiểm tra kết nối",
          "Liên hệ hỗ trợ",
          "Sử dụng tính năng khác",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper methods để convert tên mùa và thời tiết
  private getSeasonName(season: string): string {
    const seasonNames: Record<string, string> = {
      spring: "Xuân",
      summer: "Hè",
      autumn: "Thu",
      winter: "Đông",
    };
    return seasonNames[season] || season;
  }

  private getWeatherName(condition: string): string {
    const weatherNames: Record<string, string> = {
      sunny: "Nắng",
      cloudy: "Nhiều mây",
      rainy: "Mưa",
      stormy: "Bão",
      foggy: "Sương mù",
      snowy: "Tuyết",
    };
    return weatherNames[condition] || condition;
  }

  // Tạo menu cho dịp đặc biệt
  async createSpecialOccasionMenu(preferences: {
    occasionType: string;
    guestCount?: number;
    budget?: number;
    dietaryRestrictions?: string[];
    favoriteDishes?: string[];
  }): Promise<AIResponse> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/special-occasions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          occasionType: preferences.occasionType,
          preferences: {
            guestCount: preferences.guestCount,
            budget: preferences.budget,
            dietaryRestrictions: preferences.dietaryRestrictions,
            favoriteDishes: preferences.favoriteDishes,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Không thể tạo menu dịp đặc biệt");
      }

      const occasions = data.data.occasions;
      if (!occasions || occasions.length === 0) {
        return {
          content: `❌ **Không tìm thấy dịp đặc biệt**\n\nKhông tìm thấy dịp đặc biệt phù hợp với yêu cầu của bạn.\n\n**Gợi ý:**\n• Kiểm tra lại loại dịp\n• Thử các dịp khác\n• Liên hệ hỗ trợ`,
          suggestions: [
            "Kiểm tra lại loại dịp",
            "Thử dịp khác",
            "Liên hệ hỗ trợ",
          ],
        };
      }

      // Format response for AI display
      let content = `🎉 **Menu cho dịp đặc biệt**\n\n`;

      content += `**Các dịp phù hợp:**\n\n`;

      occasions.slice(0, 5).forEach((occasion: any, index: number) => {
        content += `**${index + 1}. ${occasion.name}**\n`;
        content += `• Mô tả: ${occasion.description}\n`;
        content += `• Ngân sách: ${this.getBudgetName(occasion.budget)}\n`;
        content += `• Số khách: ${occasion.guestCount.min}-${occasion.guestCount.max} người\n`;
        content += `• Thời gian chuẩn bị: ${this.getDurationName(occasion.duration)}\n`;
        content += `• Mức độ trang trọng: ${this.getFormalityName(occasion.formality)}\n\n`;
      });

      content += `**💡 Gợi ý:**\n`;
      content += `• Chọn dịp phù hợp với ngân sách và số lượng khách\n`;
      content += `• Chuẩn bị trước các món có thể làm sẵn\n`;
      content += `• Sắp xếp bàn ghế và trang trí phù hợp\n`;
      content += `• Có kế hoạch dự phòng cho các món ăn\n\n`;

      content += `**📋 Các bước tiếp theo:**\n`;
      content += `• Chọn dịp cụ thể để xem menu chi tiết\n`;
      content += `• Điều chỉnh menu theo sở thích\n`;
      content += `• Lập danh sách mua sắm\n`;
      content += `• Chuẩn bị dụng cụ và nguyên liệu`;

      const suggestions = occasions
        .slice(0, 5)
        .map((occasion: any) => occasion.name);

      return {
        content,
        suggestions,
        aiData: {
          type: "special-occasions",
          occasions: occasions,
          preferences: preferences,
        },
      };
    } catch (error) {
      logger.error("Error creating special occasion menu:", error);

      return {
        content: `❌ **Lỗi tạo menu dịp đặc biệt**\n\nCó lỗi xảy ra khi tạo menu cho dịp đặc biệt.\n\n**Nguyên nhân có thể:**\n• Lỗi kết nối API\n• Dữ liệu dịp đặc biệt không khả dụng\n• Lỗi xử lý dữ liệu\n\n**Gợi ý:**\n• Thử lại sau vài phút\n• Kiểm tra kết nối internet\n• Liên hệ hỗ trợ nếu vấn đề tiếp tục`,
        suggestions: [
          "Thử lại sau",
          "Kiểm tra kết nối",
          "Liên hệ hỗ trợ",
          "Sử dụng tính năng khác",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper methods để convert tên ngân sách, thời gian, mức độ trang trọng
  private getBudgetName(budget: string): string {
    const budgetNames: Record<string, string> = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
      luxury: "Cao cấp",
    };
    return budgetNames[budget] || budget;
  }

  private getDurationName(duration: string): string {
    const durationNames: Record<string, string> = {
      short: "Ngắn (≤2 giờ)",
      medium: "Trung bình (2-4 giờ)",
      long: "Dài (>4 giờ)",
    };
    return durationNames[duration] || duration;
  }

  private getFormalityName(formality: string): string {
    const formalityNames: Record<string, string> = {
      casual: "Thân mật",
      "semi-formal": "Bán trang trọng",
      formal: "Trang trọng",
    };
    return formalityNames[formality] || formality;
  }

  // Tạo danh sách mua sắm thông minh
  async createSmartShoppingList(
    menuItems: string[],
    currentInventory: string[]
  ): Promise<AIResponse> {
    try {
      // Lấy dữ liệu shopping từ API
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/shopping`);
      const shoppingData = await response.json();

      if (shoppingData.error) {
        throw new Error(
          shoppingData.message || "Không thể lấy dữ liệu shopping"
        );
      }

      const { totalSources, totalIngredients, groupedBySource } = shoppingData;

      if (totalIngredients === 0) {
        return {
          content: `🎉 **Tin tốt!**\n\nKho của bạn hiện tại đã đủ nguyên liệu, không cần mua thêm gì cả!\n\n**Tình trạng kho:**\n• Tất cả nguyên liệu đều đủ dùng\n• Không có nguyên liệu nào sắp hết\n• Có thể tiếp tục nấu ăn bình thường\n\n**Gợi ý:**\n• Kiểm tra lại sau vài ngày\n• Lập kế hoạch mua sắm cho tuần tới\n• Tận dụng nguyên liệu hiện có để nấu ăn`,
          suggestions: [
            "Kho đủ nguyên liệu",
            "Không cần mua sắm",
            "Kiểm tra lại sau vài ngày",
          ],
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
          const status = value === 0 ? "Hết" : "Sắp hết";
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

      const suggestions = Object.entries(groupedBySource)
        .map(
          ([source, ingredients]) =>
            `${source}: ${(ingredients as Ingredient[]).length} nguyên liệu`
        )
        .slice(0, 5);

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error creating smart shopping list:", error);

      // Fallback response
      const menu =
        menuItems.length > 0 ? menuItems.join(", ") : "chưa có thực đơn";
      const inventory =
        currentInventory.length > 0
          ? currentInventory.join(", ")
          : "chưa có tồn kho";

      return {
        content: `Danh sách mua sắm thông minh:\n\n**Thực đơn:** ${menu}\n**Tồn kho hiện tại:** ${inventory}\n\n**Cần mua:**\n\n**Rau củ:**\n• Rau muống: 2 bó (15k)\n• Cà chua: 1kg (25k)\n• Hành tây: 500g (10k)\n• Tỏi: 200g (8k)\n• Gừng: 100g (5k)\n\n**Thịt cá:**\n• Thịt ba chỉ: 1kg (120k)\n• Cá basa: 1kg (80k)\n• Thịt gà: 1 con (60k)\n• Tôm: 500g (75k)\n\n**Gia vị:**\n• Nước mắm: 1 chai (35k)\n• Đường: 500g (12k)\n• Muối: 1 gói (5k)\n• Dầu ăn: 1 chai (25k)\n• Hạt nêm: 1 gói (15k)\n\n**Khác:**\n• Gạo: 5kg (50k)\n• Mì gói: 10 gói (30k)\n• Trứng: 30 quả (45k)\n\n**Tổng chi phí ước tính:** ~600k\n\n**Gợi ý mua sắm:**\n• Siêu thị Big C: Giá tốt cho thịt cá\n• Chợ địa phương: Rau củ tươi\n• VinMart: Gia vị và đồ khô`,
        suggestions: [
          "Rau muống: 2 bó (15k)",
          "Thịt ba chỉ: 1kg (120k)",
          "Cá basa: 1kg (80k)",
          "Nước mắm: 1 chai (35k)",
          "Gạo: 5kg (50k)",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Tạo công thức nấu ăn chi tiết
  async generateRecipe(
    dishName: string,
    ingredients: string[]
  ): Promise<AIResponse> {
    try {
      // Lấy dữ liệu công thức từ database
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/ai-data?type=recipes`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Không thể lấy dữ liệu công thức");
      }

      // Tìm công thức cho món ăn
      const recipe = (Object.values(data.recipesByDish) as RecipeData[]).find(
        (dish: RecipeData) =>
          dish.dishName.toLowerCase().includes(dishName.toLowerCase()) ||
          dishName.toLowerCase().includes(dish.dishName.toLowerCase())
      );

      if (!recipe) {
        return {
          content: `❌ **Không tìm thấy công thức**\n\nKhông tìm thấy công thức cho món "${dishName}" trong hệ thống.\n\n**Gợi ý:**\n• Kiểm tra tên món ăn\n• Thêm công thức mới\n• Xem các món ăn có sẵn`,
          suggestions: [
            "Kiểm tra tên món ăn",
            "Thêm công thức mới",
            "Xem món ăn có sẵn",
          ],
        };
      }

      // Tạo công thức từ dữ liệu thực
      let content = `👨‍🍳 **Công thức: ${recipe.dishName}**\n\n`;

      content += `**Nguyên liệu:**\n`;
      recipe.ingredients.forEach(
        (
          ingredient: { name: string; quantity: number; unit: string },
          index: number
        ) => {
          content += `${index + 1}. ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}\n`;
        }
      );

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
        "Bước 1: Chuẩn bị nguyên liệu",
        "Bước 2: Ướp gia vị",
        "Bước 3: Chế biến",
        "Bước 4: Hoàn thiện",
        "Mẹo: Điều chỉnh gia vị",
      ];

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error generating recipe:", error);

      // Fallback response
      const dish = dishName || "Thịt kho tàu";
      const availableIngredients =
        ingredients.length > 0
          ? ingredients.join(", ")
          : "thịt ba chỉ, trứng, nước dừa";

      return {
        content: `**Công thức: ${dish}**\n\n**Nguyên liệu:**\n• Thịt ba chỉ: 500g\n• Trứng: 6 quả\n• Nước dừa: 1 trái\n• Hành tím: 2 củ\n• Tỏi: 3 tép\n• Nước mắm: 3 muỗng canh\n• Đường: 2 muỗng canh\n• Hạt nêm: 1 muỗng cà phê\n• Tiêu: 1/2 muỗng cà phê\n\n**Cách làm:**\n\n**Bước 1:** Chuẩn bị nguyên liệu\n- Thịt ba chỉ cắt miếng vuông 3x3cm\n- Trứng luộc chín, bóc vỏ\n- Hành tím, tỏi băm nhỏ\n\n**Bước 2:** Ướp thịt\n- Ướp thịt với nước mắm, đường, hạt nêm, tiêu\n- Để 15 phút cho thấm gia vị\n\n**Bước 3:** Kho thịt\n- Cho thịt vào nồi, đổ nước dừa ngập mặt\n- Đun sôi, hạ lửa nhỏ kho 30 phút\n- Thêm trứng vào kho thêm 15 phút\n\n**Bước 4:** Hoàn thiện\n- Nêm nếm lại cho vừa ăn\n- Kho đến khi nước cạn, thịt mềm\n- Rắc hành tím, tỏi băm lên trên\n\n**Thời gian:** 60 phút\n**Độ khó:** Trung bình\n**Số phần:** 4 người\n\n**Mẹo:**\n• Dùng nước dừa tươi sẽ ngon hơn\n• Kho lửa nhỏ để thịt mềm\n• Có thể thêm cà rốt, khoai tây`,
        suggestions: [
          "Bước 1: Chuẩn bị nguyên liệu",
          "Bước 2: Ướp thịt 15 phút",
          "Bước 3: Kho thịt 30 phút",
          "Bước 4: Thêm trứng kho 15 phút",
          "Hoàn thiện: Nêm nếm và trang trí",
        ],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Chat tổng quát dùng Perplexity để hội thoại tự nhiên
  // Sử dụng function calling để lấy data từ Supabase khi cần
  async chatAboutMenuManagement(
    message: string,
    context?: {
      currentMenu?: string[];
      availableIngredients?: string[];
      dietaryPreferences?: string[];
    }
  ): Promise<AIResponse> {
    try {
      const normalizedMessage = this.normalizeText(message || "");

      const menuIntent = this.detectMenuIntent(normalizedMessage);
      if (!this.isMenuRelatedMessage(normalizedMessage, menuIntent)) {
        return {
          content:
            "Xin lỗi, tôi chỉ hỗ trợ các thao tác liên quan đến thực đơn như kiểm tra, cập nhật, gợi ý món, tạo menu hoặc tính khẩu phần.",
        };
      }
      if (menuIntent?.type === "random-menu") {
        return await this.getRandomMenuResponse(menuIntent);
      }
      if (menuIntent?.type === "yesterday") {
        return await this.getMenuResponseForDate(this.getRelativeIsoDate(-1), {
          friendlyLabel: "ngày hôm qua",
        });
      }
      if (menuIntent?.type === "today") {
        return await this.getTodayMenuResponse();
      }

      const systemPrompt = [
        "Bạn là trợ lý quản lý thực đơn chuyên dụng.",
        "Chỉ hỗ trợ các thao tác liên quan tới thực đơn: thêm/xóa món, kiểm tra thực đơn theo ngày, gợi ý món từ nguyên liệu, tạo menu ngẫu nhiên, tính khẩu phần hoặc calo.",
        "Chỉ sử dụng dữ liệu thực tế được cung cấp từ hệ thống (ví dụ: Supabase). Nếu thiếu dữ liệu cần thiết, hãy hỏi người dùng có muốn nhận gợi ý từ nguồn ngoài hay không trước khi tiếp tục.",
        "Nếu người dùng hỏi ngoài phạm vi này, hãy lịch sự từ chối và nhắc rằng bạn chỉ hỗ trợ về thực đơn.",
        "Khi cần, yêu cầu người dùng cung cấp ngày cụ thể, nguyên liệu hoặc thông tin bổ sung để xử lý yêu cầu.",
        "Trả lời ngắn gọn, rõ ràng, có cấu trúc, bằng tiếng Việt tự nhiên.",
        "Ngữ cảnh hiện có (nếu có):",
        `- Nguyên liệu còn: ${(context?.availableIngredients || []).join(", ") || "không rõ"}`,
        `- Thực đơn hiện tại: ${(context?.currentMenu || []).join(", ") || "không rõ"}`,
        `- Sở thích dinh dưỡng: ${(context?.dietaryPreferences || []).join(", ") || "không rõ"}`,
      ].join("\n");

      const content = await this.callPerplexityAPI([
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ]);

      return {
        content,
        // Giữ suggestions trống để phản hồi thuần hội thoại giống ChatGPT
      };
    } catch (error) {
      logger.error("Error in chat (LLM):", error);
      return {
        content:
          "Xin lỗi, tôi đang gặp sự cố khi trả lời. Vui lòng thử lại sau.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private normalizeText(input: string): string {
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private hasMenuKeywords(normalizedMessage: string): boolean {
    if (!normalizedMessage) return false;
    const keywords = [
      "mon gi",
      "mon an",
      "thuc don",
      "an gi",
      "thuc an",
      "bua an",
      "menu",
    ];
    return keywords.some((keyword) => normalizedMessage.includes(keyword));
  }

  private detectMenuIntent(normalizedMessage: string): MenuIntent | null {
    if (!normalizedMessage) return null;

    const hasMenuContext =
      this.hasMenuKeywords(normalizedMessage) ||
      normalizedMessage.includes("kiem tra thuc don") ||
      normalizedMessage.includes("xem thuc don") ||
      normalizedMessage.includes("kiem tra menu") ||
      normalizedMessage.includes("xem menu") ||
      normalizedMessage.includes("cap nhat thuc don") ||
      normalizedMessage.includes("lich an") ||
      normalizedMessage.includes("ke hoach an") ||
      normalizedMessage.includes("bua an");

    if (!hasMenuContext) {
      const mentionsFollowUp =
        normalizedMessage.includes("thi sao") ||
        normalizedMessage.includes("the nao") ||
        normalizedMessage.includes("ra sao") ||
        normalizedMessage.includes("sao roi") ||
        normalizedMessage.endsWith("sao");

      if (mentionsFollowUp) {
        if (
          normalizedMessage.includes("hom qua") ||
          normalizedMessage.includes("ngay hom qua") ||
          normalizedMessage.includes("homqua") ||
          normalizedMessage.includes("hqua") ||
          normalizedMessage.includes("qua day")
        ) {
          return { type: "yesterday" };
        }
        if (
          normalizedMessage.includes("hom nay") ||
          normalizedMessage.includes("hnay") ||
          normalizedMessage.includes("ngay hom nay")
        ) {
          return { type: "today" };
        }
      }

      return null;
    }

    const randomMenuKeywords = [
      "ngau nhien",
      "random",
      "bat ky",
      "tu chon",
      "tu dong",
      "ngau ung",
    ];
    if (
      randomMenuKeywords.some((keyword) => normalizedMessage.includes(keyword))
    ) {
      const servingInfo = this.parseServingInfo(normalizedMessage);
      return {
        type: "random-menu",
        adults: servingInfo.adults,
        kids: servingInfo.kids,
      };
    }

    const mentionsYesterday =
      normalizedMessage.includes("hom qua") ||
      normalizedMessage.includes("ngay hom qua") ||
      normalizedMessage.includes("homqua") ||
      normalizedMessage.includes("hqua") ||
      normalizedMessage.includes("qua day");

    if (mentionsYesterday) {
      return { type: "yesterday" };
    }

    const mentionsToday =
      normalizedMessage.includes("hom nay") ||
      normalizedMessage.includes("hnay") ||
      normalizedMessage.includes("ngay hom nay");

    if (mentionsToday) {
      return { type: "today" };
    }

    return null;
  }

  private parseServingInfo(normalizedMessage: string): {
    adults?: number;
    kids?: number;
  } {
    const adultMatch = normalizedMessage.match(
      /(\d+)\s*(nguoi lon|nguoi truong thanh|adult|nguoi truong thanh)/
    );
    const kidMatch = normalizedMessage.match(
      /(\d+)\s*(tre em|tre nho|tre con|be|kid|child)/
    );

    const adults = adultMatch ? Number(adultMatch[1]) : undefined;
    const kids = kidMatch ? Number(kidMatch[1]) : undefined;

    if (adults !== undefined || kids !== undefined) {
      return { adults, kids };
    }

    const genericMatch = normalizedMessage.match(
      /(\d+)\s*(nguoi|people|khach)/
    );
    if (genericMatch) {
      return { adults: Number(genericMatch[1]) };
    }

    return {};
  }

  private isMenuRelatedMessage(
    normalizedMessage: string,
    menuIntent: MenuIntent | null
  ): boolean {
    if (menuIntent) return true;
    if (!normalizedMessage) return false;

    const coreKeywords = [
      "thuc don",
      "menu",
      "mon an",
      "mon gi",
      "goi y",
      "nguyen lieu",
      "bo sung",
      "bo bot",
      "them mon",
      "xoa mon",
      "them vao menu",
      "xoa khoi menu",
      "random",
      "ngau nhien",
      "buoi",
      "sang",
      "trua",
      "toi",
      "bua an",
      "lich an",
      "ke hoach an",
      "calo",
      "kcal",
      "khau phan",
      "phuc vu",
      "serving",
      "tinh toan",
      "sap xep mon",
      "kiem tra thuc don",
      "xem thuc don",
      "kiem tra menu",
      "xem menu",
    ];

    const mentionsCalorie =
      normalizedMessage.includes("calo") || normalizedMessage.includes("kcal");
    const mentionsServings =
      normalizedMessage.includes("khau phan") ||
      normalizedMessage.includes("so nguoi") ||
      normalizedMessage.includes("serving") ||
      normalizedMessage.includes("phan an");
    const mentionsIngredients =
      normalizedMessage.includes("nguyen lieu") ||
      normalizedMessage.includes("kho");
    const mentionsMenuActions =
      normalizedMessage.includes("them") ||
      normalizedMessage.includes("xoa") ||
      normalizedMessage.includes("cap nhat") ||
      normalizedMessage.includes("dua vao");

    if (
      coreKeywords.some((keyword) => normalizedMessage.includes(keyword)) ||
      mentionsCalorie ||
      mentionsServings ||
      mentionsIngredients ||
      (mentionsMenuActions && normalizedMessage.includes("menu"))
    ) {
      return true;
    }

    return false;
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localTime = new Date(now.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 10);
  }

  private getRelativeIsoDate(offsetDays: number): string {
    const now = new Date();
    now.setDate(now.getDate() + offsetDays);
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localTime = new Date(now.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 10);
  }

  private formatVietnamDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  }

  private async getTodayMenuResponse(): Promise<AIResponse> {
    return this.getMenuResponseForDate(this.getTodayIsoDate(), {
      friendlyLabel: "ngày hôm nay",
    });
  }

  private async getRandomMenuResponse(
    intent: Extract<MenuIntent, { type: "random-menu" }>
  ): Promise<AIResponse> {
    try {
      const dishesData = await this.getDishesData();
      const dishesByCategory = (dishesData?.dishesByCategory ?? {}) as Record<
        string,
        Dish[]
      >;
      const allDishes = (dishesData?.allDishes ?? []) as Dish[];

      if (!allDishes.length) {
        return {
          content:
            "Hiện chưa có món ăn nào trong cơ sở dữ liệu Supabase. Bạn có muốn tôi gợi ý từ nguồn ngoài không?",
        };
      }

      const adults = intent.adults ?? 2;
      const kids = intent.kids ?? 0;
      const equivalentServings = adults + kids * 0.5;
      const suggestedMultiplier = Math.max(
        1,
        Math.ceil(equivalentServings / 2)
      );

      const usedDishIds = new Set<string>();
      const pickDish = (categoryNames: string[]): Dish | null => {
        const options = categoryNames
          .flatMap((category) => dishesByCategory[category] || [])
          .filter((dish) => !usedDishIds.has(dish.id));
        if (options.length === 0) return null;
        const choice = options[Math.floor(Math.random() * options.length)];
        usedDishIds.add(choice.id);
        return choice;
      };

      const mainDish = pickDish(["Món chính", "Cơm", "Món xào"]);
      if (!mainDish) {
        return {
          content:
            "Kho dữ liệu chưa có món chính để tạo thực đơn. Bạn có muốn tôi gợi ý từ nguồn ngoài không?",
        };
      }

      const soupDish = pickDish(["Canh", "Món nước"]);
      const veggieDish = pickDish(["Món xào", "Rau", "Salad"]);
      const optionalDish = pickDish([
        "Món chính",
        "Món xào",
        "Món nước",
        "Canh",
      ]);
      const dessertDish = pickDish(["Tráng miệng", "Trái cây", "Đồ ngọt"]);

      const sections: Array<{ title: string; dish: Dish | null }> = [
        { title: "Món chính", dish: mainDish },
        { title: "Món nước/Canh", dish: soupDish },
        { title: "Món rau/phụ", dish: veggieDish },
        { title: "Món phụ bổ sung", dish: optionalDish },
        { title: "Tráng miệng", dish: dessertDish },
      ];

      const availableSections = sections.filter(({ dish }) => dish);
      const missingSections = sections
        .filter(({ dish }) => !dish)
        .map(({ title }) => title);

      const formatDishLine = (dish: Dish) => {
        const baseName = dish.ten_mon_an;
        const category = dish.loai_mon_an ? ` (${dish.loai_mon_an})` : "";
        return `- ${baseName}${category}`;
      };

      let content = `📋 **Menu ngẫu nhiên từ dữ liệu Supabase**\n\n`;
      content += `**Khẩu phần dự kiến:** ${adults} người lớn`;
      if (kids > 0) content += `, ${kids} trẻ em`;
      content += ` → gợi ý nấu khoảng **${suggestedMultiplier} mẻ** cho mỗi món.\n\n`;

      content += `**Danh sách món:**\n`;
      availableSections.forEach(({ title, dish }) => {
        if (!dish) return;
        content += `\n${title}:\n${formatDishLine(dish)}\n`;
      });

      if (missingSections.length > 0) {
        content += `\n⚠️ **Chưa tìm được món cho:** ${missingSections.join(", ")}. Bạn có thể bổ sung thêm món vào cơ sở dữ liệu để đa dạng thực đơn.`;
      }

      content += `\n\nBạn có muốn điều chỉnh món nào hoặc thêm món khác không?`;

      const suggestions = availableSections
        .map(({ dish }) => dish?.ten_mon_an)
        .filter(Boolean)
        .slice(0, 5) as string[];

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error generating random menu from Supabase:", error);
      return {
        content:
          "Không thể tạo menu ngẫu nhiên từ dữ liệu Supabase tại thời điểm này. Bạn có muốn tôi gợi ý từ nguồn ngoài không?",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async getMenuResponseForDate(
    isoDate: string,
    options?: { friendlyLabel?: string }
  ): Promise<AIResponse> {
    try {
      const menuItems = await getMenuItems(isoDate);

      if (!menuItems || menuItems.length === 0) {
        return {
          content: `Không có dữ liệu thực đơn ${options?.friendlyLabel ?? `ngày ${this.formatVietnamDate(isoDate)}`}.`,
        };
      }

      const uniqueDishes = Array.from(
        new Set(
          menuItems
            .map((item) => (item.ten_mon_an || "").trim())
            .filter((name) => name.length > 0)
        )
      );

      if (uniqueDishes.length === 0) {
        return {
          content: `Không có dữ liệu thực đơn ${options?.friendlyLabel ?? `ngày ${this.formatVietnamDate(isoDate)}`}.`,
        };
      }

      const formattedDate = this.formatVietnamDate(isoDate);
      const dishLines = uniqueDishes.map(
        (dish, index) => `${index + 1}. ${dish}`
      );

      return {
        content: `Thực đơn ${options?.friendlyLabel ? `${options.friendlyLabel} (${formattedDate})` : `ngày ${formattedDate}`}:\n${dishLines.join("\n")}`,
      };
    } catch (error) {
      logger.error("Error fetching menu for AI:", { isoDate, error });
      return {
        content: `Không thể truy vấn dữ liệu thực đơn ${options?.friendlyLabel ?? `ngày ${this.formatVietnamDate(isoDate)}`}. Vui lòng thử lại sau.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper methods để làm việc với database
  private async getDishesData() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/ai-data?type=dishes`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || "Không thể lấy dữ liệu món ăn");
    }

    return data;
  }

  private async getMenuData() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/ai-data?type=menu`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || "Không thể lấy dữ liệu menu");
    }

    return data;
  }

  private groupDishesByCategory(dishes: Dish[]) {
    return dishes.reduce((acc: Record<string, Dish[]>, dish: Dish) => {
      const category = dish.loai_mon_an || "Khác";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(dish);
      return acc;
    }, {});
  }

  private async findSuitableDishes(
    ingredients: string[],
    dishesByCategory: Record<string, Dish[]>
  ) {
    // Lấy dữ liệu công thức để tìm món phù hợp
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/ai-data?type=recipes`);
    const data = await response.json();

    if (data.error) {
      return [];
    }

    const suitableDishes = [];

    // Tìm món ăn có nguyên liệu phù hợp
    for (const [dishId, recipe] of Object.entries(data.recipesByDish || {})) {
      const dish = recipe as RecipeData;
      const requiredIngredients =
        dish.ingredients?.map((ing: { name: string }) =>
          ing.name.toLowerCase()
        ) || [];

      // Kiểm tra xem có đủ nguyên liệu không
      const availableIngredientsLower = (ingredients || []).map((ing) =>
        ing.toLowerCase()
      );
      const hasEnoughIngredients = requiredIngredients.every((reqIng: string) =>
        availableIngredientsLower.some(
          (availIng) => availIng.includes(reqIng) || reqIng.includes(availIng)
        )
      );

      if (hasEnoughIngredients) {
        suitableDishes.push({
          name: dish.dishName,
          category: "Món ăn",
          description: "Món ăn ngon từ nguyên liệu có sẵn",
          ingredients: requiredIngredients,
        });
      }
    }

    return suitableDishes.slice(0, 5); // Giới hạn 5 món
  }

  // Helper methods để extract thông tin từ response
  private extractDishSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("món") || line.includes("ăn") || line.includes(":")) {
        const cleanLine = line
          .replace(/^\d+\.?\s*/, "")
          .replace(/^[-*]\s*/, "")
          .trim();
        if (cleanLine.length > 10) {
          suggestions.push(cleanLine);
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private extractMealPlanSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const days = [
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
      "Chủ nhật",
    ];

    for (const day of days) {
      if (content.includes(day)) {
        suggestions.push(
          `${day}: ${content.split(day)[1]?.split("\n")[0] || ""}`
        );
      }
    }

    return suggestions;
  }

  private extractShoppingListItems(content: string): string[] {
    const items: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      if (
        line.includes("kg") ||
        line.includes("g") ||
        line.includes("cái") ||
        line.includes("bó")
      ) {
        const cleanLine = line
          .replace(/^\d+\.?\s*/, "")
          .replace(/^[-*]\s*/, "")
          .trim();
        if (cleanLine.length > 5) {
          items.push(cleanLine);
        }
      }
    }

    return items.slice(0, 10); // Limit to 10 items
  }

  private extractRecipeSteps(content: string): string[] {
    const steps: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      if (
        line.match(/^\d+\./) ||
        line.includes("Bước") ||
        line.includes("bước")
      ) {
        const cleanLine = line
          .replace(/^\d+\.?\s*/, "")
          .replace(/^Bước\s*\d+:\s*/, "")
          .trim();
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
