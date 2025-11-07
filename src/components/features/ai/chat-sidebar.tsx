"use client";

import { useState } from 'react';
import {
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Bot,
  Sparkles,
  Clock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatSession } from '@/types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onClose?: () => void;
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onClose
}: ChatSidebarProps) {
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleEditStart = (session: ChatSession) => {
    setEditingSession(session.id);
    setEditingTitle(session.title);
  };

  const handleEditSave = () => {
    if (editingSession && editingTitle.trim()) {
      onRenameSession(editingSession, editingTitle.trim());
    }
    setEditingSession(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingSession(null);
    setEditingTitle('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Hôm nay';
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  return (
    <div className="chat-sidebar w-80 bg-white dark:bg-gray-900 flex flex-col flex-shrink-0 h-screen lg:h-full fixed lg:static top-0 left-0 z-50 lg:z-auto border-r border-gray-100 dark:border-gray-800 shadow-xl lg:shadow-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 flex items-center justify-between">
        <Button
          onClick={onNewChat}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl h-11 shadow-lg hover:shadow-xl transition-all font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cuộc trò chuyện mới
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-2 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center">
            <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4">
              <Bot className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Chưa có cuộc trò chuyện
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bắt đầu cuộc trò chuyện đầu tiên với AI Assistant
              </p>
            </div>
            <Button
              onClick={onNewChat}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Bắt đầu chat
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                  currentSessionId === session.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {editingSession === session.id ? (
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleEditSave}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEditSave();
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-900 dark:text-gray-100"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </h3>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {session.lastMessage}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(session.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.messageCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(session);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              AI Menu Assistant
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Trợ lý thông minh cho quản lý menu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
