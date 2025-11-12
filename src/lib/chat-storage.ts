import type { ChatMessage, ChatSession, ChatDataSource } from "@/types/chat";

const SESSIONS_KEY = "planner.sessions";
const MESSAGES_KEY_PREFIX = "planner.messages.";

type LoadResult<T> = {
  data: T;
  source: ChatDataSource;
  error?: unknown;
};

type RemoteSessionPayload = {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  lastMessage: string;
};

type RemoteMessagePayload = {
  id: string;
  sessionId: string;
  sender: "user" | "bot";
  text: string;
  type: "text" | "ai-result";
  aiData?: ChatMessage["aiData"];
  createdAt: string;
};

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

function serializeMessage(message: ChatMessage) {
  return {
    ...message,
    timestamp: message.timestamp.toISOString(),
  };
}

function deserializeMessage(raw: any): ChatMessage {
  return {
    id: String(raw.id),
    text: String(raw.text || ""),
    sender: raw.sender === "user" ? "user" : "bot",
    timestamp: new Date(raw.timestamp || raw.createdAt || Date.now()),
    type: raw.type === "ai-result" ? "ai-result" : "text",
    aiData: raw.aiData,
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function loadLocalSessions(): ChatSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(deserializeSession) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: ChatSession[]) {
  if (!isBrowser()) return;
  try {
    const data = JSON.stringify(sessions.map(serializeSession));
    window.localStorage.setItem(SESSIONS_KEY, data);
  } catch {
    // ignore
  }
}

function loadLocalMessages(sessionId: string): ChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const key = MESSAGES_KEY_PREFIX + sessionId;
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(deserializeMessage) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(sessionId: string, messages: ChatMessage[]) {
  if (!isBrowser()) return;
  try {
    const key = MESSAGES_KEY_PREFIX + sessionId;
    const data = JSON.stringify(messages.map(serializeMessage));
    window.localStorage.setItem(key, data);
  } catch {
    // ignore
  }
}

function removeLocalMessages(sessionId: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(MESSAGES_KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

async function fetchRemoteSessions(): Promise<ChatSession[]> {
  const response = await fetch("/api/chat/sessions");
  if (!response.ok) {
    throw new Error(`Failed to fetch chat sessions: ${response.status}`);
  }
  const payload = (await response.json()) as { sessions: RemoteSessionPayload[] };
  return (payload.sessions || []).map((s) => ({
    id: String(s.id),
    title: s.title || "Cuộc trò chuyện mới",
    timestamp: new Date(s.createdAt || Date.now()),
    messageCount: Number(s.messageCount || 0),
    lastMessage: s.lastMessage || "",
  }));
}

async function fetchRemoteMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat messages: ${response.status}`);
  }
  const payload = (await response.json()) as { messages: RemoteMessagePayload[] };
  return (payload.messages || []).map((m) => ({
    id: String(m.id),
    text: m.text || "",
    sender: m.sender === "user" ? "user" : "bot",
    timestamp: new Date(m.createdAt || Date.now()),
    type: m.type === "ai-result" ? "ai-result" : "text",
    aiData: m.aiData,
  }));
}

export async function loadSessions(): Promise<LoadResult<ChatSession[]>> {
  try {
    const sessions = await fetchRemoteSessions();
    if (sessions.length > 0) {
      saveLocalSessions(sessions);
      return { data: sessions, source: "remote" };
    }

    const localSessions = loadLocalSessions();
    if (localSessions.length > 0) {
      return { data: localSessions, source: "local" };
    }

    return { data: [], source: "remote" };
  } catch (error) {
    const sessions = loadLocalSessions();
    return { data: sessions, source: "local", error };
  }
}

export async function loadMessages(sessionId: string): Promise<LoadResult<ChatMessage[]>> {
  try {
    const messages = await fetchRemoteMessages(sessionId);
    if (messages.length > 0) {
      saveLocalMessages(sessionId, messages);
      return { data: messages, source: "remote" };
    }

    const localMessages = loadLocalMessages(sessionId);
    if (localMessages.length > 0) {
      return { data: localMessages, source: "local" };
    }

    return { data: [], source: "remote" };
  } catch (error) {
    const messages = loadLocalMessages(sessionId);
    return { data: messages, source: "local", error };
  }
}

export function persistSessions(sessions: ChatSession[]) {
  saveLocalSessions(sessions);
}

export function persistMessages(sessionId: string, messages: ChatMessage[]) {
  saveLocalMessages(sessionId, messages);
}

export function removeSession(sessionId: string) {
  removeLocalMessages(sessionId);
}

export { SESSIONS_KEY, MESSAGES_KEY_PREFIX };

