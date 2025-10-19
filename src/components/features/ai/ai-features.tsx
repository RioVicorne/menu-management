"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChefHat, 
  Calendar, 
  ShoppingCart, 
  BookOpen, 
  Target,
  Sparkles, 
  Loader2,
  AlertCircle,
  Brain
} from 'lucide-react';

interface AISuggestionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function AISuggestionCard({ title, description, icon, onAction, loading, disabled }: AISuggestionCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sage-500 to-sage-600 text-white group-hover:scale-110 transition-transform duration-200">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              {description}
            </p>
            <Button 
              onClick={onAction}
              disabled={loading || disabled}
              className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Bắt đầu
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AIFeaturesProps {
  onFeatureSelect: (feature: string, data?: unknown) => void;
  loading?: boolean;
}

export default function AIFeatures({ onFeatureSelect, loading }: AIFeaturesProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeatureClick = (feature: string, data?: unknown) => {
    setSelectedFeature(feature);
    onFeatureSelect(feature, data);
  };

  const features = [
    {
      id: 'suggest-dishes',
      title: 'Gợi ý món ăn',
      description: 'AI sẽ gợi ý các món ăn phù hợp dựa trên nguyên liệu có sẵn trong kho',
      icon: <ChefHat className="w-6 h-6" />,
      action: () => handleFeatureClick('suggest-dishes')
    },
    {
      id: 'weekly-plan',
      title: 'Lập kế hoạch tuần',
      description: 'Tạo kế hoạch bữa ăn cân bằng cho cả tuần với các món đa dạng',
      icon: <Calendar className="w-6 h-6" />,
      action: () => handleFeatureClick('weekly-plan')
    },
    {
      id: 'advanced-meal-plan',
      title: 'Kế hoạch nâng cao',
      description: 'Tối ưu hóa dinh dưỡng và ngân sách với AI thông minh',
      icon: <Target className="w-6 h-6" />,
      action: () => handleFeatureClick('advanced-meal-plan')
    },
    {
      id: 'seasonal-recommendations',
      title: 'Gợi ý theo mùa',
      description: 'Món ăn phù hợp với thời tiết và mùa hiện tại',
      icon: <Sparkles className="w-6 h-6" />,
      action: () => handleFeatureClick('seasonal-recommendations')
    },
    {
      id: 'special-occasions',
      title: 'Menu dịp đặc biệt',
      description: 'Menu hoàn chỉnh cho sinh nhật, lễ tết, tiệc tùng',
      icon: <Calendar className="w-6 h-6" />,
      action: () => handleFeatureClick('special-occasions')
    },
    {
      id: 'shopping-list',
      title: 'Danh sách mua sắm',
      description: 'Tự động tạo danh sách mua sắm thông minh dựa trên thực đơn',
      icon: <ShoppingCart className="w-6 h-6" />,
      action: () => handleFeatureClick('shopping-list')
    },
    {
      id: 'generate-recipe',
      title: 'Tạo công thức',
      description: 'AI sẽ tạo công thức nấu ăn chi tiết cho món bạn muốn',
      icon: <BookOpen className="w-6 h-6" />,
      action: () => handleFeatureClick('generate-recipe')
    },
    {
      id: 'personalized-learning',
      title: 'Học từ sở thích',
      description: 'AI học từ lịch sử ăn uống và sở thích cá nhân của bạn',
      icon: <Brain className="w-6 h-6" />,
      action: () => handleFeatureClick('personalized-learning')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Assistant
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Trợ lý thông minh giúp quản lý menu và lập kế hoạch bữa ăn
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <AISuggestionCard
            key={feature.id}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            onAction={feature.action}
            loading={loading && selectedFeature === feature.id}
            disabled={loading}
          />
        ))}
      </div>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Mẹo sử dụng AI Assistant
              </h3>
              <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                <li>• Cập nhật tồn kho nguyên liệu để AI gợi ý chính xác hơn</li>
                <li>• Chọn tính năng phù hợp với nhu cầu của bạn</li>
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
