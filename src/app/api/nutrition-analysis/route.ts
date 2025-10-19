import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { nutritionService } from '@/lib/nutrition-service';

interface NutritionAnalysisRequest {
  recipe: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
  }>;
  dishName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NutritionAnalysisRequest = await request.json();
    const { recipe, dishName } = body;

    // Validate input
    if (!recipe || recipe.length === 0) {
      return NextResponse.json(
        { error: 'Recipe is required' },
        { status: 400 }
      );
    }

    // Calculate nutrition
    const nutrition = nutritionService.calculateDishNutrition(recipe);
    
    if (!nutrition) {
      return NextResponse.json(
        { 
          error: 'Unable to calculate nutrition',
          message: 'Không thể tính toán dinh dưỡng cho công thức này'
        },
        { status: 400 }
      );
    }

    // Update dish name if provided
    if (dishName) {
      nutrition.dishName = dishName;
    }

    // Calculate health score
    const healthScore = calculateHealthScore(nutrition.nutrition);
    
    // Generate recommendations
    const recommendations = generateNutritionRecommendations(nutrition.nutrition);

    const response = {
      success: true,
      nutrition: nutrition,
      healthScore,
      recommendations,
      analysis: {
        calories: nutrition.nutrition.calories,
        protein: nutrition.nutrition.protein,
        carbs: nutrition.nutrition.carbs,
        fat: nutrition.nutrition.fat,
        fiber: nutrition.nutrition.fiber,
        sodium: nutrition.nutrition.sodium,
        vitamins: nutrition.nutrition.vitamins,
        minerals: nutrition.nutrition.minerals
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Nutrition Analysis API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi phân tích dinh dưỡng.'
      },
      { status: 500 }
    );
  }
}

// Calculate health score based on nutrition values
function calculateHealthScore(nutrition: any): number {
  let score = 0;
  let factors = 0;

  // Calorie score (20 points)
  if (nutrition.calories >= 400 && nutrition.calories <= 800) {
    score += 20;
  } else if (nutrition.calories >= 300 && nutrition.calories <= 1000) {
    score += 15;
  } else {
    score += 5;
  }
  factors++;

  // Protein score (20 points)
  if (nutrition.protein >= 15 && nutrition.protein <= 40) {
    score += 20;
  } else if (nutrition.protein >= 10 && nutrition.protein <= 50) {
    score += 15;
  } else {
    score += 5;
  }
  factors++;

  // Carb score (20 points)
  if (nutrition.carbs >= 30 && nutrition.carbs <= 100) {
    score += 20;
  } else if (nutrition.carbs >= 20 && nutrition.carbs <= 120) {
    score += 15;
  } else {
    score += 5;
  }
  factors++;

  // Fat score (20 points)
  if (nutrition.fat >= 10 && nutrition.fat <= 35) {
    score += 20;
  } else if (nutrition.fat >= 5 && nutrition.fat <= 45) {
    score += 15;
  } else {
    score += 5;
  }
  factors++;

  // Fiber score (10 points)
  if (nutrition.fiber >= 4) {
    score += 10;
  } else if (nutrition.fiber >= 2) {
    score += 5;
  }
  factors++;

  // Sodium score (10 points)
  if (nutrition.sodium <= 600) {
    score += 10;
  } else if (nutrition.sodium <= 1000) {
    score += 5;
  }
  factors++;

  return Math.round(score / factors);
}

// Generate nutrition recommendations
function generateNutritionRecommendations(nutrition: any): string[] {
  const recommendations: string[] = [];

  // Calorie recommendations
  if (nutrition.calories < 400) {
    recommendations.push('Tăng lượng calo bằng cách thêm tinh bột hoặc chất béo lành mạnh');
  } else if (nutrition.calories > 800) {
    recommendations.push('Giảm lượng calo bằng cách giảm tinh bột hoặc chất béo');
  }

  // Protein recommendations
  if (nutrition.protein < 15) {
    recommendations.push('Tăng protein bằng cách thêm thịt, cá, trứng hoặc đậu');
  } else if (nutrition.protein > 40) {
    recommendations.push('Cân bằng protein với rau củ và tinh bột');
  }

  // Carb recommendations
  if (nutrition.carbs < 30) {
    recommendations.push('Tăng carbohydrate bằng cách thêm cơm, bánh mì hoặc khoai tây');
  } else if (nutrition.carbs > 100) {
    recommendations.push('Giảm carbohydrate, chọn món ít tinh bột');
  }

  // Fat recommendations
  if (nutrition.fat < 10) {
    recommendations.push('Tăng chất béo lành mạnh bằng dầu oliu, bơ hoặc các loại hạt');
  } else if (nutrition.fat > 35) {
    recommendations.push('Giảm chất béo, chọn phương pháp nấu ít dầu');
  }

  // Fiber recommendations
  if (nutrition.fiber < 4) {
    recommendations.push('Tăng chất xơ bằng cách thêm rau củ và trái cây');
  }

  // Sodium recommendations
  if (nutrition.sodium > 1000) {
    recommendations.push('Giảm muối và gia vị có natri cao');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Món ăn này có dinh dưỡng cân bằng tốt!');
  }

  return recommendations;
}


