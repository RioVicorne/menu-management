"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from "@/lib/logger";
import { 
  Copy, 
  Download, 
  Share2, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Calendar,
  ShoppingCart,
  BookOpen,
  Target,
  TrendingUp,
  Sparkles,
  Brain
} from 'lucide-react';

interface AIResultProps {
  type: string;
  content: string;
  suggestions?: string[];
  error?: string;
  onRegenerate?: () => void;
  onSave?: (data: unknown) => void;
  loading?: boolean;
}

export default function AIResult({ 
  type, 
  content, 
  suggestions = [], 
  error, 
  onRegenerate, 
  onSave, 
  loading 
}: AIResultProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const getIcon = () => {
    switch (type) {
      case 'suggest-dishes':
        return <ChefHat className="w-6 h-6" />;
      case 'weekly-plan':
        return <Calendar className="w-6 h-6" />;
      case 'advanced-meal-plan':
        return <Target className="w-6 h-6" />;
      case 'seasonal-recommendations':
        return <Sparkles className="w-6 h-6" />;
      case 'special-occasions':
        return <Calendar className="w-6 h-6" />;
      case 'personalized-learning':
        return <Brain className="w-6 h-6" />;
      case 'shopping-list':
        return <ShoppingCart className="w-6 h-6" />;
      case 'generate-recipe':
        return <BookOpen className="w-6 h-6" />;
      default:
        return <ChefHat className="w-6 h-6" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'suggest-dishes':
        return 'Gợi ý món ăn từ AI';
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
      case 'shopping-list':
        return 'Danh sách mua sắm thông minh';
      case 'generate-recipe':
        return 'Công thức nấu ăn';
      default:
        return 'Kết quả từ AI';
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        type,
        content,
        suggestions,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Có lỗi xảy ra
              </h3>
              <p className="text-red-800 dark:text-red-200 text-sm mb-4">
                {error}
              </p>
              {onRegenerate && (
                <Button 
                  onClick={onRegenerate}
                  disabled={loading}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Thử lại
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                {getIcon()}
              </div>
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  {getTitle()}
                </CardTitle>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Được tạo bởi AI Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-green-700 hover:bg-green-100"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={loading}
                  className="text-green-700 hover:bg-green-100"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-green-900 dark:text-green-100">
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gợi ý chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedback('like')}
            className={feedback === 'like' ? 'bg-green-100 border-green-300' : ''}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            Hữu ích
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedback('dislike')}
            className={feedback === 'dislike' ? 'bg-red-100 border-red-300' : ''}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
            Không hữu ích
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Chia sẻ
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Xuất file
          </Button>
          {onSave && (
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Lưu kết quả
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
