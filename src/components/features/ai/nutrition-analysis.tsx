"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Heart, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Users
} from "lucide-react";
import { nutritionService, NutritionInfo, DishNutrition } from "@/lib/nutrition-service";
import { logger } from "@/lib/logger";

interface NutritionAnalysisProps {
  dishId?: string;
  dishName?: string;
  recipe?: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
  }>;
  onAnalysisComplete?: (analysis: DishNutrition) => void;
}

interface NutritionComparison {
  calories: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  protein: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  carbs: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  fat: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  fiber: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  sodium: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
}

export default function NutritionAnalysis({ 
  dishId, 
  dishName, 
  recipe, 
  onAnalysisComplete 
}: NutritionAnalysisProps) {
  const [analysis, setAnalysis] = useState<DishNutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (recipe && recipe.length > 0) {
      analyzeNutrition();
    }
  }, [recipe]);

  const analyzeNutrition = async () => {
    if (!recipe || recipe.length === 0) {
      setError('Không có công thức để phân tích');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nutrition = nutritionService.calculateDishNutrition(recipe);
      if (nutrition) {
        setAnalysis(nutrition);
        if (onAnalysisComplete) {
          onAnalysisComplete(nutrition);
        }
      } else {
        setError('Không thể tính toán dinh dưỡng cho món ăn này');
      }
    } catch (error) {
      logger.error('Error analyzing nutrition:', error);
      setError('Có lỗi xảy ra khi phân tích dinh dưỡng');
    } finally {
      setLoading(false);
    }
  };

  const getNutritionComparison = (): NutritionComparison => {
    if (!analysis) return {} as NutritionComparison;

    const nutrition = analysis.nutrition;
    
    return {
      calories: {
        current: nutrition.calories,
        recommended: 600, // Average per meal
        status: nutrition.calories < 400 ? 'low' : nutrition.calories > 800 ? 'high' : 'good'
      },
      protein: {
        current: nutrition.protein,
        recommended: 25, // grams per meal
        status: nutrition.protein < 15 ? 'low' : nutrition.protein > 40 ? 'high' : 'good'
      },
      carbs: {
        current: nutrition.carbs,
        recommended: 60, // grams per meal
        status: nutrition.carbs < 30 ? 'low' : nutrition.carbs > 100 ? 'high' : 'good'
      },
      fat: {
        current: nutrition.fat,
        recommended: 20, // grams per meal
        status: nutrition.fat < 10 ? 'low' : nutrition.fat > 35 ? 'high' : 'good'
      },
      fiber: {
        current: nutrition.fiber,
        recommended: 8, // grams per meal
        status: nutrition.fiber < 4 ? 'low' : nutrition.fiber > 15 ? 'high' : 'good'
      },
      sodium: {
        current: nutrition.sodium,
        recommended: 600, // mg per meal
        status: nutrition.sodium < 300 ? 'low' : nutrition.sodium > 1000 ? 'high' : 'good'
      }
    };
  };

  const getStatusIcon = (status: 'low' | 'good' | 'high') => {
    switch (status) {
      case 'low':
        return <TrendingDown className="w-4 h-4 text-yellow-500" />;
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'high':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'low' | 'good' | 'high') => {
    switch (status) {
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getHealthScore = (): number => {
    if (!analysis) return 0;
    
    const comparison = getNutritionComparison();
    let score = 0;
    let factors = 0;

    Object.values(comparison).forEach((item: any) => {
      if (item.status === 'good') score += 20;
      else if (item.status === 'low') score += 10;
      else score += 5;
      factors++;
    });

    return Math.round(score / factors);
  };

  const getHealthRecommendations = (): string[] => {
    if (!analysis) return [];
    
    const recommendations: string[] = [];
    const comparison = getNutritionComparison();

    if (comparison.calories?.status === 'low') {
      recommendations.push('Tăng lượng calo bằng cách thêm tinh bột hoặc chất béo lành mạnh');
    } else if (comparison.calories?.status === 'high') {
      recommendations.push('Giảm lượng calo bằng cách giảm tinh bột hoặc chất béo');
    }

    if (comparison.protein?.status === 'low') {
      recommendations.push('Tăng protein bằng cách thêm thịt, cá, trứng hoặc đậu');
    } else if (comparison.protein?.status === 'high') {
      recommendations.push('Cân bằng protein với rau củ và tinh bột');
    }

    if (comparison.carbs?.status === 'low') {
      recommendations.push('Tăng carbohydrate bằng cách thêm cơm, bánh mì hoặc khoai tây');
    } else if (comparison.carbs?.status === 'high') {
      recommendations.push('Giảm carbohydrate, chọn món ít tinh bột');
    }

    if (comparison.fat?.status === 'low') {
      recommendations.push('Tăng chất béo lành mạnh bằng dầu oliu, bơ hoặc các loại hạt');
    } else if (comparison.fat?.status === 'high') {
      recommendations.push('Giảm chất béo, chọn phương pháp nấu ít dầu');
    }

    if (comparison.fiber?.status === 'low') {
      recommendations.push('Tăng chất xơ bằng cách thêm rau củ và trái cây');
    }

    if (comparison.sodium?.status === 'high') {
      recommendations.push('Giảm muối và gia vị có natri cao');
    }

    return recommendations;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Đang phân tích dinh dưỡng...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center text-red-700">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Chưa có dữ liệu để phân tích dinh dưỡng</p>
          <p className="text-sm">Thêm công thức để bắt đầu phân tích</p>
        </div>
      </Card>
    );
  }

  const comparison = getNutritionComparison();
  const healthScore = getHealthScore();
  const recommendations = getHealthRecommendations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            📊 Phân tích dinh dưỡng
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {dishName || analysis.dishName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{healthScore}</div>
            <div className="text-xs text-gray-500">Điểm sức khỏe</div>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`}
                className="text-blue-600"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Nutrition Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-orange-500 mr-1" />
              <span className="text-sm font-medium">Calo</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {analysis.nutrition.calories}
            </div>
            <div className="text-xs text-gray-500">kcal</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-blue-500 mr-1" />
              <span className="text-sm font-medium">Protein</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {analysis.nutrition.protein}g
            </div>
            <div className="text-xs text-gray-500">grams</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-5 h-5 text-green-500 mr-1" />
              <span className="text-sm font-medium">Carb</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {analysis.nutrition.carbs}g
            </div>
            <div className="text-xs text-gray-500">grams</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Heart className="w-5 h-5 text-red-500 mr-1" />
              <span className="text-sm font-medium">Chất béo</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {analysis.nutrition.fat}g
            </div>
            <div className="text-xs text-gray-500">grams</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Phân tích chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(comparison).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(value.status)}
                  <div>
                    <div className="font-medium capitalize">
                      {key === 'calories' ? 'Calo' :
                       key === 'protein' ? 'Protein' :
                       key === 'carbs' ? 'Carbohydrate' :
                       key === 'fat' ? 'Chất béo' :
                       key === 'fiber' ? 'Chất xơ' :
                       key === 'sodium' ? 'Natri' : key}
                    </div>
                    <div className="text-sm text-gray-500">
                      Khuyến nghị: {value.recommended}
                      {key === 'calories' ? ' kcal' :
                       key === 'sodium' ? ' mg' : 'g'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {value.current}
                    {key === 'calories' ? ' kcal' :
                     key === 'sodium' ? ' mg' : 'g'}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(value.status)}`}>
                    {value.status === 'low' ? 'Thấp' :
                     value.status === 'good' ? 'Tốt' : 'Cao'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium">Thời gian</span>
            </div>
            <div className="text-lg font-bold">
              {analysis.prepTime + analysis.cookTime} phút
            </div>
            <div className="text-xs text-gray-500">
              Chuẩn bị: {analysis.prepTime}p, Nấu: {analysis.cookTime}p
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Users className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium">Phần ăn</span>
            </div>
            <div className="text-lg font-bold">{analysis.servings}</div>
            <div className="text-xs text-gray-500">người</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Target className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium">Độ khó</span>
            </div>
            <div className="text-lg font-bold capitalize">{analysis.difficulty}</div>
            <div className="text-xs text-gray-500">
              {analysis.difficulty === 'easy' ? 'Dễ' :
               analysis.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Khuyến nghị dinh dưỡng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
        </Button>
        <Button
          onClick={() => {
            const nutritionText = `
Phân tích dinh dưỡng - ${analysis.dishName}

Calo: ${analysis.nutrition.calories} kcal
Protein: ${analysis.nutrition.protein}g
Carbohydrate: ${analysis.nutrition.carbs}g
Chất béo: ${analysis.nutrition.fat}g
Chất xơ: ${analysis.nutrition.fiber}g
Natri: ${analysis.nutrition.sodium}mg

Điểm sức khỏe: ${healthScore}/100
Thời gian: ${analysis.prepTime + analysis.cookTime} phút
Phần ăn: ${analysis.servings} người
            `.trim();
            navigator.clipboard.writeText(nutritionText);
          }}
        >
          Sao chép phân tích
        </Button>
      </div>

      {/* Detailed Nutrition Info */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin dinh dưỡng đầy đủ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vitamins */}
              <div>
                <h4 className="font-semibold mb-3">Vitamin</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.nutrition.vitamins).map(([vitamin, value]) => (
                    value && (
                      <div key={vitamin} className="flex justify-between">
                        <span className="text-sm capitalize">
                          {vitamin.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm font-medium">
                          {value}
                          {vitamin.includes('vitaminA') || vitamin.includes('vitaminD') ? ' IU' :
                           vitamin.includes('folate') || vitamin.includes('vitaminK') ? ' mcg' : ' mg'}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Minerals */}
              <div>
                <h4 className="font-semibold mb-3">Khoáng chất</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.nutrition.minerals).map(([mineral, value]) => (
                    value && (
                      <div key={mineral} className="flex justify-between">
                        <span className="text-sm capitalize">
                          {mineral.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm font-medium">{value} mg</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


