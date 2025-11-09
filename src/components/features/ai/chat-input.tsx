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
    'Tạo kế hoạch bữa ăn nâng cao',
    'Gợi ý món ăn theo mùa và thời tiết',
    'Tạo menu cho dịp đặc biệt',
    'Tạo danh sách mua sắm',
    'Tạo công thức nấu ăn',
    'Kiểm tra tồn kho nguyên liệu',
    'Tư vấn dinh dưỡng'
  ];

  return (
    <div
      className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      {/* Input Area */}
      <div className="p-3 lg:p-4 bg-white dark:bg-gray-900">
        <div className="relative">
          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-10 animate-fade-in max-h-64 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 px-3 py-1.5">
                  Gợi ý nhanh:
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Input */}
          <div className="flex items-end space-x-1.5 lg:space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl lg:rounded-2xl p-2 lg:p-3 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:ring-offset-0 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-[border-color] duration-200 shadow-sm hover:shadow-md" style={{ transform: 'scale(1)', WebkitTransform: 'scale(1)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`p-1.5 lg:p-2 rounded-lg transition-colors flex-shrink-0 ${
                showSuggestions
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
            
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={loading || disabled}
                className="w-full bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-base sm:text-sm leading-relaxed min-h-[20px] max-h-[120px] py-1"
                rows={1}
                style={{ height: 'auto', fontSize: '16px', WebkitAppearance: 'none', transform: 'scale(1)' }}
              />
            </div>
            
            <div className="flex items-center space-x-0.5 lg:space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 lg:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden sm:inline-flex"
              >
                <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecording(!isRecording)}
                className={`p-1.5 lg:p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isRecording 
                    ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  <Mic className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || loading || disabled}
                className="p-2 lg:p-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white rounded-lg lg:rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-2 px-1 lg:px-2">
          <div className="flex items-center space-x-1 lg:space-x-2 text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="w-2.5 h-2.5 lg:w-3 lg:h-3 flex-shrink-0" />
            <span className="hidden sm:inline">AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</span>
            <span className="sm:hidden">AI có thể mắc lỗi.</span>
          </div>
          <div className="text-[10px] lg:text-xs text-gray-400 hidden lg:block">
            Enter để gửi, Shift+Enter để xuống dòng
          </div>
        </div>
      </div>
    </div>
  );
}
