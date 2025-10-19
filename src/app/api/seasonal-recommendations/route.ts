import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { seasonalService, WeatherInfo } from '@/lib/seasonal-service';

interface SeasonalRecommendationRequest {
  weather?: WeatherInfo;
  healthCondition?: string;
  preferences?: {
    category?: string;
    season?: string;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SeasonalRecommendationRequest = await request.json();
    const { weather, healthCondition, preferences } = body;

    // Generate smart recommendations
    const result = seasonalService.generateSmartRecommendations(weather);

    // Filter by health condition if provided
    let recommendations = result.recommendations;
    if (healthCondition && weather) {
      recommendations = seasonalService.getDishesForHealthCondition(healthCondition, weather);
    }

    // Filter by preferences if provided
    if (preferences) {
      if (preferences.category) {
        recommendations = recommendations.filter(dish => dish.category === preferences.category);
      }
      const { season } = preferences;
      if (season) {
        recommendations = recommendations.filter(dish => dish.season.includes(season));
      }
      if (preferences.temperature) {
        recommendations = recommendations.filter(dish => 
          preferences.temperature! >= dish.temperatureRange.min && 
          preferences.temperature! <= dish.temperatureRange.max
        );
      }
    }

    // Format response
    const response = {
      success: true,
      weatherInfo: result.weatherInfo,
      recommendations: recommendations.slice(0, 8), // Limit to 8 recommendations
      suggestions: result.suggestions,
      totalFound: recommendations.length,
      analysis: {
        season: result.weatherInfo.season,
        temperature: result.weatherInfo.temperature,
        condition: result.weatherInfo.condition,
        humidity: result.weatherInfo.humidity
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Seasonal Recommendation API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi tạo gợi ý theo mùa.'
      },
      { status: 500 }
    );
  }
}

// GET endpoint để lấy thông tin thời tiết hiện tại
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'weather':
        const weather = seasonalService.getEstimatedWeather();
        return NextResponse.json({
          success: true,
          weather
        });

      case 'season':
        const season = seasonalService.getCurrentSeason();
        return NextResponse.json({
          success: true,
          season
        });

      case 'dishes':
        const seasonParam = searchParams.get('season');
        const categoryParam = searchParams.get('category');
        
        let dishes;
        if (seasonParam && categoryParam) {
          dishes = seasonalService.getDishesByCategoryAndSeason(categoryParam, seasonParam);
        } else if (seasonParam) {
          dishes = seasonalService.getDishesBySeason(seasonParam);
        } else {
          dishes = seasonalService.getAllSeasonalDishes();
        }

        return NextResponse.json({
          success: true,
          dishes: dishes.slice(0, 20) // Limit to 20 dishes
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Seasonal Recommendation GET API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi lấy thông tin theo mùa.'
      },
      { status: 500 }
    );
  }
}


