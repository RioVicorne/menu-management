"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

const SESSIONS_KEY = "planner.sessions";
const MESSAGES_KEY_PREFIX = "planner.messages.";
const SIDEBAR_VISIBLE_KEY = "planner.sidebarVisible";

function serializeSession(session: ChatSession) {
  return {
    ...session,
    timestamp: session.timestamp.toISOString(),
  };
}

function deserializeSession(raw: any): ChatSession {
  return {
    id: String(raw.id),
    title: String(raw.title || "Cuộc trò chuyện mới"),
    timestamp: new Date(raw.timestamp || Date.now()),
    messageCount: Number(raw.messageCount || 0),
    lastMessage: String(raw.lastMessage || ""),
  };
}

function serializeMessage(message: Message) {
  return {
    ...message,
    timestamp: message.timestamp.toISOString(),
  };
}

function deserializeMessage(raw: any): Message {
  return {
    id: String(raw.id),
    text: String(raw.text || ""),
    sender: raw.sender === "user" ? "user" : "bot",
    timestamp: new Date(raw.timestamp || Date.now()),
    type: raw.type === "ai-result" ? "ai-result" : "text",
    aiData: raw.aiData,
  };
}

export default function AIChat({ onFeatureSelect, context }: AIChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Load sidebar visibility preference from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(SIDEBAR_VISIBLE_KEY);
        if (saved !== null) {
          const isVisible = JSON.parse(saved);
          if (window.innerWidth >= 1024) {
            setSidebarOpen(isVisible);
          } else {
            setSidebarOpen(false);
          }
        } else {
          // Default: open on desktop, closed on mobile
          if (window.innerWidth >= 1024) {
            setSidebarOpen(true);
          }
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
              setSidebarOpen(JSON.parse(saved));
            } else {
              setSidebarOpen(true);
            }
          }
        } catch (e) {
          setSidebarOpen(true);
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

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(SESSIONS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const loaded = Array.isArray(parsed) ? parsed.map(deserializeSession) : [];
        setSessions(loaded);
        if (loaded.length > 0) {
          setCurrentSessionId(loaded[0].id);
        }
      }
    } catch (e) {
      logger.warn("Failed to load planner sessions from localStorage", e);
    }
  }, []);

  // Persist sessions to localStorage when they change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const data = JSON.stringify(sessions.map(serializeSession));
      window.localStorage.setItem(SESSIONS_KEY, data);
    } catch (e) {
      logger.warn("Failed to save planner sessions to localStorage", e);
    }
  }, [sessions]);

  // Load messages when current session changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    try {
      if (typeof window === "undefined") return;
      const key = MESSAGES_KEY_PREFIX + currentSessionId;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const loaded = Array.isArray(parsed) ? parsed.map(deserializeMessage) : [];
        setMessages(loaded);
      } else {
        // If no stored messages, initialize with welcome message
        const welcomeMessage: Message = {
          id: "1",
          text:
            "Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?",
          sender: "bot",
          timestamp: new Date(),
          type: "text",
        };
        setMessages([welcomeMessage]);
      }
    } catch (e) {
      logger.warn("Failed to load planner messages from localStorage", e);
    }
  }, [currentSessionId]);

  // Persist messages of current session
  useEffect(() => {
    if (!currentSessionId) return;
    try {
      if (typeof window === "undefined") return;
      const key = MESSAGES_KEY_PREFIX + currentSessionId;
      const data = JSON.stringify(messages.map(serializeMessage));
      window.localStorage.setItem(key, data);
    } catch (e) {
      logger.warn("Failed to save planner messages to localStorage", e);
    }
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
    // Remove messages from storage
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(MESSAGES_KEY_PREFIX + sessionId);
      }
    } catch (e) {
      logger.warn("Failed to remove session messages from localStorage", e);
    }
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
      // Initialize with welcome message for new session
      const welcomeMessage: Message = {
        id: "1",
        text: "Xin chào! Tôi là AI Assistant chuyên về quản lý menu và lập kế hoạch bữa ăn. Tôi có thể giúp bạn:\n\n• Gợi ý món ăn từ nguyên liệu có sẵn\n• Lập kế hoạch bữa ăn cho cả tuần\n• Tạo danh sách mua sắm thông minh\n• Tạo công thức nấu ăn chi tiết\n\nBạn muốn tôi giúp gì hôm nay?",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };
      setMessages([welcomeMessage]);
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
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
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
          
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 dark:text-green-400 font-medium">Đang hoạt động</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
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
