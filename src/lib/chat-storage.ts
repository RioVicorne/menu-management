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
  sender: "user" | "bot" | "assistant" | "system";
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
  const timestampRaw =
    raw?.timestamp ??
    raw?.createdAt ??
    raw?.created_at ??
    raw?.updatedAt ??
    raw?.updated_at;
  const parsedTimestamp =
    typeof timestampRaw === "string" || typeof timestampRaw === "number"
      ? new Date(timestampRaw)
      : timestampRaw instanceof Date
        ? timestampRaw
        : new Date();

  return {
    id: String(raw?.id ?? Date.now().toString()),
    title: String(raw?.title || "Cuộc trò chuyện mới"),
    timestamp: parsedTimestamp instanceof Date && !Number.isNaN(parsedTimestamp.getTime())
      ? parsedTimestamp
      : new Date(),
    messageCount: Number(
      raw?.messageCount ??
        raw?.message_count ??
        raw?.messages?.length ??
        0,
    ),
    lastMessage: String(
      raw?.lastMessage ??
        raw?.last_message ??
        raw?.preview ??
        raw?.summary ??
        "",
    ),
  };
}

function serializeMessage(message: ChatMessage) {
  return {
    ...message,
    timestamp: message.timestamp.toISOString(),
  };
}

function normalizeMessageCollection(payload: unknown): unknown[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const container = payload as Record<string, unknown>;
  const candidateKeys = ["messages", "data", "items", "list", "records"];

  for (const key of candidateKeys) {
    const value = container[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      const nestedValues = Object.values(value as Record<string, unknown>);
      if (nestedValues.every((item) => item && typeof item === "object")) {
        return nestedValues;
      }
    }
  }

  if (container.byId && typeof container.byId === "object") {
    return Object.values(container.byId as Record<string, unknown>);
  }

  const objectValues = Object.values(container);
  const messageLikeValues = objectValues.filter((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      "text" in record ||
      "content" in record ||
      "message" in record ||
      "sender" in record ||
      "role" in record ||
      "timestamp" in record ||
      "createdAt" in record ||
      "created_at" in record
    );
  });

  if (messageLikeValues.length > 0) {
    return messageLikeValues;
  }

  return [];
}

function deserializeMessage(raw: any): ChatMessage {
  const textValue =
    raw?.text ??
    raw?.content ??
    raw?.message ??
    raw?.body ??
    "";

  const senderValue =
    raw?.sender ??
    raw?.role ??
    raw?.from ??
    "bot";

  const timestampRaw =
    raw?.timestamp ??
    raw?.createdAt ??
    raw?.created_at ??
    raw?.updatedAt ??
    raw?.updated_at ??
    raw?.time;
  const parsedTimestamp =
    typeof timestampRaw === "string" || typeof timestampRaw === "number"
      ? new Date(timestampRaw)
      : timestampRaw instanceof Date
        ? timestampRaw
        : new Date();

  const typeValue =
    raw?.type ??
    raw?.messageType ??
    raw?.kind ??
    "text";

  return {
    id: String(raw?.id ?? Date.now().toString()),
    text: String(textValue || ""),
    sender:
      senderValue === "user"
        ? "user"
        : senderValue === "assistant"
          ? "bot"
          : senderValue === "bot"
            ? "bot"
            : "bot",
    timestamp:
      parsedTimestamp instanceof Date && !Number.isNaN(parsedTimestamp.getTime())
        ? parsedTimestamp
        : new Date(),
    type: typeValue === "ai-result" ? "ai-result" : "text",
    aiData: raw?.aiData ?? raw?.details ?? raw?.data,
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
    const normalized = normalizeMessageCollection(parsed);
    return normalized.map(deserializeMessage);
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
  const normalized = normalizeMessageCollection(payload?.messages ?? payload);
  return normalized.map(deserializeMessage);
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

