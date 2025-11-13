export type ChatSender = "user" | "bot";

export type ChatMessageType = "text" | "ai-result";

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatSender;
  timestamp: Date;
  type: ChatMessageType;
  aiData?: {
    type: string;
    content: string;
    suggestions?: string[];
    error?: string;
  };
  actionButtons?: {
    label: string;
    action: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
  showActions?: boolean; // Flag to control visibility
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
  lastMessage: string;
}

export type ChatDataSource = "remote" | "local";

