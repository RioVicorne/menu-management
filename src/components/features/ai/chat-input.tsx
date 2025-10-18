"use client";

import { useState, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Loader2,
  Plus,
  Sparkles,
  ChefHat,
  Calendar,
  ShoppingCart,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFeatureRequest: (feature: string, data?: unknown) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  onFeatureRequest,
  loading = false, 
  disabled = false,
  placeholder = "Nhập tin nhắn..."
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!inputText.trim() || loading || disabled) return;
    
    onSendMessage(inputText);
    setInputText('');
    setShowSuggestions(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleFeatureClick = (feature: string) => {
    onFeatureRequest(feature);
    setShowSuggestions(false);
  };

  const suggestions = [
    'Gợi ý món ăn từ nguyên liệu có sẵn',
    'Lập kế hoạch bữa ăn tuần này',
    'Tạo danh sách mua sắm',
    'Tạo công thức nấu ăn',
    'Kiểm tra tồn kho nguyên liệu',
    'Tư vấn dinh dưỡng'
  ];

  const quickFeatures = [
    {
      id: 'suggest-dishes',
      title: 'Gợi ý món ăn',
      icon: <ChefHat className="w-4 h-4" />,
      description: 'Từ nguyên liệu có sẵn'
    },
    {
      id: 'weekly-plan',
      title: 'Kế hoạch tuần',
      icon: <Calendar className="w-4 h-4" />,
      description: 'Lập menu 7 ngày'
    },
    {
      id: 'shopping-list',
      title: 'Mua sắm',
      icon: <ShoppingCart className="w-4 h-4" />,
      description: 'Danh sách thông minh'
    },
    {
      id: 'generate-recipe',
      title: 'Công thức',
      icon: <BookOpen className="w-4 h-4" />,
      description: 'Hướng dẫn nấu ăn'
    },
    {
      id: 'open-shopping',
      title: 'Mở Shopping',
      icon: <ShoppingCart className="w-4 h-4" />,
      description: 'Xem trang mua sắm'
    }
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Quick Features */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex space-x-2 overflow-x-auto">
          {quickFeatures.map((feature) => (
            <Button
              key={feature.id}
              variant="outline"
              size="sm"
              onClick={() => handleFeatureClick(feature.id)}
              disabled={loading || disabled}
              className="flex-shrink-0 h-8 px-3 text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {feature.icon}
              <span className="ml-1">{feature.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="relative">
          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10">
              <div className="p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                  Gợi ý nhanh:
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Input */}
          <div className="flex items-end space-x-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Plus className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={loading || disabled}
                className="w-full bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm leading-relaxed min-h-[24px] max-h-[120px]"
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecording(!isRecording)}
                className={`p-2 ${
                  isRecording 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || loading || disabled}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-2 px-2">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</span>
          </div>
          <div className="text-xs text-gray-400">
            Enter để gửi, Shift+Enter để xuống dòng
          </div>
        </div>
      </div>
    </div>
  );
}
