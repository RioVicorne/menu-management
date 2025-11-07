"use client";

import { useState } from 'react';
import { 
  User, 
  Bot, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface ChatMessageProps {
  message: {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type: 'text' | 'ai-result';
    aiData?: {
      type: string;
      content: string;
      suggestions?: string[];
      error?: string;
    };
  };
  isTyping?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (type: 'like' | 'dislike') => void;
}

export default function ChatMessage({ 
  message, 
  isTyping = false, 
  onRegenerate, 
  onFeedback 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    if (onFeedback) {
      onFeedback(type);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isTyping) {
    return (
      <div className="flex items-start space-x-3 py-4 px-4 lg:px-6 animate-fade-in">
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md p-4 max-w-3xl shadow-sm">
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'user') {
    return (
      <div className="flex items-start space-x-3 py-4 px-4 lg:px-6 justify-end animate-fade-in">
        <div className="flex-1 max-w-3xl flex flex-col items-end">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-md p-4 ml-auto shadow-lg hover:shadow-xl transition-shadow">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-right px-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 py-4 px-4 lg:px-6 animate-fade-in group">
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 max-w-3xl">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
            {message.text}
          </div>
        </div>
        
        {/* AI Result Display */}
        {message.type === 'ai-result' && message.aiData && (
          <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
            <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
              <div className="whitespace-pre-wrap">{message.aiData.content}</div>
            </div>
            {message.aiData.suggestions && message.aiData.suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
                  Gợi ý chi tiết:
                </h4>
                <ul className="space-y-2">
                  {message.aiData.suggestions.slice(0, 5).map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2.5 mt-1.5 flex-shrink-0"></span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('like')}
            className={`h-8 px-2 rounded-lg ${
              feedback === 'like' 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('dislike')}
            className={`h-8 px-2 rounded-lg ${
              feedback === 'dislike' 
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>
          
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 px-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
