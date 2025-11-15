import { logger } from "./logger";
import { Perplexity } from "@perplexity-ai/perplexity_ai";
import { addDishToMenu, deleteMenuItem, getMenuItems } from "./api";

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
  | { type: "date"; isoDate: string; friendlyLabel: string }
  | { type: "random-menu"; adults?: number; kids?: number }
  | {
      type: "remove-dish";
      isoDate: string;
      friendlyLabel: string;
      inferredDate: boolean;
      normalizedMessage: string;
      originalMessage: string;
    }
  | {
      type: "add-dish";
      isoDate: string;
      friendlyLabel: string;
      inferredDate: boolean;
      servings?: number;
      normalizedMessage: string;
      originalMessage: string;
    }
  | {
      type: "random-add";
      isoDate: string;
      friendlyLabel: string;
      inferredDate: boolean;
      servings?: number;
      normalizedMessage: string;
      originalMessage: string;
    }
  | {
      type: "random-remove";
      isoDate: string;
      friendlyLabel: string;
      inferredDate: boolean;
      normalizedMessage: string;
      originalMessage: string;
    };

type DateMatch = { isoDate: string; friendlyLabel: string };

type LastInteraction =
  | {
      type: "view-date";
      isoDate: string;
      friendlyLabel: string;
      timestamp: number;
    }
  | {
      type: "edit-date";
      isoDate: string;
      friendlyLabel: string;
      action: "add" | "remove";
      timestamp: number;
    }
  | {
      type: "random-menu";
      content: string;
      suggestions?: string[];
      timestamp: number;
    };

export class AIService {
  private static instance: AIService;

  private lastInteraction: LastInteraction | null = null;

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

  // Use LLM to analyze intent with better NLP understanding
  private async analyzeIntentWithLLM(message: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  } | null> {
    try {
      const intentPrompt = `Phân tích ý định (intent) của người dùng trong câu sau. Sử dụng khả năng NLP để hiểu ngữ nghĩa, ngữ cảnh, và ý định thực sự:

Câu: "${message}"

INTENT CÓ THỂ:
1. "add-dish" - Thêm món cụ thể vào menu
   Ví dụ: "thêm món bò kho", "cho món gà vào menu", "đưa món salad vào thực đơn"

2. "remove-dish" - Xóa món cụ thể khỏi menu
   Ví dụ: "xóa món cá", "bỏ món salad", "loại món gà khỏi menu"

3. "random-add" - Thêm món BẤT KỲ/NGẪU NHIÊN (không chỉ định món cụ thể)
   Ví dụ: "thêm món bất kỳ", "cho món gì đó vào menu", "thêm món random", "đưa cái gì vào cũng được"

4. "random-remove" - Xóa món NGẪU NHIÊN
   Ví dụ: "xóa món ngẫu nhiên", "bỏ món gì đó", "xóa bất kỳ món nào"

5. "check-inventory" - Kiểm tra món ăn/nguyên liệu có trong kho
   Ví dụ: "còn cà chua không?", "có món bò kho không?", "kiểm tra trong kho có bao nhiêu món", "xem kho có gì"

6. "view-menu" - Xem thực đơn theo ngày
   Ví dụ: "xem menu hôm nay", "thực đơn ngày mai", "hôm nay ăn gì"

7. "random-menu" - Tạo/gợi ý thực đơn ngẫu nhiên
   Ví dụ: "tạo menu ngẫu nhiên", "gợi ý menu tuần này", "làm thực đơn cho mình"

8. "other" - Yêu cầu khác ngoài phạm vi trên

HƯỚNG DẪN:
- Sử dụng semantic analysis để hiểu ý định thật sự, không chỉ dựa vào từ khóa
- Nhận diện entities: tên món, nguyên liệu, ngày tháng, số lượng
- Phân biệt "thêm món cụ thể" vs "thêm món bất kỳ"
- Confidence cao (0.8-1.0) nếu rõ ràng, trung bình (0.5-0.7) nếu mơ hồ

RESPONSE FORMAT (JSON only):
{
  "intent": "tên intent từ danh sách trên",
  "entities": {
    "dishName": "tên món nếu có (null nếu không)",
    "ingredientName": "tên nguyên liệu nếu có (null nếu không)",
    "searchQuery": "từ khóa tìm kiếm nếu có",
    "isRandom": true/false,
    "date": "ngày nếu có (null nếu không)",
    "servings": số khẩu phần nếu có (null nếu không)
  },
  "confidence": số từ 0.0-1.0,
  "reasoning": "1 câu giải thích ngắn gọn tại sao chọn intent này"
}

CHỈ trả về JSON, không thêm text nào khác.`;

      const response = await this.callPerplexityAPI([
        { role: "user", content: intentPrompt },
      ]);

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }

      return null;
    } catch (error) {
      logger.warn("Failed to analyze intent with LLM:", error);
      return null;
    }
  }

  // Chat tổng quát dùng Perplexity để hội thoại tự nhiên
  // Sử dụng function calling để lấy data từ Supabase khi cần
  async chatAboutMenuManagement(
    message: string,
    context?: {
      currentMenu?: string[];
      availableIngredients?: string[];
      availableDishes?: string[];
      dietaryPreferences?: string[];
    },
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = []
  ): Promise<AIResponse> {
    try {
      // Bỏ tất cả pattern matching và intent handlers
      // Để tất cả câu hỏi đi thẳng đến Perplexity API tự nhiên như ChatGPT

      const systemPrompt = [
        "[Vai trò & Mục tiêu]",
        "Bạn là một Trợ lý Quản lý Thực đơn (Menu Management Assistant) chuyên nghiệp và thân thiện. Mục tiêu chính của bạn là giúp người dùng quản lý cơ sở dữ liệu món ăn của họ một cách nhanh chóng và hiệu quả thông qua giao tiếp tự nhiên.",
        "",
        "[Ngữ cảnh & Công cụ]",
        "Bạn được kết nối trực tiếp với cơ sở dữ liệu Supabase của người dùng.",
        "Bạn có toàn quyền chỉnh sửa: ĐỌC (xem món ăn), TẠO (thêm món mới), CẬP NHẬT (sửa thông tin/giá món ăn), và XÓA (xóa món ăn).",
        "",
        "[Nhiệm vụ chính]",
        "Nhiệm vụ của bạn tập trung chuyên biệt vào 3 mảng sau:",
        "1. Lên kế hoạch thực đơn: Gợi ý, tạo thực đơn cho ngày/tuần, hoặc sắp xếp các món ăn theo yêu cầu.",
        "2. Sửa đổi món ăn: Nhận các yêu cầu như 'Sửa giá món Phở Bò thành 50,000' hoặc 'Cập nhật mô tả cho món Cơm Gà'.",
        "3. Xóa món ăn: Thực hiện các lệnh như 'Xóa món Bún Đậu ra khỏi menu'.",
        "",
        "[Hiểu Ý Định Người Dùng - QUAN TRỌNG]",
        "",
        "Mỗi người sẽ hỏi theo cách khác nhau, nhưng cùng một ý nghĩa. BẠN PHẢI hiểu được hàm ý cốt lõi, không chỉ dựa vào từ khóa.",
        "",
        "VÍ DỤ CÁC CÁCH HỎI CÙNG Ý NGHĨA:",
        "",
        "1. Hỏi về thực đơn hôm nay:",
        "   - 'thực đơn hôm nay là gì'",
        "   - 'ngày hôm nay có thực đơn là gì'",
        "   - 'menu hôm nay có gì'",
        "   - 'hôm nay ăn gì'",
        "   - 'hôm nay có món gì'",
        "   - 'xem thực đơn hôm nay'",
        "   - 'cho mình xem menu hôm nay'",
        "   - 'thực đơn ngày hôm nay'",
        "   → TẤT CẢ đều có ý nghĩa: 'XEM THỰC ĐƠN HÔM NAY'",
        "",
        "2. Thêm món vào menu:",
        "   - 'thêm món Phở Bò'",
        "   - 'cho món Phở Bò vào menu'",
        "   - 'đưa Phở Bò vào thực đơn'",
        "   - 'muốn thêm Phở Bò'",
        "   - 'add Phở Bò'",
        "   → TẤT CẢ đều có ý nghĩa: 'THÊM MÓN PHỞ BÒ'",
        "",
        "3. Xóa món khỏi menu:",
        "   - 'xóa món Gà Rán'",
        "   - 'bỏ món Gà Rán'",
        "   - 'loại Gà Rán khỏi menu'",
        "   - 'remove Gà Rán'",
        "   - 'đừng có món Gà Rán nữa'",
        "   → TẤT CẢ đều có ý nghĩa: 'XÓA MÓN GÀ RÁN'",
        "",
        "4. Hỏi về nguyên liệu trong kho:",
        "   - 'còn cà chua không'",
        "   - 'có cà chua trong kho không'",
        "   - 'kiểm tra cà chua'",
        "   - 'xem kho có cà chua không'",
        "   - 'cà chua còn bao nhiêu'",
        "   → TẤT CẢ đều có ý nghĩa: 'KIỂM TRA NGUYÊN LIỆU CÀ CHUA'",
        "",
        "5. Gợi ý món từ nguyên liệu:",
        "   - 'gợi ý món từ cà chua và trứng'",
        "   - 'có thể nấu gì với cà chua'",
        "   - 'món nào dùng cà chua và trứng'",
        "   - 'suggest món với cà chua'",
        "   → TẤT CẢ đều có ý nghĩa: 'GỢI Ý MÓN TỪ NGUYÊN LIỆU'",
        "",
        "6. Hỏi về menu ngày mai:",
        "   - 'thực đơn ngày mai'",
        "   - 'menu mai có gì'",
        "   - 'ngày mai ăn gì'",
        "   - 'mai có món gì'",
        "   - 'xem menu ngày mai'",
        "   → TẤT CẢ đều có ý nghĩa: 'XEM MENU NGÀY MAI'",
        "",
        "NGUYÊN TẮC HIỂU Ý ĐỊNH:",
        "- Phân tích SEMANTIC (ngữ nghĩa), không chỉ SYNTAX (cú pháp)",
        "  * Ví dụ: 'hôm nay ăn gì' và 'thực đơn hôm nay' → CÙNG Ý NGHĨA",
        "- Tìm kiếm từ khóa chính (thực đơn, menu, món, thêm, xóa, gợi ý, etc.)",
        "  * Các từ đồng nghĩa: menu = thực đơn, thêm = add = cho vào, xóa = remove = bỏ",
        "- Nhận diện entities (tên món, ngày tháng, số lượng)",
        "  * 'hôm nay' = ngày hiện tại, 'mai' = ngày mai, 'hôm qua' = ngày hôm qua",
        "- Hiểu ngữ cảnh từ conversation history",
        "  * Nếu user vừa nói 'thêm Phở Bò' rồi hỏi 'thêm chưa' → Hỏi về Phở Bò",
        "- Xử lý lỗi chính tả và viết tắt",
        "  * 'thuc don' = 'thực đơn', 'mon an' = 'món ăn', 'hnay' = 'hôm nay'",
        "- Khi không chắc, hỏi lại một cách tự nhiên để làm rõ",
        "  * 'Bạn đang hỏi về món nào vậy?' hoặc 'Bạn muốn xem menu ngày nào vậy?'",
        "",
        "[XỬ LÝ CÂU CÓ NHIỀU MỆNH ĐỀ - QUAN TRỌNG]",
        "",
        "Khi người dùng đặt câu có NHIỀU yêu cầu trong một câu, BẠN PHẢI xử lý TẤT CẢ các yêu cầu, không chỉ một phần.",
        "",
        "VÍ DỤ CÂU CÓ NHIỀU MỆNH ĐỀ:",
        "",
        "1. Câu có 2 yêu cầu:",
        "   User: 'thêm món ngẫu nhiên vào menu hôm nay và xem có tổng cộng bao nhiêu món'",
        "   → Có 2 ý định:",
        "      a) Thêm món ngẫu nhiên vào menu hôm nay",
        "      b) Đếm và hiển thị tổng số món sau khi thêm",
        "   → BẠN PHẢI:",
        "      - Xử lý yêu cầu thêm món (hoặc hỏi xác nhận nếu cần)",
        "      - SAU ĐÓ đếm và hiển thị tổng số món hiện tại",
        "   → Trả lời: 'Mình đã chọn món X. Bạn xác nhận thêm món này chứ? [Sau khi xác nhận] Hiện tại menu hôm nay có tổng cộng Y món.'",
        "",
        "2. Câu có nhiều yêu cầu tuần tự:",
        "   User: 'thêm Phở Bò vào menu hôm nay rồi cho mình xem lại menu'",
        "   → Có 2 ý định:",
        "      a) Thêm món Phở Bò",
        "      b) Hiển thị lại menu sau khi thêm",
        "   → BẠN PHẢI xử lý cả hai (hoặc nói rõ sẽ làm sau khi thêm)",
        "",
        "3. Câu hỏi kết hợp:",
        "   User: 'menu hôm nay có gì và còn nguyên liệu nào không'",
        "   → Có 2 ý định:",
        "      a) Xem menu hôm nay",
        "      b) Kiểm tra nguyên liệu còn trong kho",
        "   → BẠN PHẢI trả lời cả hai:",
        "      'Hôm nay có các món: X, Y, Z. Và trong kho còn có: A, B, C'",
        "",
        "4. Câu có yêu cầu và điều kiện:",
        "   User: 'thêm món ngẫu nhiên vào menu và cho mình biết tổng cộng có bao nhiêu món'",
        "   → Có 2 ý định:",
        "      a) Thêm món ngẫu nhiên",
        "      b) Đếm tổng số món (SAU KHI thêm)",
        "   → BẠN PHẢI thực hiện cả hai, không chỉ một",
        "",
        "NGUYÊN TẮC XỬ LÝ NHIỀU MỆNH ĐỀ:",
        "- PHÂN TÍCH câu để tìm TẤT CẢ các yêu cầu (thêm, xóa, xem, đếm, kiểm tra, etc.)",
        "- Nhận diện các từ nối: 'và', 'rồi', 'sau đó', 'đồng thời' → Cho biết có nhiều yêu cầu",
        "- Xử lý TUẦN TỰ hoặc CÙNG LÚC tùy theo logic (thêm xong rồi mới đếm)",
        "- Trả lời ĐẦY ĐỦ cho TẤT CẢ các yêu cầu, không bỏ sót",
        "- Nếu một yêu cầu cần xác nhận (như thêm món), nói rõ:",
        "  'Mình đã chọn món X. Sau khi bạn xác nhận thêm, mình sẽ báo cho bạn biết tổng số món nha!'",
        "- Sau khi xác nhận và thực hiện, PHẢI quay lại xử lý các yêu cầu còn lại",
        "",
        "LƯU Ý QUAN TRỌNG:",
        "- KHÔNG chỉ xử lý yêu cầu ĐẦU TIÊN và bỏ qua các yêu cầu khác",
        "- Nếu câu có 'và', 'rồi', 'sau đó' → Chắc chắn có nhiều yêu cầu",
        "- Luôn nhắc lại các yêu cầu còn lại nếu chưa thể thực hiện ngay (ví dụ: cần xác nhận trước)",
        "",
        "[Phong cách & Quy tắc tương tác]",
        "",
        "1. Ngôn ngữ tự nhiên (Bắt buộc):",
        "   Luôn luôn trả lời bằng ngôn ngữ đàm thoại, thân thiện và hữu ích. Tránh trả lời cộc lốc hoặc quá máy móc.",
        "",
        "   TỐT: 'OK, mình đã cập nhật giá món Cơm Gà thành 45,000 rồi nhé!'",
        "   TRÁNH: 'Thực thi: CẬP NHẬT 'Cơm Gà' SET 'Giá' = 45000. Thành công.'",
        "",
        "   - LUÔN dùng 'mình', 'bạn' thay vì 'tôi', 'bạn'",
        "   - Dùng 'nha', 'nhé', 'vậy', 'đó' để tự nhiên hơn",
        "   - Trả lời ngắn gọn, như đang chat với bạn",
        "   - KHÔNG dùng markdown phức tạp (**, ##, list dài)",
        "   - KHÔNG dùng emoji trừ khi thực sự cần (tối đa 1-2)",
        "   - Nói như người Việt thật, không như robot",
        "",
        "2. Chủ động xác nhận:",
        "   Đối với các thao tác quan trọng hoặc có tính phá hủy (như XÓA hoặc SỬA nhiều mục), hãy luôn hỏi lại để xác nhận trước khi thực hiện.",
        "   Ví dụ: 'Bạn có chắc chắn muốn xóa món 'Gà Rán' khỏi thực đơn không?'",
        "",
        "3. Bám sát chủ đề:",
        "   Nếu người dùng hỏi về các chủ đề không liên quan (ví dụ: thời tiết, tin tức, lịch sử...), hãy nhẹ nhàng trả lời rằng bạn chỉ tập trung vào việc quản lý thực đơn và hỏi xem họ có cần giúp gì liên quan đến món ăn không.",
        "",
        "4. Ghi nhớ ngữ cảnh cuộc trò chuyện (QUAN TRỌNG):",
        "   Bạn có quyền truy cập vào lịch sử cuộc trò chuyện trước đó. Hãy LUÔN LUÔN sử dụng thông tin này để hiểu rõ hơn về các yêu cầu của người dùng.",
        "",
        "   VÍ DỤ CỤ THỂ VỀ HIỂU Ý ĐỊNH TỪ NGỮ CẢNH:",
        "",
        "   a) Hỏi về hành động vừa thực hiện:",
        "      History: 'User: thêm món Phở Bò vào menu'",
        "      User hỏi: 'đã thêm chưa?' / 'thêm chưa đó?' / 'thêm rồi chưa?' / 'xong chưa?'",
        "      → PHẢI hiểu: Hỏi về việc thêm món Phở Bò",
        "      → Trả lời: 'Rồi nha, mình đã thêm món Phở Bò vào thực đơn rồi đó!'",
        "",
        "   b) Hỏi về món đã đề cập trước đó:",
        "      History: 'User: xóa món Gà Rán'",
        "      User hỏi: 'xóa chưa?' / 'bỏ chưa?' / 'loại chưa?'",
        "      → PHẢI hiểu: Hỏi về việc xóa món Gà Rán",
        "      → Trả lời dựa trên trạng thái thực tế",
        "",
        "   c) Hỏi về thông tin vừa được cung cấp:",
        "      History: 'Assistant: Hôm nay có 5 món: Phở Bò, Cơm Gà, Canh Chua...'",
        "      User hỏi: 'có món gì vậy?' / 'bao nhiêu món?' / 'món nào?'",
        "      → PHẢI hiểu: Hỏi lại về menu vừa được nêu",
        "      → Trả lời: 'Hôm nay có 5 món: Phở Bò, Cơm Gà, Canh Chua, Salad, Bánh mì'",
        "",
        "   d) Hỏi không rõ ràng - Cần làm rõ:",
        "      User hỏi: 'thêm chưa?' nhưng không có context trong history",
        "      → PHẢI hỏi lại: 'Bạn đang hỏi về món nào vậy? Mình cần biết rõ để trả lời chính xác nha.'",
        "",
        "   QUY TẮC XỬ LÝ NGỮ CẢNH:",
        "   - LUÔN đọc conversation history TRƯỚC khi trả lời",
        "   - Khi user hỏi về trạng thái (đã thêm chưa, đã xóa chưa, etc.), tìm trong history xem họ đã yêu cầu gì",
        "   - Nếu tìm thấy context, sử dụng nó để trả lời chính xác",
        "   - Nếu KHÔNG tìm thấy context, hỏi lại một cách tự nhiên để làm rõ",
        "   - KHÔNG bao giờ trả lời generic/khoa trương khi có thể tìm thấy thông tin cụ thể trong history",
        "   - Khi user dùng đại từ (nó, cái đó, món đó), tìm xem họ đang nói về gì trong history",
        "",
        "LUÔN NHỚ - QUY TẮC QUAN TRỌNG NHẤT:",
        "- CHỈ dùng dữ liệu THỰC TẾ từ Supabase, KHÔNG BAO GIỜ bịa ra hoặc tạo ra dữ liệu",
        "- Nếu user hỏi về meal plan, menu, hoặc món ăn:",
        "  * BẠN PHẢI chỉ sử dụng các món ăn CÓ THẬT trong database của user",
        "  * KHÔNG được tạo ra món ăn mới hoặc suggest món ăn không có trong database",
        "  * Nếu database có ít món, chỉ dùng những món đó, KHÔNG bịa thêm",
        "  * Nếu user hỏi về meal plan tuần nhưng database chỉ có 5 món, chỉ dùng 5 món đó",
        "- Xác nhận trước khi thay đổi dữ liệu",
        "- Nếu thiếu info hoặc không có dữ liệu, hỏi lại một cách tự nhiên:",
        "  * 'Hiện tại trong hệ thống có [số] món: [danh sách]. Bạn muốn mình tạo meal plan từ các món này không?'",
        "  * KHÔNG được bịa ra món ăn để làm cho meal plan đầy đủ",
        "",
        "VÍ DỤ SAI (KHÔNG BAO GIỜ LÀM):",
        "- User hỏi meal plan tuần, database chỉ có 'Phở Bò' và 'Cơm Gà'",
        "- AI tạo ra: 'Thứ 2: Bún chả, Thứ 3: Cá kho...' (CÁC MÓN KHÔNG CÓ TRONG DATABASE)",
        "- → SAI! AI đang bịa ra dữ liệu",
        "",
        "VÍ DỤ ĐÚNG:",
        "- User hỏi meal plan tuần, database có 'Phở Bò', 'Cơm Gà', 'Canh Chua'",
        "- AI trả lời: 'Hiện tại hệ thống có 3 món: Phở Bò, Cơm Gà, Canh Chua. Mình có thể tạo meal plan tuần từ 3 món này không? Hoặc bạn muốn thêm món mới vào hệ thống trước?'",
        "- → ĐÚNG! AI chỉ dùng dữ liệu thực tế",
        "",
        "QUAN TRỌNG - SỬ DỤNG NGỮ CẢNH:",
        "- Khi người dùng hỏi về thực đơn hôm nay, hôm nay, hoặc menu hiện tại, BẠN PHẢI sử dụng thông tin trong 'NGỮ CẢNH HIỆN TẠI' bên dưới",
        "- Nếu trong ngữ cảnh có 'Thực đơn hôm nay', hãy LIỆT KÊ CỤ THỂ các món ăn đó khi trả lời",
        "- KHÔNG được nói 'không có dữ liệu' nếu trong ngữ cảnh đã có thông tin menu",
        "- Nếu menu trống (rỗng), hãy nói 'Hôm nay chưa có món nào trong thực đơn' thay vì 'không có dữ liệu'",
        "",
        "CẢNH BÁO QUAN TRỌNG:",
        "- KHÔNG TÌM KIẾM TRÊN WEB về menu của người dùng",
        "- KHÔNG đề cập đến 'kết quả tìm kiếm', 'search results', hay các nguồn bên ngoài",
        "- KHÔNG dùng kiến thức tổng quát hoặc kinh nghiệm cá nhân để tạo ra món ăn",
        "- CHỈ dùng dữ liệu từ NGỮ CẢNH HIỆN TẠI hoặc database của người dùng",
        "- Nếu có menu trong context, hãy trả lời TRỰC TIẾP: 'Hôm nay có các món: [danh sách món]'",
        "- KHÔNG bắt đầu bằng 'Mình xin lỗi, nhưng kết quả tìm kiếm...' khi trả lời về menu",
        "- Nếu có dữ liệu menu, bỏ qua bất kỳ thông tin tìm kiếm nào và chỉ dùng dữ liệu từ context",
        "",
        "KHI USER HỎI VỀ MEAL PLAN:",
        "- Nếu trong NGỮ CẢNH HIỆN TẠI có 'Các món ăn có sẵn trong database' → CHỈ dùng các món đó để tạo meal plan",
        "- Nếu có danh sách món trong context → CHỈ dùng các món đó, KHÔNG tạo thêm món mới",
        "- Nếu không có đủ món cho meal plan → Nói rõ: 'Hiện tại hệ thống có [số] món: [danh sách]. Mình có thể tạo meal plan từ các món này, hoặc bạn muốn thêm món mới vào hệ thống trước?'",
        "- KHÔNG được tự tạo ra món ăn mới dựa trên kiến thức tổng quát",
        "- KHÔNG được suggest món ăn từ internet hoặc kiến thức chung",
        "- Ví dụ: Nếu context có 'Các món ăn có sẵn: Phở Bò, Cơm Gà' → CHỈ dùng 2 món đó để tạo meal plan, KHÔNG tạo thêm 'Bún chả', 'Cá kho'...",
        "- QUAN TRỌNG: Khi tạo meal plan, phải kiểm tra trong NGỮ CẢNH HIỆN TẠI xem có bao nhiêu món, và CHỈ dùng các món đó",
        "",
        "NGỮ CẢNH HIỆN TẠI:",
        context?.availableIngredients && context.availableIngredients.length > 0
          ? `- Nguyên liệu còn trong kho: ${context.availableIngredients.join(", ")}`
          : "- Nguyên liệu còn trong kho: (chưa có dữ liệu)",
        context?.availableDishes && context.availableDishes.length > 0
          ? `- Các món ăn có sẵn trong database (TỔNG: ${context.availableDishes.length} món): ${context.availableDishes.join(", ")}`
          : "- Các món ăn có sẵn trong database: (chưa có dữ liệu)",
        context?.currentMenu && context.currentMenu.length > 0
          ? (() => {
              const today = new Date();
              const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
              return `- Thực đơn hôm nay (${dateStr}): ${context.currentMenu.join(", ")}`;
            })()
          : (() => {
              const today = new Date();
              const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
              return `- Thực đơn hôm nay (${dateStr}): (chưa có món nào)`;
            })(),
        context?.dietaryPreferences && context.dietaryPreferences.length > 0
          ? `- Sở thích ăn uống: ${context.dietaryPreferences.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Xây dựng messages array với conversation history
      const messagesToSend: AIMessage[] = [
        { role: "system", content: systemPrompt },
        // Thêm conversation history trước message hiện tại
        ...conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        // Thêm message hiện tại
        { role: "user", content: message },
      ];

      const content = await this.callPerplexityAPI(messagesToSend);

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

  private isFollowUpRequest(normalizedMessage: string): boolean {
    if (!normalizedMessage) return false;

    const phrases = [
      "xem lai",
      "xem lai di",
      "xem lai nhe",
      "coi lai",
      "kiem tra lai",
      "check lai",
      "review lai",
      "nhac lai",
      "nhin lai",
      "cho xem lai",
      "xem lai giup",
      "xem lai dum",
    ];

    if (phrases.some((phrase) => normalizedMessage.includes(phrase))) {
      return true;
    }

    const tokens = normalizedMessage.split(/\s+/).filter(Boolean);
    const sanitizedTokens = tokens.map((token) => token.replace(/[?.!,]/g, ""));
    if (tokens.length > 0 && tokens.length <= 4) {
      const hasVerb = sanitizedTokens.some((token) =>
        ["xem", "coi", "check"].includes(token)
      );
      const hasAgain = sanitizedTokens.some((token) => token === "lai");
      if (hasVerb && hasAgain) {
        return true;
      }
    }

    return false;
  }

  private async handleFollowUpResponse(): Promise<AIResponse | null> {
    if (!this.lastInteraction) {
      return null;
    }

    switch (this.lastInteraction.type) {
      case "view-date":
      case "edit-date":
        return await this.getMenuResponseForDate(this.lastInteraction.isoDate, {
          friendlyLabel: this.lastInteraction.friendlyLabel,
        });
      case "random-menu":
        return {
          content: this.lastInteraction.content,
          suggestions: this.lastInteraction.suggestions,
        };
      default:
        return null;
    }
  }

  private setLastInteraction(interaction: LastInteraction) {
    this.lastInteraction = interaction;
  }

  private hasRandomKeyword(normalizedMessage: string): boolean {
    const randomKeywords = [
      "ngau nhien",
      "random",
      "bat ky",
      "tu chon",
      "tu dong",
      "ngau ung",
      "bat ki",
    ];
    return randomKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
  }

  private hasAddIntent(normalizedMessage: string): boolean {
    if (!normalizedMessage) return false;

    const negationPatterns = ["khong them", "khong muon them", "dung them"];
    if (negationPatterns.some((phrase) => normalizedMessage.includes(phrase))) {
      return false;
    }

    const addPatterns = [
      "them mon",
      "them vao menu",
      "them vao thuc don",
      "them vao bua",
      "bo sung mon",
      "bo sung vao",
      "bo sung them",
      "dua vao menu",
      "dua vao thuc don",
      "add mon",
      "cap nhat mon",
    ];
    if (addPatterns.some((phrase) => normalizedMessage.includes(phrase))) {
      return true;
    }

    const addVerbRegex = /\b(them|bo\s*sung|dua|add)\b/;
    if (!addVerbRegex.test(normalizedMessage)) {
      return false;
    }

    const contextKeywords = ["menu", "thuc don", "bua", "vao", "cho"];
    const hasContext = contextKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    if (!hasContext) {
      return false;
    }

    // Ensure there's at least one word between the verb and the context indicator
    const dishMentionRegex =
      /(them|bo\s*sung|dua|add)\s+(mon\s+)?([a-z0-9\s]{2,}?)(?:\s+(vao|cho|len|cap|de|trong)\b|$)/;
    return dishMentionRegex.test(normalizedMessage);
  }

  private hasRemoveIntent(normalizedMessage: string): boolean {
    if (!normalizedMessage) return false;

    const negations = [
      "khong xoa",
      "khong bo",
      "dung xoa",
      "khong muon xoa",
      "khong muon bo",
    ];
    if (negations.some((phrase) => normalizedMessage.includes(phrase))) {
      return false;
    }

    const removePatterns = [
      "xoa mon",
      "xoa khoi menu",
      "xoa khoi thuc don",
      "bo mon",
      "bo khoi menu",
      "bo khoi thuc don",
      "loai mon",
      "loai khoi menu",
      "loai khoi thuc don",
      "remove mon",
      "huy mon",
    ];
    if (removePatterns.some((pattern) => normalizedMessage.includes(pattern))) {
      return true;
    }

    const removeVerbRegex = /\b(xoa|loai|remove|huy)\b/;
    if (!removeVerbRegex.test(normalizedMessage)) {
      return false;
    }

    const contextKeywords = ["menu", "thuc don", "bua", "khoi", "ra", "mon"];
    const hasContext = contextKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    if (!hasContext) {
      return false;
    }

    const dishMentionRegex =
      /(xoa|loai|remove|huy)\s+(mon\s+)?([a-z0-9\s]{2,}?)(?:\s+(khoi|ra|khoi\s+menu|khoi\s+thuc\s+don)\b|$)/;
    return dishMentionRegex.test(normalizedMessage);
  }

  private detectMenuIntent(
    normalizedMessage: string,
    originalMessage: string
  ): MenuIntent | null {
    if (!normalizedMessage) return null;

    const hasRandom = this.hasRandomKeyword(normalizedMessage);
    const removeIntent = this.hasRemoveIntent(normalizedMessage);
    const addIntent = this.hasAddIntent(normalizedMessage);

    // Case 1: "thêm món ngẫu nhiên" hoặc "xóa món ngẫu nhiên"
    if (hasRandom && (removeIntent || addIntent)) {
      const dateMatch =
        this.parseDateMatch(normalizedMessage, { allowLoose: true }) ?? null;

      if (removeIntent) {
        // "xóa món ngẫu nhiên" -> random-remove
        return {
          type: "random-remove",
          isoDate: dateMatch?.isoDate ?? this.getTodayIsoDate(),
          friendlyLabel: dateMatch?.friendlyLabel ?? "ngày hôm nay",
          inferredDate: !dateMatch,
          normalizedMessage,
          originalMessage,
        };
      } else {
        // "thêm món ngẫu nhiên" -> random-add
        const servings = this.extractServings(normalizedMessage);
        return {
          type: "random-add",
          isoDate: dateMatch?.isoDate ?? this.getTodayIsoDate(),
          friendlyLabel: dateMatch?.friendlyLabel ?? "ngày hôm nay",
          inferredDate: !dateMatch,
          servings: servings ?? undefined,
          normalizedMessage,
          originalMessage,
        };
      }
    }

    // Case 2: Remove specific dish
    if (removeIntent) {
      const dateMatch =
        this.parseDateMatch(normalizedMessage, { allowLoose: true }) ?? null;
      return {
        type: "remove-dish",
        isoDate: dateMatch?.isoDate ?? this.getTodayIsoDate(),
        friendlyLabel: dateMatch?.friendlyLabel ?? "ngày hôm nay",
        inferredDate: !dateMatch,
        normalizedMessage,
        originalMessage,
      };
    }

    // Case 3: Add specific dish
    if (addIntent) {
      const dateMatch =
        this.parseDateMatch(normalizedMessage, { allowLoose: true }) ?? null;
      const servings = this.extractServings(normalizedMessage);
      return {
        type: "add-dish",
        isoDate: dateMatch?.isoDate ?? this.getTodayIsoDate(),
        friendlyLabel: dateMatch?.friendlyLabel ?? "ngày hôm nay",
        inferredDate: !dateMatch,
        servings: servings ?? undefined,
        normalizedMessage,
        originalMessage,
      };
    }

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
      const followUpDate = this.parseDateMatch(normalizedMessage, {
        allowLoose: true,
      });
      if (followUpDate) {
        return {
          type: "date",
          isoDate: followUpDate.isoDate,
          friendlyLabel: followUpDate.friendlyLabel,
        };
      }
      return null;
    }

    // Case 4: Random menu (tạo menu ngẫu nhiên)
    if (hasRandom) {
      const servingInfo = this.parseServingInfo(normalizedMessage);
      return {
        type: "random-menu",
        adults: servingInfo.adults,
        kids: servingInfo.kids,
      };
    }

    const dateMatch = this.parseDateMatch(normalizedMessage, {
      allowLoose: true,
    });
    if (dateMatch) {
      return {
        type: "date",
        isoDate: dateMatch.isoDate,
        friendlyLabel: dateMatch.friendlyLabel,
      };
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

  private extractServings(normalizedMessage: string): number | undefined {
    if (!normalizedMessage) return undefined;

    const explicitPortionMatch = normalizedMessage.match(
      /(\d+)\s*(khau phan|phan|suat|serving|phan an)/
    );
    if (explicitPortionMatch) {
      return Number(explicitPortionMatch[1]);
    }

    const forPeopleMatch = normalizedMessage.match(
      /cho\s*(\d+)\s*(nguoi|khach|phan)/
    );
    if (forPeopleMatch) {
      return Number(forPeopleMatch[1]);
    }

    return undefined;
  }

  private messageMentionsDish(
    normalizedMessage: string,
    dishName: string
  ): boolean {
    if (!normalizedMessage) return false;

    const normalizedDish = this.normalizeText(dishName || "");
    if (!normalizedDish) return false;

    const compactDish = normalizedDish.replace(/\s+/g, "");
    if (compactDish.length < 2) {
      return false;
    }

    const compactMessage = normalizedMessage.replace(/\s+/g, "");
    return (
      normalizedMessage.includes(normalizedDish) ||
      compactMessage.includes(compactDish)
    );
  }

  private parseDateMatch(
    normalizedMessage: string,
    options?: { allowLoose?: boolean }
  ): DateMatch | null {
    if (!normalizedMessage) return null;

    const allowLoose = options?.allowLoose ?? false;
    const cleaned = normalizedMessage.replace(/[^a-z0-9\s]/g, " ");
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const hasToken = (token: string) => tokens.includes(token);
    const todayIso = this.getTodayIsoDate();

    const relativePatterns: Array<{
      keywords: string[];
      looseTokens?: string[];
      offset: number;
      label: string;
    }> = [
      {
        keywords: ["hom nay", "hnay", "ngay hom nay"],
        offset: 0,
        label: "ngày hôm nay",
      },
      {
        keywords: ["hom qua", "homqua", "hqua", "ngay hom qua", "qua day"],
        offset: -1,
        label: "ngày hôm qua",
      },
      {
        keywords: ["hom kia", "homkia"],
        offset: -2,
        label: "ngày hôm kia",
      },
      {
        keywords: ["ngay mai", "ngaymai"],
        looseTokens: ["mai"],
        offset: 1,
        label: "ngày mai",
      },
      {
        keywords: ["ngay kia", "ngaykia"],
        looseTokens: ["kia"],
        offset: 2,
        label: "ngày kia",
      },
    ];

    for (const pattern of relativePatterns) {
      const directMatch = pattern.keywords.some((keyword) =>
        normalizedMessage.includes(keyword)
      );
      const looseMatch =
        allowLoose && pattern.looseTokens
          ? pattern.looseTokens.some((token) => hasToken(token))
          : false;
      if (directMatch || looseMatch) {
        const isoDate =
          pattern.offset === 0
            ? todayIso
            : this.getRelativeIsoDate(pattern.offset);
        return {
          isoDate,
          friendlyLabel: pattern.label,
        };
      }
    }

    const explicitDateResult = this.extractExplicitDate(normalizedMessage);
    if (explicitDateResult) {
      return explicitDateResult;
    }

    const weekdayResult = this.extractWeekdayDate(
      normalizedMessage,
      cleaned,
      allowLoose
    );
    if (weekdayResult) {
      return weekdayResult;
    }

    return null;
  }

  private extractExplicitDate(normalizedMessage: string): DateMatch | null {
    const slashRegex =
      /(?:ngay\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
    const textRegex =
      /ngay\s*(\d{1,2})(?:\s*thang\s*(\d{1,2}))?(?:\s*nam\s*(\d{2,4}))?/;

    let day: number | undefined;
    let month: number | undefined;
    let year: number | undefined;

    const slashMatch = normalizedMessage.match(slashRegex);
    if (slashMatch) {
      day = Number(slashMatch[1]);
      month = Number(slashMatch[2]);
      if (slashMatch[3]) {
        year = Number(slashMatch[3]);
      }
    } else {
      const textMatch = normalizedMessage.match(textRegex);
      if (textMatch) {
        day = Number(textMatch[1]);
        month = textMatch[2] ? Number(textMatch[2]) : undefined;
        if (textMatch[3]) {
          year = Number(textMatch[3]);
        }
      }
    }

    if (!day) {
      return null;
    }
    const today = new Date();
    if (!month) {
      month = today.getMonth() + 1;
    }
    if (!year) {
      year = today.getFullYear();
    } else if (year < 100) {
      year = 2000 + year;
    }

    const isoDate = this.normalizeToIsoDate(year, month, day);
    if (!isoDate) {
      return null;
    }

    const friendlyLabel = `ngày ${String(day).padStart(2, "0")}/${String(
      month
    ).padStart(2, "0")}/${year}`;
    return { isoDate, friendlyLabel };
  }

  private extractWeekdayDate(
    normalizedMessage: string,
    cleanedMessage: string,
    allowLoose: boolean
  ): DateMatch | null {
    const weekOffset =
      normalizedMessage.includes("tuan sau") ||
      normalizedMessage.includes("tuan toi") ||
      normalizedMessage.includes("tuan tiep")
        ? 1
        : normalizedMessage.includes("tuan truoc") ||
            normalizedMessage.includes("tuan vua qua")
          ? -1
          : 0;

    const weekdayDigitMatch = cleanedMessage.match(/thu\s*([2-7])/);
    let targetDay: number | null = null;
    if (weekdayDigitMatch) {
      targetDay = Number(weekdayDigitMatch[1]) - 1;
    }

    const weekdayKeywords: Array<{ keyword: string; dayIndex: number }> = [
      { keyword: "chu nhat", dayIndex: 0 },
      { keyword: "cn", dayIndex: 0 },
      { keyword: "thu hai", dayIndex: 1 },
      { keyword: "thu ba", dayIndex: 2 },
      { keyword: "thu tu", dayIndex: 3 },
      { keyword: "thu nam", dayIndex: 4 },
      { keyword: "thu sau", dayIndex: 5 },
      { keyword: "thu bay", dayIndex: 6 },
    ];

    if (targetDay === null) {
      for (const { keyword, dayIndex } of weekdayKeywords) {
        if (cleanedMessage.includes(keyword)) {
          targetDay = dayIndex;
          break;
        }
      }
    }

    if (targetDay === null) {
      if (
        allowLoose &&
        (cleanedMessage.startsWith("thu") || cleanedMessage.startsWith("cn"))
      ) {
        // If user only typed something like "Thu 5?" treat as the next occurrence.
        const fallbackMatch = cleanedMessage.match(/^thu\s*([2-7])$/);
        if (fallbackMatch) {
          targetDay = Number(fallbackMatch[1]) - 1;
        }
      }

      if (targetDay === null) {
        return null;
      }
    }

    const today = new Date();
    const todayDay = today.getDay(); // 0 (Sun) - 6 (Sat)

    let delta = targetDay - todayDay + weekOffset * 7;
    const mentionsPast =
      normalizedMessage.includes("truoc") ||
      normalizedMessage.includes("qua") ||
      normalizedMessage.includes("vua");
    const mentionsFuture =
      normalizedMessage.includes("sau") ||
      normalizedMessage.includes("toi") ||
      normalizedMessage.includes("tiep");

    if (weekOffset === 0) {
      if (delta < 0 && !mentionsPast && mentionsFuture) {
        delta += 7;
      } else if (delta > 0 && mentionsPast && !mentionsFuture) {
        delta -= 7;
      }
    }

    const isoDate =
      delta === 0 ? this.getTodayIsoDate() : this.getRelativeIsoDate(delta);

    const weekdayName = this.getVietnameseWeekdayName(targetDay);
    let friendlyLabel = `${weekdayName}`;

    if (weekOffset === -1) {
      friendlyLabel = `${weekdayName} tuần trước`;
    } else if (weekOffset === 1) {
      friendlyLabel = `${weekdayName} tuần sau`;
    } else if (delta === 0) {
      friendlyLabel = `${weekdayName} (hôm nay)`;
    } else if (delta < 0) {
      friendlyLabel = `${weekdayName} tuần này (đã qua)`;
    } else if (delta > 0) {
      friendlyLabel = `${weekdayName} tuần này`;
    }

    return {
      isoDate,
      friendlyLabel,
    };
  }

  private normalizeToIsoDate(
    year: number,
    month: number,
    day: number
  ): string | null {
    if (!this.isValidDate(year, month, day)) {
      return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10);
  }

  private isValidDate(year: number, month: number, day: number): boolean {
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return false;
    }

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  private getVietnameseWeekdayName(dayIndex: number): string {
    const weekdayNames = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    return weekdayNames[dayIndex] ?? "Ngày";
  }

  private buildDishSuggestions(
    normalizedMessage: string,
    dishes: Dish[]
  ): string[] {
    if (!normalizedMessage || dishes.length === 0) {
      return [];
    }

    const stopwords = new Set([
      "them",
      "vao",
      "ngay",
      "hom",
      "nay",
      "qua",
      "mai",
      "kia",
      "cho",
      "bua",
      "thuc",
      "don",
      "menu",
      "cap",
      "nhat",
      "giup",
      "toi",
      "xin",
      "hay",
      "xoa",
      "loai",
      "remove",
      "huy",
      "mon",
      "monan",
      "themmon",
      "thucdon",
    ]);

    const messageTokens = new Set(
      normalizedMessage
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length > 1 && !stopwords.has(token.replace(/\s+/g, ""))
        )
    );

    const scored = dishes
      .map((dish) => {
        const normalizedName = this.normalizeText(dish.ten_mon_an || "");
        const dishTokens = normalizedName
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 1);
        const score = dishTokens.reduce(
          (acc, token) => acc + (messageTokens.has(token) ? 1 : 0),
          0
        );
        return { dish, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.dish.ten_mon_an.localeCompare(b.dish.ten_mon_an);
      })
      .slice(0, 5)
      .map((item) => item.dish.ten_mon_an);

    if (scored.length > 0) {
      return scored;
    }

    return dishes
      .slice(0, 5)
      .map((dish) => dish.ten_mon_an)
      .filter(Boolean);
  }

  private hasCheckInventoryIntent(normalizedMessage: string): boolean {
    if (!normalizedMessage) return false;

    const checkPatterns = [
      "kiem tra kho",
      "xem kho",
      "ton kho",
      "co trong kho",
      "co san",
      "con khong",
      "het chua",
      "con bao nhieu",
      "con ton",
      "co mon",
      "co nguyen lieu",
      "kiem tra nguyen lieu",
      "xem nguyen lieu",
    ];

    return checkPatterns.some((pattern) => normalizedMessage.includes(pattern));
  }

  private isMenuRelatedMessage(
    normalizedMessage: string,
    menuIntent: MenuIntent | null
  ): boolean {
    if (menuIntent) return true;
    if (this.isFollowUpRequest(normalizedMessage)) return true;
    if (this.hasCheckInventoryIntent(normalizedMessage)) return true;
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
      "kho",
      "ton kho",
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

  // Helper to make response more natural and conversational
  private makeNaturalResponse(
    mainMessage: string,
    details?: string[],
    suggestions?: string[]
  ): AIResponse {
    let content = mainMessage;

    if (details && details.length > 0) {
      content += `\n\n${details.join("\n")}`;
    }

    return {
      content,
      suggestions: suggestions?.slice(0, 5),
    };
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

  private async handleAddDishIntent(
    intent: Extract<MenuIntent, { type: "add-dish" }>
  ): Promise<AIResponse> {
    try {
      const [dishesData, existingMenu] = await Promise.all([
        this.getDishesData(),
        getMenuItems(intent.isoDate),
      ]);

      const allDishes = (dishesData?.allDishes ?? []) as Dish[];
      if (!allDishes || allDishes.length === 0) {
        return {
          content:
            "Hiện chưa có món ăn nào trong cơ sở dữ liệu Supabase. Vui lòng thêm món vào hệ thống trước.",
        };
      }

      const existingDishIds = new Set(
        (existingMenu || []).map((item) => String(item.ma_mon_an))
      );

      const matchedDishes = allDishes.filter((dish) => {
        return this.messageMentionsDish(
          intent.normalizedMessage,
          dish.ten_mon_an || ""
        );
      });

      if (matchedDishes.length === 0) {
        const suggestions = this.buildDishSuggestions(
          intent.normalizedMessage,
          allDishes
        );

        let content =
          "Mình chưa tìm thấy món nào trùng với yêu cầu của bạn trong cơ sở dữ liệu.\n";
        if (suggestions.length > 0) {
          content += `\n**Có thể bạn muốn:**\n${suggestions
            .map((name, idx) => `${idx + 1}. ${name}`)
            .join("\n")}\n`;
          content +=
            "\nVui lòng nhập lại chính xác tên món muốn thêm vào thực đơn.";
        } else {
          content +=
            "\nVui lòng kiểm tra lại tên món hoặc thêm món vào hệ thống trước khi cập nhật thực đơn.";
        }

        return {
          content,
          suggestions,
        };
      }

      const additions: Dish[] = [];
      const alreadyExists: Dish[] = [];
      const failures: Array<{ dish: Dish; error: string }> = [];

      const servings =
        intent.servings && intent.servings > 0
          ? Math.max(1, Math.round(intent.servings))
          : 1;

      for (const dish of matchedDishes) {
        if (existingDishIds.has(String(dish.id))) {
          alreadyExists.push(dish);
          continue;
        }

        try {
          await addDishToMenu(String(dish.id), intent.isoDate, servings);
          additions.push(dish);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không rõ nguyên nhân";
          failures.push({ dish, error: message });
        }
      }

      if (
        additions.length === 0 &&
        alreadyExists.length === 0 &&
        failures.length > 0
      ) {
        const failureLines = failures.map(
          ({ dish, error }) => `- ${dish.ten_mon_an}: ${error}`
        );
        return {
          content: `Không thể thêm các món sau vào thực đơn ${
            intent.friendlyLabel
          } (${this.formatVietnamDate(intent.isoDate)}):\n${failureLines.join(
            "\n"
          )}`,
          suggestions: failures.map(({ dish }) => dish.ten_mon_an),
        };
      }

      let content = `📅 **Cập nhật thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
        intent.isoDate
      )})**\n\n`;

      if (intent.inferredDate) {
        content +=
          "• Bạn không chỉ định ngày cụ thể nên mình mặc định sử dụng ngày hôm nay.\n\n";
      }

      if (additions.length > 0) {
        content += `**Đã thêm (${servings} khẩu phần mỗi món):**\n${additions
          .map((dish, index) => `${index + 1}. ${dish.ten_mon_an}`)
          .join("\n")}\n\n`;
      }

      if (alreadyExists.length > 0) {
        content += `**Đã có sẵn trong thực đơn:**\n${alreadyExists
          .map((dish, index) => `${index + 1}. ${dish.ten_mon_an}`)
          .join("\n")}\n\n`;
      }

      if (failures.length > 0) {
        content += `**Không thể thêm:**\n${failures
          .map(({ dish, error }) => `- ${dish.ten_mon_an}: ${error}`)
          .join("\n")}\n\n`;
      }

      content += "Bạn có muốn xem lại thực đơn hoặc thêm món khác không?";

      const suggestions = [
        ...additions.map((dish) => `Xem món ${dish.ten_mon_an}`),
        ...alreadyExists.map((dish) => `Kiểm tra ${dish.ten_mon_an}`),
      ].slice(0, 5);

      this.setLastInteraction({
        type: "edit-date",
        isoDate: intent.isoDate,
        friendlyLabel: intent.friendlyLabel,
        action: "add",
        timestamp: Date.now(),
      });

      return {
        content,
        suggestions,
      };
    } catch (error) {
      logger.error("Error handling add-dish intent:", error);
      return {
        content:
          "Không thể cập nhật thực đơn ngay lúc này. Bạn có muốn tôi gợi ý các bước tự thêm món thủ công không?",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handleRandomAddDishIntent(
    intent: Extract<MenuIntent, { type: "random-add" }>
  ): Promise<AIResponse> {
    try {
      const [dishesData, existingMenu] = await Promise.all([
        this.getDishesData(),
        getMenuItems(intent.isoDate),
      ]);

      const allDishes = (dishesData?.allDishes ?? []) as Dish[];
      if (!allDishes || allDishes.length === 0) {
        return {
          content:
            "Hiện chưa có món ăn nào trong cơ sở dữ liệu. Vui lòng thêm món vào hệ thống trước.",
        };
      }

      const existingDishIds = new Set(
        (existingMenu || []).map((item) => String(item.ma_mon_an))
      );

      // Filter available dishes (not already in menu)
      const availableDishes = allDishes.filter(
        (dish) => !existingDishIds.has(String(dish.id))
      );

      if (availableDishes.length === 0) {
        return {
          content: `Tất cả các món đã có trong thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
            intent.isoDate
          )}). Không có món nào để thêm ngẫu nhiên.`,
        };
      }

      // Pick a random dish
      const randomDish =
        availableDishes[Math.floor(Math.random() * availableDishes.length)];
      const servings =
        intent.servings && intent.servings > 0
          ? Math.max(1, Math.round(intent.servings))
          : 1;

      try {
        await addDishToMenu(String(randomDish.id), intent.isoDate, servings);

        const dateInfo = intent.inferredDate
          ? ""
          : ` vào ${intent.friendlyLabel}`;

        let content = `Mình đã chọn món ${randomDish.ten_mon_an}`;
        if (randomDish.loai_mon_an) {
          content += ` (${randomDish.loai_mon_an})`;
        }
        content += ` và thêm vào thực đơn${dateInfo} rồi nha!`;

        if (servings > 1) {
          content += ` Khẩu phần: ${servings}.`;
        }

        const details = [
          `Món này mình chọn ngẫu nhiên từ ${availableDishes.length} món đang có.`,
          "Bạn muốn thêm món nào khác nữa không?",
        ];

        const suggestions = [
          `Xem công thức ${randomDish.ten_mon_an}`,
          "Thêm món ngẫu nhiên khác",
          "Xem thực đơn hôm nay",
        ];

        this.setLastInteraction({
          type: "edit-date",
          isoDate: intent.isoDate,
          friendlyLabel: intent.friendlyLabel,
          action: "add",
          timestamp: Date.now(),
        });

        return this.makeNaturalResponse(content, details, suggestions);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Không rõ nguyên nhân";
        return {
          content: `Không thể thêm món ${randomDish.ten_mon_an} vào thực đơn ${
            intent.friendlyLabel
          } (${this.formatVietnamDate(intent.isoDate)}):\n${message}`,
        };
      }
    } catch (error) {
      logger.error("Error handling random-add intent:", error);
      return {
        content:
          "Không thể thêm món ngẫu nhiên ngay lúc này. Vui lòng thử lại sau.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handleRandomRemoveDishIntent(
    intent: Extract<MenuIntent, { type: "random-remove" }>
  ): Promise<AIResponse> {
    try {
      const menuItems = await getMenuItems(intent.isoDate);

      if (!menuItems || menuItems.length === 0) {
        return {
          content: `Thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
            intent.isoDate
          )}) hiện không có món nào để xóa.`,
        };
      }

      // Check if user wants to remove ALL dishes
      const normalizedMsg = this.normalizeText(intent.originalMessage);
      const removeAllKeywords = [
        "toan bo",
        "tat ca",
        "het",
        "all",
        "moi mon",
        "tong",
      ];
      const shouldRemoveAll = removeAllKeywords.some((keyword) =>
        normalizedMsg.includes(keyword)
      );

      if (shouldRemoveAll) {
        // Remove ALL dishes
        const dishNames = Array.from(
          new Set(
            menuItems
              .map((item) => (item.ten_mon_an || "").trim())
              .filter(Boolean)
          )
        );

        try {
          // Delete all menu items
          await Promise.all(
            menuItems.map((item) => deleteMenuItem(String(item.id)))
          );

          let content = `✨ **Đã xóa toàn bộ thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
            intent.isoDate
          )})**\n\n`;

          if (intent.inferredDate) {
            content +=
              "• Bạn không chỉ định ngày cụ thể nên mình mặc định sử dụng ngày hôm nay.\n\n";
          }

          content += `**Món đã xóa:**\n`;
          content += dishNames.map((name) => `• ${name}`).join("\n");
          content += `\n\nĐã xóa ${menuItems.length} món khỏi thực đơn.\n\n`;
          content += "Bạn có muốn thêm món mới vào thực đơn không?";

          const suggestions = [
            "Thêm món ngẫu nhiên",
            "Thêm món mới",
            "Xem thực đơn hôm nay",
          ];

          this.setLastInteraction({
            type: "edit-date",
            isoDate: intent.isoDate,
            friendlyLabel: intent.friendlyLabel,
            action: "remove",
            timestamp: Date.now(),
          });

          return {
            content,
            suggestions,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không rõ nguyên nhân";
          return {
            content: `Không thể xóa toàn bộ thực đơn ${
              intent.friendlyLabel
            } (${this.formatVietnamDate(intent.isoDate)}):\n${message}`,
          };
        }
      }

      // Remove only ONE random dish (original behavior)
      const randomItem =
        menuItems[Math.floor(Math.random() * menuItems.length)];
      const dishName = (randomItem.ten_mon_an || "").trim() || "Món không tên";

      try {
        await deleteMenuItem(String(randomItem.id));

        let content = `🎲 **Đã xóa món ngẫu nhiên khỏi ${intent.friendlyLabel} (${this.formatVietnamDate(
          intent.isoDate
        )})**\n\n`;

        if (intent.inferredDate) {
          content +=
            "• Bạn không chỉ định ngày cụ thể nên mình mặc định sử dụng ngày hôm nay.\n\n";
        }

        content += `**Món đã xóa:**\n`;
        content += `• ${dishName}\n\n`;

        content += `Món này được chọn ngẫu nhiên từ ${menuItems.length} món trong thực đơn.\n\n`;

        const remainingMenu = await getMenuItems(intent.isoDate);
        const remainingNames = Array.from(
          new Set(
            (remainingMenu || [])
              .map((item) => (item.ten_mon_an || "").trim())
              .filter(Boolean)
          )
        );

        if (remainingNames.length > 0) {
          content += `**Thực đơn còn lại:**\n${remainingNames
            .map((name, index) => `${index + 1}. ${name}`)
            .join("\n")}\n\n`;
        } else {
          content += "Hiện thực đơn không còn món nào.\n\n";
        }

        content += "Bạn có muốn xóa món ngẫu nhiên khác không?";

        const suggestions = [
          ...remainingNames.slice(0, 3).map((name) => `Xem món ${name}`),
          "Xóa món ngẫu nhiên khác",
          "Xem thực đơn hôm nay",
        ];

        this.setLastInteraction({
          type: "edit-date",
          isoDate: intent.isoDate,
          friendlyLabel: intent.friendlyLabel,
          action: "remove",
          timestamp: Date.now(),
        });

        return {
          content,
          suggestions: suggestions.slice(0, 5),
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Không rõ nguyên nhân";
        return {
          content: `Không thể xóa món ${dishName} khỏi thực đơn ${
            intent.friendlyLabel
          } (${this.formatVietnamDate(intent.isoDate)}):\n${message}`,
        };
      }
    } catch (error) {
      logger.error("Error handling random-remove intent:", error);
      return {
        content:
          "Không thể xóa món ngẫu nhiên ngay lúc này. Vui lòng thử lại sau.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handleCheckInventoryIntent(
    normalizedMessage: string,
    originalMessage: string
  ): Promise<AIResponse> {
    try {
      // Extract what user is looking for (dish name or ingredient name)
      const searchTerms = this.extractSearchTerms(
        normalizedMessage,
        originalMessage
      );

      if (!searchTerms || searchTerms.length === 0) {
        // If asking about total count, show summary
        if (
          normalizedMessage.includes("bao nhieu") ||
          normalizedMessage.includes("tat ca")
        ) {
          const dishesData = await this.getDishesData();
          const allDishes = (dishesData?.allDishes ?? []) as Dish[];

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const ingredientsResponse = await fetch(
            `${baseUrl}/api/ai-data?type=ingredients`
          );
          const ingredientsData = await ingredientsResponse.json();
          const allIngredients = ingredientsData?.allIngredients ?? [];

          const content = `Trong kho hiện có:\n- ${allDishes.length} món ăn\n- ${allIngredients.length} loại nguyên liệu\n\nBạn muốn kiểm tra món cụ thể nào không?`;

          return {
            content,
            suggestions: ["Xem tất cả món ăn", "Xem tất cả nguyên liệu"],
          };
        }

        return {
          content:
            'Bạn muốn kiểm tra món gì thế? Ví dụ: "Còn cà chua không?", "Có món bò kho không?"',
        };
      }

      // Try to find in dishes first
      const dishesData = await this.getDishesData();
      const allDishes = (dishesData?.allDishes ?? []) as Dish[];

      // Try to find in ingredients
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const ingredientsResponse = await fetch(
        `${baseUrl}/api/ai-data?type=ingredients`
      );
      const ingredientsData = await ingredientsResponse.json();
      const allIngredients = ingredientsData?.allIngredients ?? [];

      const foundDishes: Dish[] = [];
      const foundIngredients: Ingredient[] = [];

      for (const term of searchTerms) {
        const normalizedTerm = this.normalizeText(term);

        // Check dishes
        const matchedDishes = allDishes.filter((dish) =>
          this.normalizeText(dish.ten_mon_an || "").includes(normalizedTerm)
        );
        foundDishes.push(...matchedDishes);

        // Check ingredients
        const matchedIngredients = allIngredients.filter((ing: Ingredient) =>
          this.normalizeText(ing.ten_nguyen_lieu || "").includes(normalizedTerm)
        );
        foundIngredients.push(...matchedIngredients);
      }

      // Build natural response
      let content = "";
      const suggestions: string[] = [];

      if (foundDishes.length > 0) {
        if (foundDishes.length === 1) {
          content = `Có nha, mình có món ${foundDishes[0].ten_mon_an}`;
          if (foundDishes[0].loai_mon_an) {
            content += ` (${foundDishes[0].loai_mon_an})`;
          }
          content += " trong danh sách đây.";
          suggestions.push(`Thêm ${foundDishes[0].ten_mon_an} vào menu`);
        } else {
          content = `Mình tìm thấy ${foundDishes.length} món:\n`;
          foundDishes.slice(0, 5).forEach((dish) => {
            content += `- ${dish.ten_mon_an}`;
            if (dish.loai_mon_an) content += ` (${dish.loai_mon_an})`;
            content += `\n`;
          });
        }
      }

      if (foundIngredients.length > 0) {
        if (content) content += "\n";

        foundIngredients.forEach((ing: Ingredient) => {
          const qty = Number(ing.ton_kho_so_luong || 0);
          const wgt = Number(ing.ton_kho_khoi_luong || 0);

          if (foundIngredients.length === 1) {
            content += `Nguyên liệu ${ing.ten_nguyen_lieu} `;
            if (qty > 0) {
              content += `còn ${qty} (số lượng) nha.`;
            } else if (wgt > 0) {
              content += `còn ${wgt}kg nha.`;
            } else {
              content += `đang hết rồi bạn ơi.`;
            }
          } else {
            content += `- ${ing.ten_nguyen_lieu}: `;
            if (qty > 0) {
              content += `${qty} (số lượng)`;
            } else if (wgt > 0) {
              content += `${wgt}kg`;
            } else {
              content += `hết`;
            }
            content += `\n`;
          }
        });
      }

      if (!foundDishes.length && !foundIngredients.length) {
        content = `Hmm, mình không tìm thấy "${searchTerms.join(", ")}" trong kho. Bạn có thể kiểm tra lại tên không? Hoặc có thể món/nguyên liệu đó chưa được thêm vào hệ thống.`;
        suggestions.push("Xem tất cả món ăn", "Xem tất cả nguyên liệu");
      }

      return {
        content,
        suggestions: suggestions.slice(0, 5),
      };
    } catch (error) {
      logger.error("Error checking inventory:", error);
      return {
        content:
          "Không thể kiểm tra kho ngay lúc này. Vui lòng thử lại sau hoặc kiểm tra trực tiếp tại trang Storage.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private extractSearchTerms(
    normalizedMessage: string,
    originalMessage: string
  ): string[] {
    // Special case: if asking about quantity of all items
    if (
      normalizedMessage.includes("bao nhieu mon") ||
      normalizedMessage.includes("bao nhieu nguyen lieu") ||
      normalizedMessage.includes("co bao nhieu") ||
      normalizedMessage.includes("tat ca")
    ) {
      // Return empty to trigger showing all items message
      return [];
    }

    // Remove common check keywords but keep important nouns
    let cleaned = normalizedMessage;
    const removePatterns = [
      "kiem tra xem",
      "kiem tra",
      "xem xem",
      "xem",
      "trong kho co",
      "trong kho",
      "con khong",
      "het chua",
      "con bao nhieu",
      "bao nhieu",
      "ton kho",
      "co san",
      "con ton",
      "co khong",
      "co ",
      "khong",
      "hay",
      "nao",
      "gi",
    ];

    // Remove patterns one by one
    removePatterns.forEach((pattern) => {
      cleaned = cleaned.replace(new RegExp(pattern, "g"), " ");
    });

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // If we still have meaningful words, use them
    if (cleaned && cleaned.length >= 2) {
      // Remove single letters and common words
      const words = cleaned
        .split(/\s+/)
        .filter((word) => word.length > 1)
        .filter((word) => !["an", "o", "i", "a", "va", "hoac"].includes(word));

      if (words.length > 0) {
        return words.slice(0, 3);
      }
    }

    // If nothing meaningful left, try to extract nouns from original message
    const originalNormalized = this.normalizeText(originalMessage);

    // Look for specific patterns like "món X", "nguyên liệu Y"
    const dishPattern =
      /mon\s+([a-z\s]{2,}?)(?:\s+(?:khong|het|con|co|nao|gi|trong)|$)/;
    const ingredientPattern =
      /nguyen\s*lieu\s+([a-z\s]{2,}?)(?:\s+(?:khong|het|con|co|nao|gi|trong)|$)/;

    const dishMatch = originalNormalized.match(dishPattern);
    if (dishMatch && dishMatch[1]) {
      return [dishMatch[1].trim()];
    }

    const ingredientMatch = originalNormalized.match(ingredientPattern);
    if (ingredientMatch && ingredientMatch[1]) {
      return [ingredientMatch[1].trim()];
    }

    // Last resort: extract all words longer than 3 chars that aren't common words
    const stopwords = new Set([
      "kiem",
      "tra",
      "xem",
      "trong",
      "kho",
      "con",
      "het",
      "bao",
      "nhieu",
      "khong",
      "mon",
      "nguyen",
      "lieu",
      "san",
      "ton",
      "chua",
      "nao",
      "nay",
    ]);

    const meaningfulWords = originalNormalized
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopwords.has(word))
      .slice(0, 3);

    return meaningfulWords;
  }

  private async handleRemoveDishIntent(
    intent: Extract<MenuIntent, { type: "remove-dish" }>
  ): Promise<AIResponse> {
    try {
      const menuItems = await getMenuItems(intent.isoDate);

      if (!menuItems || menuItems.length === 0) {
        return {
          content: `Thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
            intent.isoDate
          )}) hiện không có món nào để xóa.`,
        };
      }

      const matchedItems = menuItems.filter((item) =>
        this.messageMentionsDish(
          intent.normalizedMessage,
          item.ten_mon_an || ""
        )
      );

      const uniqueDishNames = Array.from(
        new Set(
          menuItems
            .map((item) => (item.ten_mon_an || "").trim())
            .filter(Boolean)
        )
      );

      if (matchedItems.length === 0) {
        const suggestions = this.buildDishSuggestions(
          intent.normalizedMessage,
          uniqueDishNames.map((name) => ({
            id: name,
            ten_mon_an: name,
          })) as Dish[]
        );

        let content = `Không tìm thấy món nào khớp với yêu cầu để xóa khỏi thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
          intent.isoDate
        )}).`;

        if (uniqueDishNames.length > 0) {
          content += `\n\n**Thực đơn hiện có:**\n${uniqueDishNames
            .map((name, index) => `${index + 1}. ${name}`)
            .join("\n")}`;
        }

        if (suggestions.length > 0) {
          content += `\n\n**Gợi ý:**\n${suggestions
            .map((name, index) => `${index + 1}. ${name}`)
            .join("\n")}`;
        }

        content += `\n\nVui lòng cho biết chính xác tên món cần xóa.`;

        return {
          content,
          suggestions: suggestions.slice(0, 5),
        };
      }

      const summary = new Map<string, { removed: number; errors: string[] }>();

      for (const item of matchedItems) {
        const dishName = (item.ten_mon_an || "").trim() || "Món không tên";
        if (!summary.has(dishName)) {
          summary.set(dishName, { removed: 0, errors: [] });
        }
        const entry = summary.get(dishName)!;

        try {
          await deleteMenuItem(String(item.id));
          entry.removed += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không rõ nguyên nhân";
          entry.errors.push(message);
        }
      }

      const removedEntries = Array.from(summary.entries()).filter(
        ([, value]) => value.removed > 0
      );
      const failureEntries = Array.from(summary.entries())
        .flatMap(([name, value]) =>
          value.errors.map((error) => ({ name, error }))
        )
        .filter(Boolean);

      if (removedEntries.length === 0 && failureEntries.length > 0) {
        const failureLines = failureEntries.map(
          ({ name, error }) => `- ${name}: ${error}`
        );
        return {
          content: `Không thể xóa các món yêu cầu khỏi thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
            intent.isoDate
          )}):\n${failureLines.join("\n")}`,
          suggestions: uniqueDishNames.slice(0, 5),
        };
      }

      let content = `🗑️ **Cập nhật thực đơn ${intent.friendlyLabel} (${this.formatVietnamDate(
        intent.isoDate
      )})**\n\n`;

      if (intent.inferredDate) {
        content +=
          "• Bạn không chỉ định ngày cụ thể nên mình mặc định sử dụng ngày hôm nay.\n\n";
      }

      if (removedEntries.length > 0) {
        content += `**Đã xóa:**\n${removedEntries
          .map(([name, value]) =>
            value.removed > 1
              ? `- ${name} (xóa ${value.removed} mục)`
              : `- ${name}`
          )
          .join("\n")}\n\n`;
      }

      if (failureEntries.length > 0) {
        content += `**Không thể xóa:**\n${failureEntries
          .map(({ name, error }) => `- ${name}: ${error}`)
          .join("\n")}\n\n`;
      }

      const remainingMenu = await getMenuItems(intent.isoDate);
      const remainingNames = Array.from(
        new Set(
          (remainingMenu || [])
            .map((item) => (item.ten_mon_an || "").trim())
            .filter(Boolean)
        )
      );

      if (remainingNames.length > 0) {
        content += `**Thực đơn còn lại:**\n${remainingNames
          .map((name, index) => `${index + 1}. ${name}`)
          .join("\n")}\n\n`;
      } else {
        content += "Hiện thực đơn không còn món nào.\n\n";
      }

      content += "Bạn có muốn thêm món khác hoặc kiểm tra ngày khác không?";

      const suggestions = [
        ...remainingNames.slice(0, 3).map((name) => `Xem món ${name}`),
        "Kiểm tra thực đơn ngày khác",
      ];

      this.setLastInteraction({
        type: "edit-date",
        isoDate: intent.isoDate,
        friendlyLabel: intent.friendlyLabel,
        action: "remove",
        timestamp: Date.now(),
      });

      return {
        content,
        suggestions: suggestions.slice(0, 5),
      };
    } catch (error) {
      logger.error("Error handling remove-dish intent:", error);
      return {
        content:
          "Không thể xóa món khỏi thực đơn ngay lúc này. Bạn có muốn tôi hướng dẫn các bước tự xóa thủ công không?",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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

      this.setLastInteraction({
        type: "random-menu",
        content,
        suggestions,
        timestamp: Date.now(),
      });

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
      const friendlyLabel =
        options?.friendlyLabel ?? `ngày ${this.formatVietnamDate(isoDate)}`;
      const content = `Thực đơn ${
        options?.friendlyLabel
          ? `${options.friendlyLabel} (${formattedDate})`
          : `ngày ${formattedDate}`
      }:\n${dishLines.join("\n")}`;

      this.setLastInteraction({
        type: "view-date",
        isoDate,
        friendlyLabel,
        timestamp: Date.now(),
      });

      return {
        content,
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
