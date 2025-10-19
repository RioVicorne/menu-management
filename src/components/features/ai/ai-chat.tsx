"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import ChatSidebar from "./chat-sidebar";
import { logger } from "@/lib/logger";

type Message = {
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

type ChatSession = {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
  lastMessage: string;
};

interface AIChatProps {
  onFeatureSelect?: (feature: string, data?: unknown) => void;
  context?: {
    currentMenu?: string[];
    availableIngredients?: string[];
    dietaryPreferences?: string[];
  };
}

export default function AIChat({ onFeatureSelect, context }: AIChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: 'Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Cuộc trò chuyện mới',
      timestamp: new Date(),
      messageCount: 0,
      lastMessage: ''
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // In a real app, you would load messages for this session
    // For now, we'll just show the welcome message
    const welcomeMessage: Message = {
      id: '1',
      text: 'Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      if (sessions.length > 1) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        selectSession(remainingSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const renameSession = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat',
          data: {
            message: messageText,
            context: context || {}
          }
        }),
      });

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.content || 'Xin lỗi, tôi không thể trả lời lúc này.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Update session
      if (currentSessionId) {
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { 
                ...s, 
                messageCount: s.messageCount + 2,
                lastMessage: messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText,
                title: s.title === 'Cuộc trò chuyện mới' ? `${messageText.substring(0, 30)}...` : s.title
              }
            : s
        ));
      }
    } catch (error) {
      logger.error('Error calling AI API:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeatureRequest = async (feature: string, data?: unknown) => {
    // Handle special case for opening shopping page
    if (feature === 'open-shopping') {
      window.open('/shopping', '_blank');
      return;
    }

    setIsTyping(true);
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: feature,
          data: data || {}
        }),
      });

      const result = await response.json();
      
      const botMessage: Message = {
        id: Date.now().toString(),
        text: `Đây là kết quả từ tính năng ${getFeatureName(feature)}:`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'ai-result',
        aiData: {
          type: feature,
          content: result.content,
          suggestions: result.suggestions,
          error: result.error
        }
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Call the parent callback if provided
      if (onFeatureSelect) {
        onFeatureSelect(feature, result);
      }
    } catch (error) {
      logger.error('Error calling AI feature:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getFeatureName = (feature: string): string => {
    switch (feature) {
      case 'suggest-dishes':
        return 'Gợi ý món ăn';
      case 'weekly-plan':
        return 'Lập kế hoạch tuần';
      case 'advanced-meal-plan':
        return 'Kế hoạch bữa ăn nâng cao';
      case 'seasonal-recommendations':
        return 'Gợi ý món ăn theo mùa';
      case 'special-occasions':
        return 'Menu dịp đặc biệt';
      case 'personalized-learning':
        return 'Học từ sở thích cá nhân';
      case 'shopping-list':
        return 'Danh sách mua sắm';
      case 'generate-recipe':
        return 'Tạo công thức';
      case 'open-shopping':
        return 'Mở trang Shopping';
      default:
        return 'Tính năng AI';
    }
  };

  const handleRegenerate = (messageId: string) => {
    // Find the message and regenerate its content
    const message = messages.find(m => m.id === messageId);
    if (message && message.aiData) {
      handleFeatureRequest(message.aiData.type);
    }
  };

  const handleFeedback = (messageId: string, type: 'like' | 'dislike') => {
    logger.info(`Feedback ${type} for message ${messageId}`);
    // In a real app, you would send this feedback to your backend
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      {sidebarOpen && (
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId || undefined}
          onNewChat={createNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  AI Menu Assistant
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Trợ lý thông minh cho quản lý menu
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Đang hoạt động</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onRegenerate={() => handleRegenerate(message.id)}
              onFeedback={(type) => handleFeedback(message.id, type)}
            />
          ))}
          
          {isTyping && (
            <ChatMessage
              message={{
                id: 'typing',
                text: '',
                sender: 'bot',
                timestamp: new Date(),
                type: 'text'
              }}
              isTyping={true}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onFeatureRequest={handleFeatureRequest}
          loading={isTyping}
        />
      </div>
    </div>
  );
}
