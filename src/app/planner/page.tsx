"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Sparkles, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'image' | 'file';
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi có thể giúp gì cho bạn về quản lý menu và thực đơn?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = getBotResponse(inputText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('thực đơn') || lowerInput.includes('menu')) {
      return 'Bạn có thể xem thực đơn hôm nay tại trang Menu. Tôi có thể giúp bạn lập kế hoạch bữa ăn cho tuần tới!';
    }
    
    if (lowerInput.includes('mua sắm') || lowerInput.includes('shopping')) {
      return 'Trang Shopping sẽ giúp bạn tạo danh sách mua sắm tự động dựa trên nguyên liệu còn thiếu. Bạn có muốn tôi kiểm tra tồn kho không?';
    }
    
    if (lowerInput.includes('nguyên liệu') || lowerInput.includes('kho')) {
      return 'Bạn có thể quản lý nguyên liệu và kiểm tra tồn kho tại trang Storage. Tôi có thể giúp bạn thêm nguyên liệu mới!';
    }
    
    if (lowerInput.includes('công thức') || lowerInput.includes('nấu ăn')) {
      return 'Hiện tại chúng tôi đang phát triển tính năng quản lý công thức. Bạn có thể xem các món ăn có sẵn tại trang Menu!';
    }
    
    if (lowerInput.includes('xin chào') || lowerInput.includes('hello')) {
      return 'Xin chào! Tôi là trợ lý quản lý menu của bạn. Tôi có thể giúp bạn về thực đơn, mua sắm, và quản lý nguyên liệu!';
    }
    
    return `Tôi hiểu bạn đang hỏi về "${input}". Hiện tại tôi có thể giúp bạn về thực đơn, mua sắm, và quản lý nguyên liệu. Bạn có thể hỏi cụ thể hơn không?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-4">
          <div className="p-4 gradient-primary rounded-3xl shadow-soft">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
              AI Planner
            </h1>
            <p className="text-muted-foreground">
              Trợ lý thông minh giúp lập kế hoạch thực đơn
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card variant="modern" className="hover-lift h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="border-b border-sage-200/50 dark:border-sage-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-soft">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-mint-500 rounded-full border-2 border-background"></div>
              </div>
              <div>
                <CardTitle className="text-lg">Menu Assistant</CardTitle>
                <p className="text-sm text-mint-600">Đang hoạt động</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-blue-500' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
              }`}>
                {message.sender === 'user' ? (
                  <User className="h-5 w-5 text-white" />
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
              </div>
              <div className={`px-4 py-2 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm'
              }`}>
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' 
                    ? 'text-blue-100' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-md shadow-sm px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-end space-x-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors">
              <Smile className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-full transition-colors"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <Mic className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            'Xem thực đơn hôm nay',
            'Tạo danh sách mua sắm',
            'Kiểm tra tồn kho',
            'Lập kế hoạch bữa ăn'
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => setInputText(action)}
              className="flex-shrink-0 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
        </CardContent>
      </Card>
    </div>
  );
}