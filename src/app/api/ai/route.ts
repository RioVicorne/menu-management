import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { aiService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let response;

    switch (type) {
      case 'suggest-dishes':
        response = await aiService.suggestDishesFromIngredients(data.ingredients || []);
        break;
      
      case 'weekly-plan':
        response = await aiService.createWeeklyMealPlan(data.preferences || {});
        break;
      
      case 'advanced-meal-plan':
        response = await aiService.createAdvancedMealPlan(data.preferences || {});
        break;
      
      case 'seasonal-recommendations':
        response = await aiService.suggestSeasonalDishes(data.preferences || {});
        break;
      
      case 'special-occasions':
        response = await aiService.createSpecialOccasionMenu(data.preferences || {});
        break;
      
      case 'shopping-list':
        response = await aiService.createSmartShoppingList(
          data.menuItems || [],
          data.currentInventory || []
        );
        break;
      
      case 'generate-recipe':
        response = await aiService.generateRecipe(
          data.dishName || '',
          data.ingredients || []
        );
        break;
      
      case 'chat':
        response = await aiService.chatAboutMenuManagement(
          data.message || '',
          data.context || {}
        );
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('AI API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        content: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.'
      },
      { status: 500 }
    );
  }
}
