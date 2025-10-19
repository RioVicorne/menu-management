"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChefHat, 
  Calendar, 
  ShoppingCart, 
  BookOpen, 
  Target,
  Sparkles,
  Loader2,
  Lightbulb,
  CheckCircle,
  Brain
} from 'lucide-react';
import { getAllIngredients, getMenuItems } from '@/lib/api';
import { logger } from "@/lib/logger";

interface AIQuickActionsProps {
  selectedDate?: string;
  onDishSuggestion?: (dishes: string[]) => void;
  onShoppingListGenerated?: (items: string[]) => void;
  onMealPlanCreated?: (plan: unknown) => void;
}

export default function AIQuickActions({ 
  selectedDate, 
  onDishSuggestion, 
  onShoppingListGenerated, 
  onMealPlanCreated 
}: AIQuickActionsProps) {
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [currentMenu, setCurrentMenu] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  // Load data for AI context
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load available ingredients
        const ingredients = await getAllIngredients();
        const ingredientNames = ingredients
          .filter(ing => Number(ing.ton_kho_so_luong || 0) > 0 || Number(ing.ton_kho_khoi_luong || 0) > 0)
          .map(ing => String(ing.ten_nguyen_lieu || ''))
          .filter(name => name.length > 0);
        setAvailableIngredients(ingredientNames);

        // Load current menu if date is selected
        if (selectedDate) {
          const menuItems = await getMenuItems(selectedDate);
          const dishNames = menuItems.map(item => String(item.ten_mon_an || ''));
          setCurrentMenu(dishNames);
        }
      } catch (error) {
        logger.error('Error loading data for AI:', error);
      }
    };

    loadData();
  }, [selectedDate]);

  const callAI = async (type: string, data: unknown) => {
    setLoading(type);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      });

      const result = await response.json();
      setLastResult({ type, ...result });

      // Call appropriate callback
      switch (type) {
        case 'suggest-dishes':
          if (onDishSuggestion && result.suggestions) {
            onDishSuggestion(result.suggestions);
          }
          break;
        case 'shopping-list':
          if (onShoppingListGenerated && result.suggestions) {
            onShoppingListGenerated(result.suggestions);
          }
          break;
        case 'weekly-plan':
          if (onMealPlanCreated) {
            onMealPlanCreated(result);
          }
          break;
      }

      return result;
    } catch (error) {
      logger.error('Error calling AI:', error);
      return { error: 'Có lỗi xảy ra khi gọi AI' };
    } finally {
      setLoading(null);
    }
  };

  const quickActions = [
    {
      id: 'suggest-dishes',
      title: 'Gợi ý món ăn',
      description: `Dựa trên ${availableIngredients.length} nguyên liệu có sẵn`,
      icon: <ChefHat className="w-5 h-5" />,
      action: () => callAI('suggest-dishes', { ingredients: availableIngredients }),
      disabled: availableIngredients.length === 0
    },
    {
      id: 'shopping-list',
      title: 'Danh sách mua sắm',
      description: `Cho ${currentMenu.length} món trong thực đơn`,
      icon: <ShoppingCart className="w-5 h-5" />,
      action: () => callAI('shopping-list', { 
        menuItems: currentMenu, 
        currentInventory: availableIngredients 
      }),
      disabled: currentMenu.length === 0
    },
    {
      id: 'weekly-plan',
      title: 'Kế hoạch tuần',
      description: 'Tạo kế hoạch bữa ăn cân bằng',
      icon: <Calendar className="w-5 h-5" />,
      action: () => callAI('weekly-plan', { 
        preferences: { 
          familySize: 4,
          budget: 'trung bình',
          favoriteCuisines: ['ẩm thực Việt Nam']
        }
      })
    },
    {
      id: 'advanced-meal-plan',
      title: 'Kế hoạch nâng cao',
      description: 'Tối ưu hóa dinh dưỡng và ngân sách',
      icon: <Target className="w-5 h-5" />,
      action: () => callAI('advanced-meal-plan', { 
        preferences: { 
          familySize: 4,
          budget: 500000,
          dietaryRestrictions: [],
          favoriteCuisines: ['ẩm thực Việt Nam'],
          healthGoals: ['maintenance'],
          mealFrequency: 3,
          cookingTime: 'moderate',
          duration: 7
        }
      })
    },
    {
      id: 'seasonal-recommendations',
      title: 'Gợi ý theo mùa',
      description: 'Món ăn phù hợp với thời tiết hiện tại',
      icon: <Sparkles className="w-5 h-5" />,
      action: () => callAI('seasonal-recommendations', { 
        preferences: { 
          healthCondition: undefined,
          category: undefined
        }
      })
    },
    {
      id: 'generate-recipe',
      title: 'Tạo công thức',
      description: 'Tạo công thức cho món ăn mới',
      icon: <BookOpen className="w-5 h-5" />,
      action: () => callAI('generate-recipe', { 
        dishName: 'Món ăn mới',
        ingredients: availableIngredients.slice(0, 5)
      })
    },
    {
      id: 'personalized-learning',
      title: 'Học từ sở thích',
      description: 'Cá nhân hóa theo lịch sử ăn uống',
      icon: <Brain className="w-5 h-5" />,
      action: () => callAI('personalized-learning', { 
        preferences: { 
          userId: 'current-user',
          preferences: ['Vietnamese', 'healthy'],
          dietaryRestrictions: [],
          healthGoals: ['balanced'],
          learningMode: 'adaptive'
        }
      })
    }
  ];

  return (
    <div className="space-y-4">
      {/* AI Quick Actions */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-purple-900 dark:text-purple-100">
                AI Quick Actions
              </CardTitle>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                Sử dụng AI để tối ưu hóa quản lý menu
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled || loading === action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300">
                  {loading === action.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    action.icon
                  )}
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last AI Result */}
      {lastResult && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  Kết quả AI mới nhất
                </CardTitle>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {getResultTitle(lastResult.type)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-green-900 dark:text-green-100">
              <div className="whitespace-pre-wrap">{lastResult.content}</div>
            </div>
            {lastResult.suggestions && lastResult.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  Gợi ý chi tiết:
                </h4>
                <ul className="space-y-1">
                  {lastResult.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-green-800 dark:text-green-200">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Mẹo sử dụng AI
              </h3>
              <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                <li>• Cập nhật tồn kho nguyên liệu để AI gợi ý chính xác hơn</li>
                <li>• Chọn ngày trong lịch để AI tạo danh sách mua sắm phù hợp</li>
                <li>• AI sẽ học từ sở thích và thói quen ăn uống của bạn</li>
                <li>• Kết quả có thể được lưu và chỉnh sửa theo ý muốn</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getResultTitle(type: string): string {
  switch (type) {
    case 'suggest-dishes':
      return 'Gợi ý món ăn từ nguyên liệu có sẵn';
    case 'shopping-list':
      return 'Danh sách mua sắm thông minh';
    case 'weekly-plan':
      return 'Kế hoạch bữa ăn tuần';
    case 'advanced-meal-plan':
      return 'Kế hoạch bữa ăn nâng cao';
    case 'seasonal-recommendations':
      return 'Gợi ý món ăn theo mùa';
    case 'special-occasions':
      return 'Menu dịp đặc biệt';
    case 'personalized-learning':
      return 'Học từ sở thích cá nhân';
    case 'generate-recipe':
      return 'Công thức nấu ăn mới';
    default:
      return 'Kết quả từ AI';
  }
}
