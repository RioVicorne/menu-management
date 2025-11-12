"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, UserCircle, LogOut, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
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

const CURRENT_SESSION_KEY = "planner.currentSessionId";

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
  const [syncSource, setSyncSource] = useState<ChatDataSource>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [hydratingMessages, setHydratingMessages] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [username, setUsername] = useState<string>("Người dùng");
  const [userEmail, setUserEmail] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        if (!supabase) {
          logger.warn("Supabase client not available");
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
          // Try to get username from user metadata or extract from email
          const displayName = user.user_metadata?.username || 
                             user.user_metadata?.display_name || 
                             user.user_metadata?.full_name ||
                             user.email?.split('@')[0].replace(/\.(test|local)$/, "") ||
                             "Người dùng";
          setUsername(displayName);
        }
      } catch (error) {
        logger.error("Failed to load user info", error);
      }
    };

    loadUserInfo();
  }, []);

  // Handle click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

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
          let initialSessionId: string | null = null;
          try {
            if (typeof window !== "undefined") {
              initialSessionId = window.localStorage.getItem(CURRENT_SESSION_KEY);
            }
          } catch (storageError) {
            logger.warn("Failed to restore last chat session", storageError);
          }

          if (initialSessionId && data.some((session) => session.id === initialSessionId)) {
            setCurrentSessionId(initialSessionId);
          } else {
            setCurrentSessionId(data[0].id);
          }
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
    if (initializing) {
      return;
    }
    persistSessions(sessions);
  }, [sessions, initializing]);

  // Persist the currently selected session
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      if (currentSessionId) {
        window.localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
      } else {
        window.localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    } catch (error) {
      logger.warn("Failed to persist current chat session", error);
    }
  }, [currentSessionId]);

  // Load messages for selected session
  useEffect(() => {
    if (!currentSessionId) {
      setHydratingMessages(false);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setHydratingMessages(true);
      try {
        const { data, source, error } = await loadStoredMessages(currentSessionId);
        if (cancelled) return;

        logger.info(`Loading messages for session ${currentSessionId}:`, {
          totalMessages: data.length,
          source,
          hasError: !!error
        });

        setSyncSource(source);
        if (error) {
          logger.warn("Falling back to local chat messages", error);
          setSyncError("Không thể đồng bộ tin nhắn với máy chủ. Đang dùng dữ liệu lưu trên máy này.");
        } else {
          setSyncError(null);
        }

        // Filter out welcome messages if there are real messages
        const realMessages = data.filter(msg => msg.id !== 'welcome');
        
        logger.info(`Real messages count: ${realMessages.length}`);
        
        if (realMessages.length > 0) {
          setMessages(realMessages);
        } else if (data.length > 0) {
          // If only welcome message exists, use it
          setMessages(data);
        } else {
          // No messages at all, create welcome message
          setMessages([createWelcomeMessage()]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error("Failed to load chat messages", error);
        setMessages([createWelcomeMessage()]);
        setSyncError("Không thể tải tin nhắn cho cuộc trò chuyện này.");
      } finally {
        if (!cancelled) {
          setHydratingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [currentSessionId]);

  // Persist messages when they change
  useEffect(() => {
    if (initializing || !currentSessionId || hydratingMessages) return;
    
    // Only persist if there are real messages (not just welcome message)
    const realMessages = messages.filter(msg => msg.id !== 'welcome');
    if (realMessages.length > 0) {
      persistMessages(currentSessionId, realMessages);
    }
  }, [messages, currentSessionId, initializing, hydratingMessages]);


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

  const handleClearChatHistory = () => {
    setShowProfileMenu(false);
    
    // Clear all sessions and messages from localStorage
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(window.localStorage);
        keys.forEach(key => {
          if (key.startsWith("planner.messages.") || key === "planner.sessions" || key === "planner.currentSessionId") {
            window.localStorage.removeItem(key);
          }
        });
      }
      
      // Reset state
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([createWelcomeMessage()]);
      
      logger.info('Chat history cleared successfully');
    } catch (error) {
      logger.error('Failed to clear chat history', error);
    }
  };

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      if (!supabase) {
        logger.warn("Supabase client not available");
        window.location.href = '/planner';
        return;
      }
      await supabase.auth.signOut();
      logger.info('User logged out successfully');
      // Redirect to planner page (will show login form after logout)
      window.location.href = '/planner';
    } catch (error) {
      logger.error('Failed to logout', error);
      // Even if logout fails, redirect to planner
      window.location.href = '/planner';
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Main Chat Area - Full Width */}
      <div className="chat-main flex-1 flex flex-col min-h-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 lg:p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
            <div className="p-2 lg:p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg flex-shrink-0">
              <Bot className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                AI Menu Assistant
              </h1>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                Trợ lý thông minh cho quản lý menu
              </p>
            </div>
          </div>
          
          {/* Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2 flex-shrink-0"
              title="Hồ sơ người dùng"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <UserCircle className="w-6 h-6 lg:w-7 lg:h-7 text-gray-600 dark:text-gray-400" />
            </Button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {username}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Navigate to profile page
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <User className="w-4 h-4" />
                  <span>Hồ sơ</span>
                </button>
                
                <button
                  onClick={handleClearChatHistory}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa lịch sử chat</span>
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {syncError && (
          <div className="px-3 lg:px-5 py-2 text-xs lg:text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
            {syncError}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 pb-4">
          {initializing && (
            <div className="px-3 lg:px-6 py-3 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
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
