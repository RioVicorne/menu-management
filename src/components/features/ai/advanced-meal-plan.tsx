"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Target, 
  Heart, 
  Zap,
  TrendingUp,
  ShoppingCart,
  ChefHat,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { logger } from "@/lib/logger";

interface AdvancedMealPlanProps {
  onPlanGenerated?: (plan: any) => void;
  onShoppingListGenerated?: (list: any) => void;
}

interface MealPlanPreferences {
  familySize: number;
  budget: number;
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  healthGoals: string[];
  mealFrequency: number;
  cookingTime: 'quick' | 'moderate' | 'extensive';
  duration: number;
}

export default function AdvancedMealPlan({ 
  onPlanGenerated, 
  onShoppingListGenerated 
}: AdvancedMealPlanProps) {
  const [preferences, setPreferences] = useState<MealPlanPreferences>({
    familySize: 4,
    budget: 500000, // 500k VND per week
    dietaryRestrictions: [],
    favoriteCuisines: ['ẩm thực Việt Nam'],
    healthGoals: ['maintenance'],
    mealFrequency: 3,
    cookingTime: 'moderate',
    duration: 7
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreferenceChange = (key: keyof MealPlanPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleArrayPreferenceChange = (key: 'dietaryRestrictions' | 'favoriteCuisines' | 'healthGoals', value: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: checked 
        ? [...prev[key], value]
        : prev[key].filter(item => item !== value)
    }));
  };

  const generateAdvancedMealPlan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'advanced-meal-plan',
          data: { preferences }
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.content || 'Có lỗi xảy ra khi tạo kế hoạch bữa ăn');
      }

      setResult(data);
      
      if (onPlanGenerated) {
        onPlanGenerated(data.aiData?.mealPlan);
      }
      
      if (onShoppingListGenerated) {
        onShoppingListGenerated(data.aiData?.shoppingList);
      }

    } catch (error) {
      logger.error('Error generating advanced meal plan:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const dietaryOptions = [
    { value: 'vegetarian', label: 'Ăn chay' },
    { value: 'vegan', label: 'Thuần chay' },
    { value: 'low_sodium', label: 'Ít muối' },
    { value: 'low_carb', label: 'Ít tinh bột' },
    { value: 'gluten_free', label: 'Không gluten' },
    { value: 'dairy_free', label: 'Không sữa' }
  ];

  const cuisineOptions = [
    { value: 'ẩm thực Việt Nam', label: 'Việt Nam' },
    { value: 'ẩm thực Trung Hoa', label: 'Trung Hoa' },
    { value: 'ẩm thực Nhật Bản', label: 'Nhật Bản' },
    { value: 'ẩm thực Hàn Quốc', label: 'Hàn Quốc' },
    { value: 'ẩm thực Thái Lan', label: 'Thái Lan' },
    { value: 'ẩm thực Ý', label: 'Ý' },
    { value: 'ẩm thực Mexico', label: 'Mexico' }
  ];

  const healthGoalOptions = [
    { value: 'weight_loss', label: 'Giảm cân', icon: TrendingUp },
    { value: 'muscle_gain', label: 'Tăng cơ', icon: Target },
    { value: 'maintenance', label: 'Duy trì', icon: CheckCircle },
    { value: 'diabetes', label: 'Tiểu đường', icon: Heart },
    { value: 'heart_health', label: 'Tim mạch', icon: Heart },
    { value: 'energy_boost', label: 'Tăng năng lượng', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎯 Lập Kế Hoạch Bữa Ăn Nâng Cao
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tối ưu hóa dinh dưỡng và ngân sách với AI thông minh
        </p>
      </div>

      {/* Preferences Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Thiết lập ưu tiên
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Family Size */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Số người trong gia đình
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={preferences.familySize}
              onChange={(e) => handlePreferenceChange('familySize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Ngân sách hàng tuần (VND)
            </label>
            <input
              type="number"
              min="100000"
              max="2000000"
              step="50000"
              value={preferences.budget}
              onChange={(e) => handlePreferenceChange('budget', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {preferences.budget.toLocaleString()}VND/tuần
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Thời gian lập kế hoạch
            </label>
            <select
              value={preferences.duration}
              onChange={(e) => handlePreferenceChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 ngày</option>
              <option value={7}>1 tuần</option>
              <option value={14}>2 tuần</option>
              <option value={30}>1 tháng</option>
            </select>
          </div>

          {/* Cooking Time */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Thời gian nấu ăn
            </label>
            <select
              value={preferences.cookingTime}
              onChange={(e) => handlePreferenceChange('cookingTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="quick">Nhanh (&le;30 phút)</option>
              <option value="moderate">Trung bình (&le;60 phút)</option>
              <option value="extensive">Chi tiết (&gt;60 phút)</option>
            </select>
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-3">
            Chế độ ăn đặc biệt
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {dietaryOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.dietaryRestrictions.includes(option.value)}
                  onChange={(e) => handleArrayPreferenceChange('dietaryRestrictions', option.value, e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Favorite Cuisines */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-3">
            Món ăn yêu thích
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {cuisineOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.favoriteCuisines.includes(option.value)}
                  onChange={(e) => handleArrayPreferenceChange('favoriteCuisines', option.value, e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Health Goals */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-3">
            Mục tiêu sức khỏe
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {healthGoalOptions.map(option => {
              const Icon = option.icon;
              return (
                <label key={option.value} className="flex items-center p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={preferences.healthGoals.includes(option.value)}
                    onChange={(e) => handleArrayPreferenceChange('healthGoals', option.value, e.target.checked)}
                    className="mr-2"
                  />
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="text-sm">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={generateAdvancedMealPlan}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang tạo kế hoạch...
              </>
            ) : (
              <>
                <ChefHat className="w-5 h-5 mr-2" />
                Tạo Kế Hoạch Bữa Ăn Nâng Cao
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Lỗi:</span>
            <span className="ml-2">{error}</span>
          </div>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Kết quả kế hoạch bữa ăn
          </h3>
          
          <div className="prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: result.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }} />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                if (result.aiData?.shoppingList) {
                  const listText = result.aiData.shoppingList
                    .map((item: any) => `${item.ingredient}: ${item.totalQuantity} ${item.unit}`)
                    .join('\n');
                  navigator.clipboard.writeText(listText);
                }
              }}
              className="flex items-center"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Sao chép danh sách mua sắm
            </Button>
            
            <Button
              onClick={() => {
                if (result.content) {
                  navigator.clipboard.writeText(result.content);
                }
              }}
              variant="outline"
              className="flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Sao chép kế hoạch
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
