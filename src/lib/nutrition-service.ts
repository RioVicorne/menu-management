import { logger } from './logger';

// Interface cho thông tin dinh dưỡng
export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  vitamins: {
    vitaminA?: number; // IU
    vitaminC?: number; // mg
    vitaminD?: number; // IU
    vitaminE?: number; // mg
    vitaminK?: number; // mcg
    thiamine?: number; // mg
    riboflavin?: number; // mg
    niacin?: number; // mg
    vitaminB6?: number; // mg
    folate?: number; // mcg
    vitaminB12?: number; // mcg
  };
  minerals: {
    calcium?: number; // mg
    iron?: number; // mg
    magnesium?: number; // mg
    phosphorus?: number; // mg
    potassium?: number; // mg
    zinc?: number; // mg
  };
}

// Interface cho nguyên liệu với thông tin dinh dưỡng
export interface IngredientNutrition {
  id: string;
  name: string;
  nutrition: NutritionInfo;
  pricePerUnit: number; // VND per unit
  unit: string;
  category: 'protein' | 'carbs' | 'vegetables' | 'fruits' | 'dairy' | 'grains' | 'oils' | 'spices';
}

// Interface cho món ăn với thông tin dinh dưỡng
export interface DishNutrition {
  dishId: string;
  dishName: string;
  category: string;
  nutrition: NutritionInfo;
  estimatedCost: number; // VND per serving
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
}

// Database dinh dưỡng cho các nguyên liệu phổ biến (VND)
const NUTRITION_DATABASE: Record<string, IngredientNutrition> = {
  'thịt ba chỉ': {
    id: 'thit-ba-chi',
    name: 'Thịt ba chỉ',
    nutrition: {
      calories: 250,
      protein: 18,
      carbs: 0,
      fat: 20,
      fiber: 0,
      sugar: 0,
      sodium: 60,
      vitamins: { vitaminB12: 2.4, niacin: 4.5 },
      minerals: { iron: 2.1, zinc: 4.2, phosphorus: 180 }
    },
    pricePerUnit: 120000, // VND per kg
    unit: 'kg',
    category: 'protein'
  },
  'thịt gà': {
    id: 'thit-ga',
    name: 'Thịt gà',
    nutrition: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
      vitamins: { vitaminB12: 0.3, niacin: 14.8, vitaminB6: 0.9 },
      minerals: { iron: 1.3, zinc: 1.0, phosphorus: 228 }
    },
    pricePerUnit: 80000, // VND per kg
    unit: 'kg',
    category: 'protein'
  },
  'cá basa': {
    id: 'ca-basa',
    name: 'Cá basa',
    nutrition: {
      calories: 89,
      protein: 20,
      carbs: 0,
      fat: 0.5,
      fiber: 0,
      sugar: 0,
      sodium: 37,
      vitamins: { vitaminB12: 2.4, niacin: 2.0 },
      minerals: { iron: 0.3, zinc: 0.4, phosphorus: 200 }
    },
    pricePerUnit: 60000, // VND per kg
    unit: 'kg',
    category: 'protein'
  },
  'tôm': {
    id: 'tom',
    name: 'Tôm',
    nutrition: {
      calories: 99,
      protein: 24,
      carbs: 0,
      fat: 0.3,
      fiber: 0,
      sugar: 0,
      sodium: 111,
      vitamins: { vitaminB12: 1.1, niacin: 2.2 },
      minerals: { iron: 0.3, zinc: 1.3, phosphorus: 201 }
    },
    pricePerUnit: 150000, // VND per kg
    unit: 'kg',
    category: 'protein'
  },
  'trứng': {
    id: 'trung',
    name: 'Trứng',
    nutrition: {
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
      fiber: 0,
      sugar: 1.1,
      sodium: 124,
      vitamins: { vitaminA: 160, vitaminD: 41, vitaminB12: 1.1 },
      minerals: { iron: 1.2, zinc: 1.0, phosphorus: 198 }
    },
    pricePerUnit: 3000, // VND per piece
    unit: 'cái',
    category: 'protein'
  },
  'gạo': {
    id: 'gao',
    name: 'Gạo',
    nutrition: {
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4,
      sugar: 0.1,
      sodium: 1,
      vitamins: { thiamine: 0.1, niacin: 1.6 },
      minerals: { iron: 0.8, magnesium: 25, phosphorus: 43 }
    },
    pricePerUnit: 15000, // VND per kg
    unit: 'kg',
    category: 'grains'
  },
  'rau muống': {
    id: 'rau-muong',
    name: 'Rau muống',
    nutrition: {
      calories: 19,
      protein: 2.6,
      carbs: 3.4,
      fat: 0.2,
      fiber: 1.0,
      sugar: 0.4,
      sodium: 79,
      vitamins: { vitaminA: 3150, vitaminC: 28, vitaminK: 108 },
      minerals: { iron: 1.7, calcium: 77, magnesium: 71 }
    },
    pricePerUnit: 15000, // VND per kg
    unit: 'kg',
    category: 'vegetables'
  },
  'cà chua': {
    id: 'ca-chua',
    name: 'Cà chua',
    nutrition: {
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
      sugar: 2.6,
      sodium: 5,
      vitamins: { vitaminA: 833, vitaminC: 14, vitaminK: 7.9 },
      minerals: { iron: 0.3, calcium: 10, magnesium: 11 }
    },
    pricePerUnit: 25000, // VND per kg
    unit: 'kg',
    category: 'vegetables'
  },
  'hành tây': {
    id: 'hanh-tay',
    name: 'Hành tây',
    nutrition: {
      calories: 40,
      protein: 1.1,
      carbs: 9.3,
      fat: 0.1,
      fiber: 1.7,
      sugar: 4.2,
      sodium: 4,
      vitamins: { vitaminC: 7.4, vitaminB6: 0.1 },
      minerals: { iron: 0.2, calcium: 23, magnesium: 10 }
    },
    pricePerUnit: 20000, // VND per kg
    unit: 'kg',
    category: 'vegetables'
  },
  'tỏi': {
    id: 'toi',
    name: 'Tỏi',
    nutrition: {
      calories: 149,
      protein: 6.4,
      carbs: 33,
      fat: 0.5,
      fiber: 2.1,
      sugar: 1.0,
      sodium: 17,
      vitamins: { vitaminC: 31, vitaminB6: 1.2 },
      minerals: { iron: 1.7, calcium: 181, magnesium: 25 }
    },
    pricePerUnit: 40000, // VND per kg
    unit: 'kg',
    category: 'vegetables'
  },
  'nước mắm': {
    id: 'nuoc-mam',
    name: 'Nước mắm',
    nutrition: {
      calories: 8,
      protein: 1.3,
      carbs: 0.8,
      fat: 0,
      fiber: 0,
      sugar: 0.8,
      sodium: 6973,
      vitamins: {},
      minerals: { iron: 0.1, calcium: 4 }
    },
    pricePerUnit: 35000, // VND per bottle
    unit: 'chai',
    category: 'spices'
  },
  'dầu ăn': {
    id: 'dau-an',
    name: 'Dầu ăn',
    nutrition: {
      calories: 884,
      protein: 0,
      carbs: 0,
      fat: 100,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: { vitaminE: 14.3, vitaminK: 21.1 },
      minerals: {}
    },
    pricePerUnit: 25000, // VND per bottle
    unit: 'chai',
    category: 'oils'
  }
};

export class NutritionService {
  private static instance: NutritionService;
  
  private constructor() {}
  
  public static getInstance(): NutritionService {
    if (!NutritionService.instance) {
      NutritionService.instance = new NutritionService();
    }
    return NutritionService.instance;
  }

  // Lấy thông tin dinh dưỡng của nguyên liệu
  getIngredientNutrition(ingredientName: string): IngredientNutrition | null {
    const normalizedName = ingredientName.toLowerCase().trim();
    
    // Tìm kiếm chính xác
    if (NUTRITION_DATABASE[normalizedName]) {
      return NUTRITION_DATABASE[normalizedName];
    }
    
    // Tìm kiếm gần đúng
    for (const [key, value] of Object.entries(NUTRITION_DATABASE)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        return value;
      }
    }
    
    return null;
  }

  // Tính toán dinh dưỡng cho món ăn dựa trên công thức
  calculateDishNutrition(recipe: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
  }>): DishNutrition | null {
    const totalNutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {},
      minerals: {}
    };

    let totalCost = 0;
    let totalPrepTime = 0;
    let totalCookTime = 0;

    for (const ingredient of recipe) {
      const nutrition = this.getIngredientNutrition(ingredient.ingredientName);
      if (!nutrition) {
        logger.warn(`Không tìm thấy thông tin dinh dưỡng cho: ${ingredient.ingredientName}`);
        continue;
      }

      // Tính toán lượng dinh dưỡng dựa trên số lượng
      const multiplier = this.convertUnitToMultiplier(ingredient.quantity, ingredient.unit, nutrition.unit);
      
      totalNutrition.calories += nutrition.nutrition.calories * multiplier;
      totalNutrition.protein += nutrition.nutrition.protein * multiplier;
      totalNutrition.carbs += nutrition.nutrition.carbs * multiplier;
      totalNutrition.fat += nutrition.nutrition.fat * multiplier;
      totalNutrition.fiber += nutrition.nutrition.fiber * multiplier;
      totalNutrition.sugar += nutrition.nutrition.sugar * multiplier;
      totalNutrition.sodium += nutrition.nutrition.sodium * multiplier;

      // Cộng dồn vitamins và minerals
      Object.entries(nutrition.nutrition.vitamins).forEach(([key, value]) => {
        if (value) {
          totalNutrition.vitamins[key as keyof typeof totalNutrition.vitamins] = 
            (totalNutrition.vitamins[key as keyof typeof totalNutrition.vitamins] || 0) + (value * multiplier);
        }
      });

      Object.entries(nutrition.nutrition.minerals).forEach(([key, value]) => {
        if (value) {
          totalNutrition.minerals[key as keyof typeof totalNutrition.minerals] = 
            (totalNutrition.minerals[key as keyof typeof totalNutrition.minerals] || 0) + (value * multiplier);
        }
      });

      // Tính chi phí
      totalCost += nutrition.pricePerUnit * multiplier;
      
      // Ước tính thời gian chuẩn bị và nấu
      totalPrepTime += this.estimatePrepTime(nutrition.category, multiplier);
      totalCookTime += this.estimateCookTime(nutrition.category, multiplier);
    }

    // Ước tính số phần ăn (4 người)
    const servings = 4;
    const costPerServing = totalCost / servings;

    return {
      dishId: 'calculated',
      dishName: 'Món ăn tính toán',
      category: 'Món chính',
      nutrition: {
        calories: Math.round(totalNutrition.calories / servings),
        protein: Math.round(totalNutrition.protein / servings * 10) / 10,
        carbs: Math.round(totalNutrition.carbs / servings * 10) / 10,
        fat: Math.round(totalNutrition.fat / servings * 10) / 10,
        fiber: Math.round(totalNutrition.fiber / servings * 10) / 10,
        sugar: Math.round(totalNutrition.sugar / servings * 10) / 10,
        sodium: Math.round(totalNutrition.sodium / servings),
        vitamins: totalNutrition.vitamins,
        minerals: totalNutrition.minerals
      },
      estimatedCost: Math.round(costPerServing),
      difficulty: this.calculateDifficulty(recipe.length, totalPrepTime + totalCookTime),
      prepTime: Math.round(totalPrepTime),
      cookTime: Math.round(totalCookTime),
      servings
    };
  }

  // Chuyển đổi đơn vị
  private convertUnitToMultiplier(quantity: number, fromUnit: string, toUnit: string): number {
    const unitConversions: Record<string, number> = {
      'kg': 1,
      'g': 0.001,
      'cái': 0.05, // Ước tính 1 cái = 50g
      'chai': 0.5, // Ước tính 1 chai = 500ml
      'muỗng canh': 0.015, // Ước tính 1 muỗng canh = 15ml
      'muỗng cà phê': 0.005, // Ước tính 1 muỗng cà phê = 5ml
      'bó': 0.2, // Ước tính 1 bó = 200g
      'quả': 0.1 // Ước tính 1 quả = 100g
    };

    const fromMultiplier = unitConversions[fromUnit.toLowerCase()] || 1;
    const toMultiplier = unitConversions[toUnit.toLowerCase()] || 1;
    
    return quantity * fromMultiplier / toMultiplier;
  }

  // Ước tính thời gian chuẩn bị
  private estimatePrepTime(category: string, quantity: number): number {
    const baseTimes: Record<string, number> = {
      'protein': 10,
      'vegetables': 5,
      'fruits': 3,
      'grains': 2,
      'dairy': 1,
      'oils': 1,
      'spices': 1
    };

    return (baseTimes[category] || 5) * Math.min(quantity, 2); // Max 2x multiplier
  }

  // Ước tính thời gian nấu
  private estimateCookTime(category: string, quantity: number): number {
    const baseTimes: Record<string, number> = {
      'protein': 20,
      'vegetables': 8,
      'fruits': 5,
      'grains': 15,
      'dairy': 3,
      'oils': 2,
      'spices': 1
    };

    return (baseTimes[category] || 10) * Math.min(quantity, 1.5); // Max 1.5x multiplier
  }

  // Tính độ khó
  private calculateDifficulty(ingredientCount: number, totalTime: number): 'easy' | 'medium' | 'hard' {
    if (ingredientCount <= 5 && totalTime <= 30) return 'easy';
    if (ingredientCount <= 10 && totalTime <= 60) return 'medium';
    return 'hard';
  }

  // Phân tích dinh dưỡng cho kế hoạch bữa ăn
  analyzeMealPlanNutrition(mealPlan: Array<{
    day: string;
    meals: Array<{
      mealType: string;
      dish: DishNutrition;
    }>;
  }>): {
    totalNutrition: NutritionInfo;
    dailyNutrition: Array<{
      day: string;
      nutrition: NutritionInfo;
      cost: number;
    }>;
    recommendations: string[];
  } {
    const totalNutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {},
      minerals: {}
    };

    const dailyNutrition = mealPlan.map(day => {
      const dayNutrition: NutritionInfo = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        vitamins: {},
        minerals: {}
      };

      let dayCost = 0;

      day.meals.forEach(meal => {
        const nutrition = meal.dish.nutrition;
        dayNutrition.calories += nutrition.calories;
        dayNutrition.protein += nutrition.protein;
        dayNutrition.carbs += nutrition.carbs;
        dayNutrition.fat += nutrition.fat;
        dayNutrition.fiber += nutrition.fiber;
        dayNutrition.sugar += nutrition.sugar;
        dayNutrition.sodium += nutrition.sodium;

        // Cộng dồn vitamins và minerals
        Object.entries(nutrition.vitamins).forEach(([key, value]) => {
          if (value) {
            dayNutrition.vitamins[key as keyof typeof dayNutrition.vitamins] = 
              (dayNutrition.vitamins[key as keyof typeof dayNutrition.vitamins] || 0) + value;
          }
        });

        Object.entries(nutrition.minerals).forEach(([key, value]) => {
          if (value) {
            dayNutrition.minerals[key as keyof typeof dayNutrition.minerals] = 
              (dayNutrition.minerals[key as keyof typeof dayNutrition.minerals] || 0) + value;
          }
        });

        dayCost += meal.dish.estimatedCost;
      });

      // Cộng vào tổng
      totalNutrition.calories += dayNutrition.calories;
      totalNutrition.protein += dayNutrition.protein;
      totalNutrition.carbs += dayNutrition.carbs;
      totalNutrition.fat += dayNutrition.fat;
      totalNutrition.fiber += dayNutrition.fiber;
      totalNutrition.sugar += dayNutrition.sugar;
      totalNutrition.sodium += dayNutrition.sodium;

      return {
        day: day.day,
        nutrition: dayNutrition,
        cost: dayCost
      };
    });

    // Tạo khuyến nghị
    const recommendations = this.generateNutritionRecommendations(totalNutrition, mealPlan.length);

    return {
      totalNutrition,
      dailyNutrition,
      recommendations
    };
  }

  // Tạo khuyến nghị dinh dưỡng
  private generateNutritionRecommendations(totalNutrition: NutritionInfo, days: number): string[] {
    const recommendations: string[] = [];
    const avgDailyCalories = totalNutrition.calories / days;
    const avgDailyProtein = totalNutrition.protein / days;
    const avgDailyCarbs = totalNutrition.carbs / days;
    const avgDailyFat = totalNutrition.fat / days;

    // Khuyến nghị calo (2000-2500 cal/ngày cho người trưởng thành)
    if (avgDailyCalories < 1800) {
      recommendations.push('• Tăng lượng calo: Thêm món ăn giàu năng lượng như cơm, bánh mì');
    } else if (avgDailyCalories > 2800) {
      recommendations.push('• Giảm lượng calo: Chọn món ăn ít calo hơn, tăng rau củ');
    }

    // Khuyến nghị protein (50-100g/ngày)
    if (avgDailyProtein < 40) {
      recommendations.push('• Tăng protein: Thêm thịt, cá, trứng, đậu phụ');
    } else if (avgDailyProtein > 120) {
      recommendations.push('• Giảm protein: Cân bằng với rau củ và tinh bột');
    }

    // Khuyến nghị carbs (200-300g/ngày)
    if (avgDailyCarbs < 150) {
      recommendations.push('• Tăng carbohydrate: Thêm cơm, bánh mì, khoai tây');
    } else if (avgDailyCarbs > 400) {
      recommendations.push('• Giảm carbohydrate: Chọn món ăn ít tinh bột');
    }

    // Khuyến nghị chất béo (50-80g/ngày)
    if (avgDailyFat < 30) {
      recommendations.push('• Tăng chất béo lành mạnh: Dùng dầu oliu, bơ, các loại hạt');
    } else if (avgDailyFat > 100) {
      recommendations.push('• Giảm chất béo: Hạn chế dầu mỡ, chọn phương pháp nấu ít dầu');
    }

    // Khuyến nghị chung
    if (totalNutrition.fiber / days < 25) {
      recommendations.push('• Tăng chất xơ: Ăn nhiều rau củ, trái cây, ngũ cốc nguyên hạt');
    }

    if (totalNutrition.sodium / days > 2300) {
      recommendations.push('• Giảm muối: Hạn chế nước mắm, muối, đồ chế biến sẵn');
    }

    return recommendations;
  }

  // Lấy tất cả nguyên liệu có thông tin dinh dưỡng
  getAllIngredients(): IngredientNutrition[] {
    return Object.values(NUTRITION_DATABASE);
  }

  // Tìm nguyên liệu theo danh mục
  getIngredientsByCategory(category: string): IngredientNutrition[] {
    return Object.values(NUTRITION_DATABASE).filter(ing => ing.category === category);
  }
}

// Export singleton instance
export const nutritionService = NutritionService.getInstance();
