"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import ChatSidebar from "./chat-sidebar";
import { logger } from "@/lib/logger";
import type { ChatMessage as Message, ChatSession, ChatDataSource } from "@/types/chat";
import {
  loadSessions as loadStoredSessions,
  loadMessages as loadStoredMessages,
  persistSessions,
  persistMessages,
  removeSession as removeStoredSession,
} from "@/lib/chat-storage";

interface AIChatProps {
  onFeatureSelect?: (feature: string, data?: unknown) => void;
  context?: {
    currentMenu?: string[];
    availableIngredients?: string[];
    dietaryPreferences?: string[];
  };
}

const SIDEBAR_VISIBLE_KEY = "planner.sidebarVisible";

const createWelcomeMessage = (): Message => ({
  id: "welcome",
  text:
    "Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?",
  sender: "bot",
  timestamp: new Date(),
  type: "text",
});

export default function AIChat({ onFeatureSelect, context }: AIChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncSource, setSyncSource] = useState<ChatDataSource>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  
  // Load sidebar visibility preference from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(SIDEBAR_VISIBLE_KEY);
        if (saved !== null) {
          let isVisible = false;
          if (saved === "true" || saved === "false") {
            isVisible = saved === "true";
          } else {
            try {
              isVisible = Boolean(JSON.parse(saved));
            } catch {
              isVisible = false;
            }
          }
          if (window.innerWidth >= 1024) {
            setSidebarOpen(isVisible);
          } else {
            setSidebarOpen(false);
          }
        } else {
          setSidebarOpen(false);
        }
      }
    } catch (e) {
      logger.warn("Failed to load sidebar visibility preference", e);
    }
  }, []);

  // Save sidebar visibility preference to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_VISIBLE_KEY, JSON.stringify(newState));
      }
    } catch (e) {
      logger.warn("Failed to save sidebar visibility preference", e);
    }
  };

  // Handle window resize
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, restore saved preference or default to open
        try {
          if (typeof window !== "undefined") {
            const saved = window.localStorage.getItem(SIDEBAR_VISIBLE_KEY);
            if (saved !== null) {
              let isVisible = false;
              if (saved === "true" || saved === "false") {
                isVisible = saved === "true";
              } else {
                try {
                  isVisible = Boolean(JSON.parse(saved));
                } catch {
                  isVisible = false;
                }
              }
              setSidebarOpen(isVisible);
            } else {
              setSidebarOpen(false);
            }
          }
        } catch (e) {
          setSidebarOpen(false);
        }
      } else {
        // On mobile, always close sidebar
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load for sessions/messages
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data, source, error } = await loadStoredSessions();
        if (cancelled) return;

        setSyncSource(source);
        if (error) {
          logger.warn("Falling back to local chat sessions", error);
          setSyncError("Không thể đồng bộ lịch sử chat với máy chủ. Đang dùng dữ liệu lưu trên máy này.");
        } else {
          setSyncError(null);
        }

        setSessions(data);
        if (data.length > 0) {
          setCurrentSessionId(data[0].id);
        } else {
          setMessages([createWelcomeMessage()]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error("Failed to initialize chat sessions", error);
        setSessions([]);
        setMessages([createWelcomeMessage()]);
        setSyncError("Không thể tải lịch sử chat.");
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist sessions when they change
  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  // Load messages for selected session
  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      const { data, source, error } = await loadStoredMessages(currentSessionId);
      if (cancelled) return;

      setSyncSource(source);
      if (error) {
        logger.warn("Falling back to local chat messages", error);
        setSyncError("Không thể đồng bộ tin nhắn với máy chủ. Đang dùng dữ liệu lưu trên máy này.");
      } else {
        setSyncError(null);
      }

      if (data.length > 0) {
        setMessages(data);
      } else {
        setMessages([createWelcomeMessage()]);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [currentSessionId]);

  // Persist messages when they change
  useEffect(() => {
    if (!currentSessionId) return;
    persistMessages(currentSessionId, messages);
  }, [messages, currentSessionId]);


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
    setMessages([createWelcomeMessage()]);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([createWelcomeMessage()]);
        }
      }
      return updated;
    });

    removeStoredSession(sessionId);
  };

  const renameSession = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || initializing) return;
    
    // Ensure a session exists before sending message
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'Cuộc trò chuyện mới',
        timestamp: new Date(),
        messageCount: 0,
        lastMessage: ''
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      sessionId = newSession.id;
      setMessages([createWelcomeMessage()]);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    // Add user message immediately
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
      if (sessionId) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
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
    if (initializing) return;

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
    <div className="flex h-full w-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? 'lg:block' : 'lg:hidden'} transition-transform duration-300 ease-in-out`}>
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId || undefined}
          onNewChat={createNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`chat-main flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'pointer-events-none lg:pointer-events-auto' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
              title={sidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
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
  
        </div>

        {syncError && (
          <div className="px-4 py-2 lg:px-5 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            {syncError}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          {initializing && (
            <div className="px-4 py-3 lg:px-6 text-sm text-gray-500 dark:text-gray-400">
              Đang tải lịch sử trò chuyện...
            </div>
          )}
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
          loading={isTyping || initializing}
          disabled={initializing}
        />
      </div>
    </div>
  );
}
