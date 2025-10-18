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
      <div className="flex items-start space-x-4 py-6 px-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md p-4 max-w-3xl">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'user') {
    return (
      <div className="flex items-start space-x-4 py-6 px-4 justify-end">
        <div className="flex-1 max-w-3xl">
          <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md p-4 ml-auto">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {formatTime(message.timestamp)}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-4 py-6 px-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 max-w-3xl">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md p-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
            {message.text}
          </div>
        </div>
        
        {/* AI Result Display */}
        {message.type === 'ai-result' && message.aiData && (
          <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
              <div className="whitespace-pre-wrap">{message.aiData.content}</div>
            </div>
            {message.aiData.suggestions && message.aiData.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Gợi ý chi tiết:
                </h4>
                <ul className="space-y-1">
                  {message.aiData.suggestions.slice(0, 5).map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('like')}
            className={`h-8 px-2 ${
              feedback === 'like' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('dislike')}
            className={`h-8 px-2 ${
              feedback === 'dislike' 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>
          
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
