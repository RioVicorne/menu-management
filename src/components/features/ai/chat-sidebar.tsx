"use client";

import { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  Bot,
  Sparkles,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatSession } from "@/types/chat";

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
  onClose,
}: ChatSidebarProps) {
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleEditStart = (session: ChatSession) => {
    setEditingSession(session.id);
    setEditingTitle(session.title);
  };

  const handleEditSave = () => {
    if (editingSession && editingTitle.trim()) {
      onRenameSession(editingSession, editingTitle.trim());
    }
    setEditingSession(null);
    setEditingTitle("");
  };

  const handleEditCancel = () => {
    setEditingSession(null);
    setEditingTitle("");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Hôm nay";
    } else if (days === 1) {
      return "Hôm qua";
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString("vi-VN");
    }
  };

  return (
    <div className="chat-sidebar w-80 max-w-[85vw] bg-white dark:bg-gray-900 flex flex-col flex-shrink-0 h-screen lg:h-full border-r border-gray-100 dark:border-gray-800 shadow-xl lg:shadow-none">
      {/* Header */}
      <div className="p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 flex items-center justify-between flex-shrink-0">
        <Button
          onClick={onNewChat}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg lg:rounded-xl h-10 lg:h-11 shadow-lg hover:shadow-xl transition-all font-medium text-sm lg:text-base"
        >
          <Plus className="w-4 h-4 mr-1.5 lg:mr-2" />
          <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
          <span className="sm:hidden">Mới</span>
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-2 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-3 lg:p-4 text-center">
            <div className="p-3 lg:p-4 rounded-lg lg:rounded-xl bg-gray-100 dark:bg-gray-800 mb-3 lg:mb-4">
              <Bot className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm lg:text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                Chưa có cuộc trò chuyện
              </h3>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                Bắt đầu cuộc trò chuyện đầu tiên với AI Assistant
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-2.5 lg:p-3 rounded-lg lg:rounded-xl mb-1.5 lg:mb-2 cursor-pointer transition-all ${
                  currentSessionId === session.id
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 shadow-sm"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start space-x-2 lg:space-x-3">
                  <div className="p-1.5 lg:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingSession === session.id ? (
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleEditSave}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleEditSave();
                          if (e.key === "Escape") handleEditCancel();
                        }}
                        className="w-full bg-transparent border-none outline-none text-xs lg:text-sm font-medium text-gray-900 dark:text-gray-100"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-xs lg:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </h3>
                    )}

                    <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 truncate">
                      {session.lastMessage}
                    </p>

                    <div className="flex items-center space-x-1.5 lg:space-x-2 mt-1.5 lg:mt-2">
                      <div className="flex items-center space-x-1 text-[10px] lg:text-xs text-gray-400">
                        <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                        <span>{formatTime(session.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] lg:text-xs text-gray-400">
                        <MessageSquare className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                        <span>{session.messageCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <div className="flex items-center space-x-0.5 lg:space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(session);
                        }}
                        className="h-5 w-5 lg:h-6 lg:w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit3 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="h-5 w-5 lg:h-6 lg:w-6 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
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
      <div className="p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-2 lg:space-x-3 p-2.5 lg:p-3 rounded-lg lg:rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="p-1.5 lg:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs lg:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              AI Menu Assistant
            </h4>
            <p className="text-[10px] lg:text-xs text-gray-600 dark:text-gray-400 truncate hidden sm:block">
              Trợ lý thông minh cho quản lý menu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
