import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { nutritionService, DishNutrition } from '@/lib/nutrition-service';
import { supabase } from '@/lib/supabase';

interface AdvancedMealPlanRequest {
  preferences: {
    familySize: number;
    budget: number; // VND per week
    dietaryRestrictions: string[];
    favoriteCuisines: string[];
    healthGoals: string[]; // 'weight_loss', 'muscle_gain', 'maintenance', 'diabetes', 'heart_health'
    mealFrequency: number; // meals per day
    cookingTime: 'quick' | 'moderate' | 'extensive'; // max cooking time per meal
  };
  duration: number; // days
}

interface MealPlanResponse {
  success: boolean;
  mealPlan: Array<{
    day: string;
    date: string;
    meals: Array<{
      mealType: string;
      dish: DishNutrition;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }>;
    dailyNutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      cost: number;
    };
  }>;
  analysis: {
    totalCost: number;
    avgDailyCost: number;
    totalNutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    recommendations: string[];
    healthScore: number; // 0-100
  };
  shoppingList: Array<{
    ingredient: string;
    totalQuantity: number;
    unit: string;
    estimatedCost: number;
    category: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdvancedMealPlanRequest = await request.json();
    const { preferences, duration } = body;

    // Validate input
    if (!preferences || !duration || duration < 1 || duration > 30) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Get available dishes and recipes from database
    const dishesData = await getDishesWithRecipes();
    if (!dishesData || dishesData.length === 0) {
      return NextResponse.json(
        { 
          error: 'No dishes available',
          message: 'Không có món ăn nào trong hệ thống. Vui lòng thêm món ăn trước.'
        },
        { status: 404 }
      );
    }

    // Calculate nutrition for all dishes
    const dishesWithNutrition = await calculateDishesNutrition(dishesData);

    // Generate meal plan
    const mealPlan = await generateAdvancedMealPlan(
      dishesWithNutrition,
      preferences,
      duration
    );

    // Analyze nutrition and cost
    const analysis = analyzeMealPlan(mealPlan, preferences);

    // Generate shopping list
    const shoppingList = generateShoppingList(mealPlan, preferences.familySize);

    const response: MealPlanResponse = {
      success: true,
      mealPlan,
      analysis,
      shoppingList
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Advanced Meal Planning API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi tạo kế hoạch bữa ăn nâng cao.'
      },
      { status: 500 }
    );
  }
}

// Lấy món ăn với công thức từ database
async function getDishesWithRecipes() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  const client = supabase!;

  const { data: dishes, error: dishesError } = await client
    .from("mon_an")
    .select(`
      id,
      ten_mon_an,
      loai_mon_an,
      mo_ta
    `)
    .order("ten_mon_an", { ascending: true });

  if (dishesError) throw dishesError;

  // Lấy công thức cho từng món ăn
  const dishesWithRecipes = await Promise.all(
    (dishes || []).map(async (dish) => {
      const { data: recipes, error: recipesError } = await client
        .from("cong_thuc_mon_an")
        .select(`
          so_luong,
          don_vi_tinh,
          nguyen_lieu:ma_nguyen_lieu (
            ten_nguyen_lieu
          )
        `)
        .eq("ma_mon_an", dish.id);

      if (recipesError) {
        logger.warn(`Error fetching recipes for dish ${dish.id}:`, recipesError);
        return null;
      }

      return {
        ...dish,
        recipe: (recipes || []).map(recipe => ({
          ingredientName: recipe.nguyen_lieu?.[0]?.ten_nguyen_lieu || 'Unknown',
          quantity: recipe.so_luong || 1,
          unit: recipe.don_vi_tinh || 'cái'
        }))
      };
    })
  );

  return dishesWithRecipes.filter(dish => dish !== null && dish.recipe.length > 0);
}

// Tính toán dinh dưỡng cho các món ăn
async function calculateDishesNutrition(dishes: any[]): Promise<DishNutrition[]> {
  const dishesWithNutrition: DishNutrition[] = [];

  for (const dish of dishes) {
    const nutrition = nutritionService.calculateDishNutrition(dish.recipe);
    if (nutrition) {
      dishesWithNutrition.push({
        ...nutrition,
        dishId: dish.id,
        dishName: dish.ten_mon_an,
        category: dish.loai_mon_an || 'Món chính'
      });
    }
  }

  return dishesWithNutrition;
}

// Tạo kế hoạch bữa ăn nâng cao
async function generateAdvancedMealPlan(
  dishes: DishNutrition[],
  preferences: AdvancedMealPlanRequest['preferences'],
  duration: number
): Promise<MealPlanResponse['mealPlan']> {
  const mealPlan: MealPlanResponse['mealPlan'] = [];
  const mealTypes = ['Sáng', 'Trưa', 'Tối'];
  
  // Filter dishes based on preferences
  let filteredDishes = dishes;

  // Filter by cooking time
  if (preferences.cookingTime === 'quick') {
    filteredDishes = dishes.filter(dish => dish.prepTime + dish.cookTime <= 30);
  } else if (preferences.cookingTime === 'moderate') {
    filteredDishes = dishes.filter(dish => dish.prepTime + dish.cookTime <= 60);
  }

  // Filter by dietary restrictions
  if (preferences.dietaryRestrictions.includes('vegetarian')) {
    filteredDishes = filteredDishes.filter(dish => 
      !dish.dishName.toLowerCase().includes('thịt') &&
      !dish.dishName.toLowerCase().includes('cá') &&
      !dish.dishName.toLowerCase().includes('tôm') &&
      !dish.dishName.toLowerCase().includes('gà')
    );
  }

  if (preferences.dietaryRestrictions.includes('low_sodium')) {
    filteredDishes = filteredDishes.filter(dish => dish.nutrition.sodium <= 500);
  }

  if (preferences.dietaryRestrictions.includes('low_carb')) {
    filteredDishes = filteredDishes.filter(dish => dish.nutrition.carbs <= 30);
  }

  // Generate meal plan for each day
  for (let day = 0; day < duration; day++) {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + day);
    
    const dayMeals = mealTypes.map(mealType => {
      // Select appropriate dish for meal type
      let suitableDishes = filteredDishes;
      
      if (mealType === 'Sáng') {
        suitableDishes = filteredDishes.filter(dish => 
          dish.dishName.toLowerCase().includes('phở') ||
          dish.dishName.toLowerCase().includes('bún') ||
          dish.dishName.toLowerCase().includes('cháo') ||
          dish.dishName.toLowerCase().includes('bánh mì') ||
          dish.dishName.toLowerCase().includes('xôi')
        );
      } else if (mealType === 'Trưa') {
        suitableDishes = filteredDishes.filter(dish => 
          dish.dishName.toLowerCase().includes('cơm') ||
          dish.dishName.toLowerCase().includes('thịt') ||
          dish.dishName.toLowerCase().includes('cá') ||
          dish.dishName.toLowerCase().includes('canh')
        );
      } else if (mealType === 'Tối') {
        suitableDishes = filteredDishes.filter(dish => 
          dish.dishName.toLowerCase().includes('lẩu') ||
          dish.dishName.toLowerCase().includes('nướng') ||
          dish.dishName.toLowerCase().includes('xào') ||
          dish.dishName.toLowerCase().includes('kho')
        );
      }

      // If no specific dishes for meal type, use all dishes
      if (suitableDishes.length === 0) {
        suitableDishes = filteredDishes;
      }

      // Select dish with rotation
      const dishIndex = (day * 3 + mealTypes.indexOf(mealType)) % suitableDishes.length;
      const selectedDish = suitableDishes[dishIndex];

      return {
        mealType,
        dish: selectedDish,
        nutrition: {
          calories: selectedDish.nutrition.calories,
          protein: selectedDish.nutrition.protein,
          carbs: selectedDish.nutrition.carbs,
          fat: selectedDish.nutrition.fat
        }
      };
    });

    // Calculate daily nutrition
    const dailyNutrition = dayMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.nutrition.calories,
      protein: acc.protein + meal.nutrition.protein,
      carbs: acc.carbs + meal.nutrition.carbs,
      fat: acc.fat + meal.nutrition.fat,
      cost: acc.cost + meal.dish.estimatedCost
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });

    mealPlan.push({
      day: `Ngày ${day + 1}`,
      date: currentDate.toISOString().split('T')[0],
      meals: dayMeals,
      dailyNutrition
    });
  }

  return mealPlan;
}

// Phân tích kế hoạch bữa ăn
function analyzeMealPlan(
  mealPlan: MealPlanResponse['mealPlan'],
  preferences: AdvancedMealPlanRequest['preferences']
): MealPlanResponse['analysis'] {
  const totalCost = mealPlan.reduce((sum, day) => sum + day.dailyNutrition.cost, 0);
  const avgDailyCost = totalCost / mealPlan.length;

  const totalNutrition = mealPlan.reduce((acc, day) => ({
    calories: acc.calories + day.dailyNutrition.calories,
    protein: acc.protein + day.dailyNutrition.protein,
    carbs: acc.carbs + day.dailyNutrition.carbs,
    fat: acc.fat + day.dailyNutrition.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Calculate health score (0-100)
  const healthScore = calculateHealthScore(totalNutrition, preferences);

  // Generate recommendations
  const recommendations = generateRecommendations(totalNutrition, totalCost, preferences);

  return {
    totalCost,
    avgDailyCost,
    totalNutrition,
    recommendations,
    healthScore
  };
}

// Tính điểm sức khỏe
function calculateHealthScore(
  nutrition: { calories: number; protein: number; carbs: number; fat: number },
  preferences: AdvancedMealPlanRequest['preferences']
): number {
  let score = 0;
  const days = 7; // Assume weekly analysis
  const dailyCalories = nutrition.calories / days;
  const dailyProtein = nutrition.protein / days;
  const dailyCarbs = nutrition.carbs / days;
  const dailyFat = nutrition.fat / days;

  // Calorie score (30 points)
  if (dailyCalories >= 1800 && dailyCalories <= 2500) {
    score += 30;
  } else if (dailyCalories >= 1500 && dailyCalories <= 3000) {
    score += 20;
  } else {
    score += 10;
  }

  // Protein score (25 points)
  if (dailyProtein >= 50 && dailyProtein <= 100) {
    score += 25;
  } else if (dailyProtein >= 40 && dailyProtein <= 120) {
    score += 15;
  } else {
    score += 5;
  }

  // Carb score (25 points)
  if (dailyCarbs >= 200 && dailyCarbs <= 300) {
    score += 25;
  } else if (dailyCarbs >= 150 && dailyCarbs <= 400) {
    score += 15;
  } else {
    score += 5;
  }

  // Fat score (20 points)
  if (dailyFat >= 50 && dailyFat <= 80) {
    score += 20;
  } else if (dailyFat >= 30 && dailyFat <= 100) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.min(score, 100);
}

// Tạo khuyến nghị
function generateRecommendations(
  nutrition: { calories: number; protein: number; carbs: number; fat: number },
  totalCost: number,
  preferences: AdvancedMealPlanRequest['preferences']
): string[] {
  const recommendations: string[] = [];
  const days = 7;
  const dailyCalories = nutrition.calories / days;
  const dailyProtein = nutrition.protein / days;
  const dailyCarbs = nutrition.carbs / days;
  const dailyFat = nutrition.fat / days;

  // Budget recommendations
  const weeklyBudget = preferences.budget;
  if (totalCost > weeklyBudget * 1.1) {
    recommendations.push(`💰 Ngân sách vượt quá: Chi phí ${totalCost.toLocaleString()}VND/tuần, vượt ngân sách ${weeklyBudget.toLocaleString()}VND`);
  } else if (totalCost < weeklyBudget * 0.8) {
    recommendations.push(`💰 Tiết kiệm ngân sách: Chi phí ${totalCost.toLocaleString()}VND/tuần, tiết kiệm được ${(weeklyBudget - totalCost).toLocaleString()}VND`);
  }

  // Nutrition recommendations
  if (dailyCalories < 1800) {
    recommendations.push('🍽️ Tăng lượng calo: Thêm món ăn giàu năng lượng');
  } else if (dailyCalories > 2800) {
    recommendations.push('🍽️ Giảm lượng calo: Chọn món ăn ít calo hơn');
  }

  if (dailyProtein < 50) {
    recommendations.push('🥩 Tăng protein: Thêm thịt, cá, trứng');
  } else if (dailyProtein > 120) {
    recommendations.push('🥩 Cân bằng protein: Tăng rau củ và tinh bột');
  }

  if (dailyCarbs < 200) {
    recommendations.push('🍚 Tăng carbohydrate: Thêm cơm, bánh mì');
  } else if (dailyCarbs > 400) {
    recommendations.push('🍚 Giảm carbohydrate: Chọn món ít tinh bột');
  }

  if (dailyFat < 50) {
    recommendations.push('🥑 Tăng chất béo lành mạnh: Dùng dầu oliu, các loại hạt');
  } else if (dailyFat > 100) {
    recommendations.push('🥑 Giảm chất béo: Hạn chế dầu mỡ');
  }

  // Health goals recommendations
  if (preferences.healthGoals.includes('weight_loss')) {
    recommendations.push('⚖️ Mục tiêu giảm cân: Tăng rau củ, giảm tinh bột');
  }

  if (preferences.healthGoals.includes('muscle_gain')) {
    recommendations.push('💪 Mục tiêu tăng cơ: Tăng protein, tập luyện đều đặn');
  }

  if (preferences.healthGoals.includes('diabetes')) {
    recommendations.push('🩺 Tiểu đường: Kiểm soát carbohydrate, ăn đều đặn');
  }

  if (preferences.healthGoals.includes('heart_health')) {
    recommendations.push('❤️ Sức khỏe tim mạch: Giảm muối, tăng omega-3');
  }

  return recommendations;
}

// Tạo danh sách mua sắm
function generateShoppingList(
  mealPlan: MealPlanResponse['mealPlan'],
  familySize: number
): MealPlanResponse['shoppingList'] {
  const ingredientMap = new Map<string, { quantity: number; unit: string; cost: number; category: string }>();

  // Aggregate ingredients from all meals
  mealPlan.forEach(day => {
    day.meals.forEach(meal => {
      // This is a simplified version - in reality, we'd need to get the actual recipe
      // For now, we'll create a basic shopping list based on common ingredients
      const commonIngredients = [
        { name: 'Gạo', quantity: 2, unit: 'kg', cost: 30000, category: 'grains' },
        { name: 'Thịt ba chỉ', quantity: 1, unit: 'kg', cost: 120000, category: 'protein' },
        { name: 'Cá basa', quantity: 1, unit: 'kg', cost: 60000, category: 'protein' },
        { name: 'Rau muống', quantity: 1, unit: 'kg', cost: 15000, category: 'vegetables' },
        { name: 'Cà chua', quantity: 1, unit: 'kg', cost: 25000, category: 'vegetables' },
        { name: 'Hành tây', quantity: 0.5, unit: 'kg', cost: 10000, category: 'vegetables' },
        { name: 'Tỏi', quantity: 0.2, unit: 'kg', cost: 8000, category: 'vegetables' },
        { name: 'Nước mắm', quantity: 1, unit: 'chai', cost: 35000, category: 'spices' },
        { name: 'Dầu ăn', quantity: 1, unit: 'chai', cost: 25000, category: 'oils' }
      ];

      commonIngredients.forEach(ingredient => {
        const multiplier = familySize / 4; // Adjust for family size
        const totalQuantity = ingredient.quantity * multiplier;
        const totalCost = ingredient.cost * multiplier;

        if (ingredientMap.has(ingredient.name)) {
          const existing = ingredientMap.get(ingredient.name)!;
          existing.quantity += totalQuantity;
          existing.cost += totalCost;
        } else {
          ingredientMap.set(ingredient.name, {
            quantity: totalQuantity,
            unit: ingredient.unit,
            cost: totalCost,
            category: ingredient.category
          });
        }
      });
    });
  });

  return Array.from(ingredientMap.entries()).map(([ingredient, data]) => ({
    ingredient,
    totalQuantity: Math.round(data.quantity * 10) / 10,
    unit: data.unit,
    estimatedCost: Math.round(data.cost),
    category: data.category
  }));
}


