"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, UserCircle, LogOut, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import {
  getDishes,
  getMenuItems,
  addDishToMenu,
  updateMenuItem,
  deleteMenuItem,
} from "@/lib/api";
import type { Dish } from "@/lib/api";
import type {
  ChatMessage as Message,
  ChatSession,
  ChatDataSource,
} from "@/types/chat";
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
  text: "Xin chào! Mình là Trợ lý Quản lý Thực đơn của bạn. Mình có thể giúp bạn:\n\n• Lên kế hoạch thực đơn cho ngày/tuần\n• Sửa đổi thông tin và giá món ăn\n• Xóa món ăn khỏi menu\n• Gợi ý và sắp xếp các món ăn\n\nBạn muốn mình giúp gì hôm nay?",
  sender: "bot",
  timestamp: new Date(),
  type: "text",
});

type PendingActionRecord = Record<
  string,
  {
    originalMessage: string;
    sessionId: string | null;
    type: "add" | "remove";
    selectedDish?: Dish;
    dishName?: string;
    dishNames?: string[]; // For multiple dishes (e.g., remove all)
    targetDate?: string;
  }
>;

type PendingActionIntent = {
  type: "add" | "remove";
  prompt: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: "primary" | "danger";
  selectedDish?: Dish;
  dishName?: string;
  dishNames?: string[]; // For multiple dishes (e.g., remove all)
};

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
  const [pendingActions, setPendingActions] = useState<PendingActionRecord>({});

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
          // Try to get username from user metadata or extract from email
          const displayName =
            user.user_metadata?.username ||
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0].replace(/\.(test|local)$/, "") ||
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
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
          setSyncError(
            "Không thể đồng bộ lịch sử chat với máy chủ. Đang dùng dữ liệu lưu trên máy này."
          );
        } else {
          setSyncError(null);
        }

        setSessions(data);
        if (data.length > 0) {
          let initialSessionId: string | null = null;
          try {
            if (typeof window !== "undefined") {
              initialSessionId =
                window.localStorage.getItem(CURRENT_SESSION_KEY);
            }
          } catch (storageError) {
            logger.warn("Failed to restore last chat session", storageError);
          }

          if (
            initialSessionId &&
            data.some((session) => session.id === initialSessionId)
          ) {
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
    const saveSessions = async () => {
      await persistSessions(sessions);
    };
    saveSessions();
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
        const { data, source, error } =
          await loadStoredMessages(currentSessionId);
        if (cancelled) return;

        logger.info(`Loading messages for session ${currentSessionId}:`, {
          totalMessages: data.length,
          source,
          hasError: !!error,
        });

        setSyncSource(source);
        if (error) {
          logger.warn("Falling back to local chat messages", error);
          setSyncError(
            "Không thể đồng bộ tin nhắn với máy chủ. Đang dùng dữ liệu lưu trên máy này."
          );
        } else {
          setSyncError(null);
        }

        // Filter out welcome messages if there are real messages
        const realMessages = data.filter((msg) => msg.id !== "welcome");

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
    const realMessages = messages.filter((msg) => msg.id !== "welcome");
    if (realMessages.length > 0) {
      const saveMessages = async () => {
        await persistMessages(currentSessionId, realMessages);
      };
      saveMessages();
    }
  }, [messages, currentSessionId, initializing, hydratingMessages]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "Cuộc trò chuyện mới",
      timestamp: new Date(),
      messageCount: 0,
      lastMessage: "",
    };

    // Replace existing session (each user should only have one session)
    setSessions([newSession]);
    setCurrentSessionId(newSession.id);
    setMessages([createWelcomeMessage()]);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
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
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  };

  const parseDateFromMessage = (messageText: string): string => {
    const normalized = messageText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check for "ngày mai" or "mai"
    if (
      normalized.includes("ngay mai") ||
      normalized.includes(" mai ") ||
      normalized.includes("mai")
    ) {
      return tomorrow.toISOString().split("T")[0];
    }

    // Check for "hôm nay" or "hnay" or "menu" (when user says "menu" without date, assume today)
    if (
      normalized.includes("hom nay") ||
      normalized.includes("hnay") ||
      normalized.includes("menu") ||
      normalized.includes("thuc don")
    ) {
      return today.toISOString().split("T")[0];
    }

    // Default to today if not specified (most users want to add to today's menu)
    return today.toISOString().split("T")[0];
  };

  const detectPendingActionIntent = async (
    messageText: string
  ): Promise<PendingActionIntent | null> => {
    const normalized = messageText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalized) return null;

    // Kiểm tra xem đây có phải là câu hỏi về trạng thái không (đã thêm chưa, đã xóa chưa, etc.)
    // Nếu là câu hỏi về trạng thái, không nên trigger pending intent, để AI tự nhiên trả lời với context
    const statusQuestionPatterns = [
      "da them",
      "da xoa",
      "da sua",
      "da cap nhat",
      "them chua",
      "xoa chua",
      "sua chua",
      "cap nhat chua",
      "co them",
      "co xoa",
      "co sua",
      "them roi",
      "xoa roi",
      "sua roi",
      "da them chua",
      "da xoa chua",
      "da sua chua",
      "them chua do",
      "xoa chua do",
      "sua chua do",
    ];

    const isStatusQuestion = statusQuestionPatterns.some((pattern) =>
      normalized.includes(pattern)
    );

    // Nếu là câu hỏi về trạng thái, không trigger pending intent, để AI trả lời tự nhiên với context
    if (isStatusQuestion) {
      return null;
    }

    const addKeywords = ["them", "add"];
    const removeKeywords = ["xoa", "remove", "delete", "bo", "loai"];
    const randomKeywords = ["ngau nhien", "random"];

    const hasAdd = addKeywords.some((keyword) => normalized.includes(keyword));
    const hasRemove = removeKeywords.some((keyword) =>
      normalized.includes(keyword)
    );

    if (!hasAdd && !hasRemove) {
      return null;
    }

    const isRandom = randomKeywords.some((keyword) =>
      normalized.includes(keyword)
    );

    // Helper function to extract dish name from message
    const extractDishName = (msg: string): string | null => {
      // Try to extract dish name from patterns like "thêm món [dish name]"
      // This function extracts the dish name from various Vietnamese patterns

      // Remove extra whitespace and normalize
      const cleanMsg = msg.trim().replace(/\s+/g, " ");

      // Patterns to match (in order of specificity):
      // 1. "thêm món [dish] vào thực đơn [date]" - most specific
      // 2. "thêm món [dish] vào menu [date]"
      // 3. "thêm món [dish] vào ngày mai/hôm nay"
      // 4. "thêm món [dish] vào"
      // 5. "thêm món [dish]" - fallback

      // Pattern 1: "thêm món X vào thực đơn"
      let match = cleanMsg.match(/thêm\s+món\s+(.+?)\s+vào\s+thực\s+đơn/i);
      if (match && match[1]) {
        const dishName = match[1].trim();
        if (dishName.length > 0 && !dishName.match(/^(ngày|hôm|mai|nay)/i)) {
          logger.info("Extracted dish name (pattern 1):", { dishName });
          return dishName;
        }
      }

      // Pattern 2: "thêm món X vào menu"
      match = cleanMsg.match(/thêm\s+món\s+(.+?)\s+vào\s+menu/i);
      if (match && match[1]) {
        const dishName = match[1].trim();
        if (dishName.length > 0) {
          logger.info("Extracted dish name (pattern 2):", { dishName });
          return dishName;
        }
      }

      // Pattern 3: "thêm món X vào ngày mai/hôm nay"
      match = cleanMsg.match(
        /thêm\s+món\s+(.+?)\s+vào\s+(?:ngày\s+mai|hôm\s+nay)/i
      );
      if (match && match[1]) {
        const dishName = match[1].trim();
        if (dishName.length > 0) {
          logger.info("Extracted dish name (pattern 3):", { dishName });
          return dishName;
        }
      }

      // Pattern 4: "thêm món X vào" (catch-all for "vào")
      match = cleanMsg.match(/thêm\s+món\s+(.+?)\s+vào/i);
      if (match && match[1]) {
        let dishName = match[1].trim();
        // Remove common trailing words
        dishName = dishName.replace(/\s+(thực\s+đơn|menu|ngày|hôm)$/i, "");
        if (dishName.length > 0 && !dishName.match(/^(ngày|hôm|mai|nay)/i)) {
          logger.info("Extracted dish name (pattern 4):", { dishName });
          return dishName;
        }
      }

      // Pattern 5: "thêm món X" (fallback - everything after "món" until end or "vào"/"khỏi")
      match = cleanMsg.match(/thêm\s+món\s+([^\n]+?)(?:\s+vào|\s+khỏi|\s*$)/i);
      if (match && match[1]) {
        let dishName = match[1].trim();
        // Remove common trailing words
        dishName = dishName.replace(
          /\s+(vào|khỏi|thực\s+đơn|menu|ngày|hôm|mai|nay)$/i,
          ""
        );
        if (dishName.length > 0 && dishName.length < 100) {
          logger.info("Extracted dish name (pattern 5):", { dishName });
          return dishName;
        }
      }

      // Pattern 6: "xóa món X"
      match = cleanMsg.match(/xóa\s+món\s+([^\n]+?)(?:\s+khỏi|\s+vào|\s*$)/i);
      if (match && match[1]) {
        let dishName = match[1].trim();
        dishName = dishName.replace(
          /\s+(khỏi|vào|thực\s+đơn|menu|ngày|hôm|mai|nay)$/i,
          ""
        );
        if (dishName.length > 0 && dishName.length < 100) {
          logger.info("Extracted dish name (pattern 6):", { dishName });
          return dishName;
        }
      }

      logger.warn("Could not extract dish name from message:", {
        message: cleanMsg.substring(0, 50),
      });
      return null;
    };

    if (hasAdd && isRandom) {
      // For random add, fetch a random dish immediately
      try {
        const targetDate = parseDateFromMessage(messageText);
        const [allDishes, existingMenu] = await Promise.all([
          getDishes(),
          getMenuItems(targetDate),
        ]);

        if (!allDishes || allDishes.length === 0) {
          return {
            type: "add",
            prompt:
              "Hiện chưa có món ăn nào trong cơ sở dữ liệu. Vui lòng thêm món vào hệ thống trước.",
            confirmLabel: "Thêm",
            cancelLabel: "Huỷ",
            confirmVariant: "primary",
          };
        }

        const existingDishIds = new Set(
          (existingMenu || []).map((item) => String(item.ma_mon_an))
        );

        const availableDishes = allDishes.filter(
          (dish) => !existingDishIds.has(String(dish.id))
        );

        if (availableDishes.length === 0) {
          return {
            type: "add",
            prompt: `Tất cả các món đã có trong thực đơn. Không có món nào để thêm ngẫu nhiên.`,
            confirmLabel: "Thêm",
            cancelLabel: "Huỷ",
            confirmVariant: "primary",
          };
        }

        // Pick a random dish
        const randomDish =
          availableDishes[Math.floor(Math.random() * availableDishes.length)];

        return {
          type: "add",
          prompt: `Mình đã chọn món **${randomDish.ten_mon_an}** để thêm vào thực đơn. Bạn xác nhận thêm món này chứ?`,
          confirmLabel: "Thêm",
          cancelLabel: "Huỷ",
          confirmVariant: "primary",
          selectedDish: randomDish,
        };
      } catch (error) {
        logger.error("Error fetching random dish:", error);
        return {
          type: "add",
          prompt:
            "Mình sẽ chọn một món ngẫu nhiên như bạn yêu cầu. Bạn xác nhận thêm món này chứ?",
          confirmLabel: "Thêm",
          cancelLabel: "Huỷ",
          confirmVariant: "primary",
        };
      }
    }

    if (hasAdd) {
      // Try to extract and find specific dish
      const dishNameFromMsg = extractDishName(messageText);

      if (dishNameFromMsg) {
        try {
          const allDishes = await getDishes();

          if (allDishes && allDishes.length > 0) {
            // Normalize dish name for matching
            const normalizedDishName = dishNameFromMsg
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .trim();

            // Find dish by name (fuzzy match)
            const matchedDish = allDishes.find((dish) => {
              const normalizedDbDishName = dish.ten_mon_an
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();

              return (
                normalizedDbDishName.includes(normalizedDishName) ||
                normalizedDishName.includes(normalizedDbDishName)
              );
            });

            if (matchedDish) {
              return {
                type: "add",
                prompt: `Bạn muốn thêm món **${matchedDish.ten_mon_an}** vào thực đơn chứ?`,
                confirmLabel: "Thêm",
                cancelLabel: "Huỷ",
                confirmVariant: "primary",
                selectedDish: matchedDish,
              };
            }
          }
        } catch (error) {
          logger.error("Error fetching dish for confirmation:", error);
        }
      }

      // Fallback: if dish name was extracted but not found in database, still use the name
      if (dishNameFromMsg) {
        const targetDate = parseDateFromMessage(messageText);
        const today = new Date().toISOString().split("T")[0];
        const dateText = targetDate === today ? "hôm nay" : "ngày mai";

        return {
          type: "add",
          prompt: `Bạn muốn thêm món **${dishNameFromMsg}** vào thực đơn ${dateText} chứ?`,
          confirmLabel: "Thêm",
          cancelLabel: "Huỷ",
          confirmVariant: "primary",
          dishName: dishNameFromMsg, // Store dish name even if not found in DB
        };
      }

      // Fallback to generic prompt if dish name not extracted
      return {
        type: "add",
        prompt: "Bạn muốn mình thêm món theo yêu cầu này vào thực đơn không?",
        confirmLabel: "Thêm",
        cancelLabel: "Huỷ",
        confirmVariant: "primary",
      };
    }

    if (hasRemove) {
      try {
        const targetDate = parseDateFromMessage(messageText);
        const today = new Date().toISOString().split("T")[0];
        const dateText = targetDate === today ? "hôm nay" : "ngày mai";
        const existingMenu = await getMenuItems(targetDate);

        // Check if user wants to remove ALL dishes
        const removeAllKeywords = [
          "toan bo",
          "tat ca",
          "het",
          "all",
          "moi mon",
          "tong",
          "toàn bộ",
          "tất cả",
          "hết",
          "mọi món",
        ];
        const shouldRemoveAll = removeAllKeywords.some((keyword) =>
          normalized.includes(keyword)
        );

        if (shouldRemoveAll) {
          // Remove ALL dishes
          if (!existingMenu || existingMenu.length === 0) {
            return {
              type: "remove",
              prompt: `Thực đơn ${dateText} hiện không có món nào để xóa.`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
            };
          }

          const dishNames = existingMenu
            .map((item) => item.ten_mon_an)
            .filter((name): name is string => !!name);

          if (dishNames.length === 0) {
            return {
              type: "remove",
              prompt: `Thực đơn ${dateText} hiện không có món nào để xóa.`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
            };
          }

          if (dishNames.length === 1) {
            return {
              type: "remove",
              prompt: `Bạn muốn xóa món **${dishNames[0]}** khỏi thực đơn ${dateText} chứ?`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
              dishName: dishNames[0],
            };
          }

          // Show list of dishes to be removed
          const dishList =
            dishNames.length <= 5
              ? dishNames.map((name) => `• **${name}**`).join("\n")
              : `${dishNames
                  .slice(0, 5)
                  .map((name) => `• **${name}**`)
                  .join("\n")}\n• ... và ${dishNames.length - 5} món khác`;

          return {
            type: "remove",
            prompt: `Bạn muốn xóa **${dishNames.length} món** khỏi thực đơn ${dateText}:\n\n${dishList}\n\nBạn có chắc chắn không?`,
            confirmLabel: "Xóa tất cả",
            cancelLabel: "Huỷ",
            confirmVariant: "danger",
            dishNames: dishNames,
          };
        }

        // Check for random remove
        if (isRandom) {
          if (!existingMenu || existingMenu.length === 0) {
            return {
              type: "remove",
              prompt: `Thực đơn ${dateText} hiện không có món nào để xóa.`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
            };
          }

          // Pick a random dish to remove
          const availableMenuItems = existingMenu.filter(
            (item) => item.ten_mon_an
          );
          if (availableMenuItems.length === 0) {
            return {
              type: "remove",
              prompt: `Thực đơn ${dateText} hiện không có món nào để xóa.`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
            };
          }

          const randomMenuItem =
            availableMenuItems[
              Math.floor(Math.random() * availableMenuItems.length)
            ];

          return {
            type: "remove",
            prompt: `Mình sẽ xóa món **${randomMenuItem.ten_mon_an}** (món ngẫu nhiên) khỏi thực đơn ${dateText}. Bạn có chắc chắn không?`,
            confirmLabel: "Xóa",
            cancelLabel: "Huỷ",
            confirmVariant: "danger",
            dishName: randomMenuItem.ten_mon_an,
          };
        }

        // Try to extract and find specific dish for removal
        const dishNameFromMsg = extractDishName(messageText);

        if (dishNameFromMsg) {
          if (existingMenu && existingMenu.length > 0) {
            const normalizedDishName = dishNameFromMsg
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .trim();

            const matchedMenuItem = existingMenu.find((item) => {
              if (!item.ten_mon_an) return false;
              const normalizedMenuDishName = item.ten_mon_an
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();

              return (
                normalizedMenuDishName.includes(normalizedDishName) ||
                normalizedDishName.includes(normalizedMenuDishName)
              );
            });

            if (matchedMenuItem && matchedMenuItem.ten_mon_an) {
              return {
                type: "remove",
                prompt: `Bạn muốn xóa món **${matchedMenuItem.ten_mon_an}** khỏi thực đơn ${dateText} chứ?`,
                confirmLabel: "Xóa",
                cancelLabel: "Huỷ",
                confirmVariant: "danger",
                dishName: matchedMenuItem.ten_mon_an,
              };
            }
          }

          // Dish name extracted but not found in menu
          return {
            type: "remove",
            prompt: `Không tìm thấy món **${dishNameFromMsg}** trong thực đơn ${dateText}.`,
            confirmLabel: "Xóa",
            cancelLabel: "Huỷ",
            confirmVariant: "danger",
            dishName: dishNameFromMsg,
          };
        }

        // No dish name extracted - show current menu items
        if (existingMenu && existingMenu.length > 0) {
          const dishNames = existingMenu
            .map((item) => item.ten_mon_an)
            .filter((name): name is string => !!name);

          if (dishNames.length > 0) {
            return {
              type: "remove",
              prompt: `Bạn muốn xóa món nào khỏi thực đơn ${dateText}? Hiện có ${dishNames.length} món:\n\n${dishNames
                .slice(0, 10)
                .map((name, idx) => `${idx + 1}. **${name}**`)
                .join(
                  "\n"
                )}${dishNames.length > 10 ? `\n... và ${dishNames.length - 10} món khác` : ""}`,
              confirmLabel: "Xóa",
              cancelLabel: "Huỷ",
              confirmVariant: "danger",
            };
          }
        }

        // Fallback to generic prompt
        return {
          type: "remove",
          prompt: `Thực đơn ${dateText} hiện không có món nào.`,
          confirmLabel: "Xóa",
          cancelLabel: "Huỷ",
          confirmVariant: "danger",
        };
      } catch (error) {
        logger.error(
          "Error fetching menu items for removal confirmation:",
          error
        );
        return {
          type: "remove",
          prompt: "Bạn muốn mình xóa món theo yêu cầu này khỏi thực đơn chứ?",
          confirmLabel: "Xóa",
          cancelLabel: "Huỷ",
          confirmVariant: "danger",
        };
      }
    }

    return null;
  };

  // Detect if action buttons should be shown based on user message and AI response
  const detectActionButtons = (userMessage: string, aiResponse: string) => {
    const normalizedMsg = userMessage
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    // Clean response: remove markdown, emojis, special chars
    const cleanResponse = aiResponse
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[*_~`#]/g, "") // Remove markdown
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // Remove emojis
      .replace(/✨|🎲|•/g, "") // Remove specific symbols
      .toLowerCase()
      .trim();

    // Normalize multiple spaces to single space for better matching
    const normalizedResponse = cleanResponse.replace(/\s+/g, " ");

    const buttons: Message["actionButtons"] = [];

    // Check for add intent - show buttons AFTER action is done
    const addKeywords = ["them", "add"];
    const hasAdd = addKeywords.some((keyword) =>
      normalizedMsg.includes(keyword)
    );

    // Check for remove intent - show buttons AFTER action is done
    const removeKeywords = ["xoa", "remove", "delete"];
    const hasRemove = removeKeywords.some((keyword) =>
      normalizedMsg.includes(keyword)
    );

    const responseContains = (str: string) => normalizedResponse.includes(str);

    const hasSuccess =
      // For add actions
      (hasAdd &&
        (responseContains("da them") ||
          responseContains("da chon") ||
          responseContains("minh da chon") ||
          responseContains("minh da them"))) ||
      // For remove actions
      (hasRemove &&
        (responseContains("da xoa") || responseContains("minh da xoa"))) ||
      // Generic success
      responseContains("thanh cong") ||
      responseContains("hoan thanh");

    if (hasSuccess && hasAdd) {
      buttons.push(
        { label: "Thêm món khác", action: "add-more", variant: "primary" },
        { label: "Không, cảm ơn", action: "cancel", variant: "secondary" }
      );
    } else if (hasSuccess && hasRemove) {
      buttons.push(
        { label: "Xóa món khác", action: "remove-more", variant: "danger" },
        { label: "Không, cảm ơn", action: "cancel", variant: "secondary" }
      );
    }

    return buttons;
  };

  // Handle action button click
  const callChatAPI = async (
    messageText: string,
    sessionId: string | null,
    sessionUpdate?: {
      messageCountDelta: number;
      updateLastMessage?: boolean;
      updateTitle?: boolean;
    }
  ) => {
    setIsTyping(true);
    try {
      // Lấy conversation history (tối đa 20 tin nhắn gần nhất, loại bỏ welcome message)
      // Loại bỏ message cuối cùng nếu nó là user message giống với messageText (tránh duplicate)
      const filteredMessages = messages.filter((msg) => msg.id !== "welcome");

      // Kiểm tra message cuối cùng có phải là user message giống với messageText không
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      const shouldExcludeLast =
        lastMessage &&
        lastMessage.sender === "user" &&
        lastMessage.text === messageText;

      const messagesForHistory = shouldExcludeLast
        ? filteredMessages.slice(0, -1)
        : filteredMessages;

      const conversationHistory = messagesForHistory
        .slice(-20) // Lấy 20 tin nhắn gần nhất
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "chat",
          data: {
            message: messageText,
            conversationHistory: conversationHistory,
            context: context || {},
          },
        }),
      });

      const data = await response.json();

      // Detect if we need action buttons based on AI response
      const actionButtons = detectActionButtons(messageText, data.content);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.content || "Xin lỗi, tôi không thể trả lời lúc này.",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
        actionButtons,
        showActions: actionButtons.length > 0,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (sessionId && sessionUpdate) {
        const lastMessage =
          messageText.length > 50
            ? `${messageText.substring(0, 50)}...`
            : messageText;
        const titleSuggestion =
          messageText.length > 30
            ? `${messageText.substring(0, 30)}...`
            : messageText;

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messageCount:
                    s.messageCount + (sessionUpdate.messageCountDelta ?? 1),
                  lastMessage: sessionUpdate.updateLastMessage
                    ? lastMessage
                    : s.lastMessage,
                  title:
                    sessionUpdate.updateTitle &&
                    s.title === "Cuộc trò chuyện mới"
                      ? titleSuggestion
                      : s.title,
                }
              : s
          )
        );
      }
    } catch (error) {
      logger.error("Error calling AI API:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = async (messageId: string, action: string) => {
    // Hide the action buttons for this message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, showActions: false } : msg
      )
    );

    if (action.startsWith("confirm:")) {
      const pendingId = action.split(":")[1];
      const pending = pendingActions[pendingId];
      if (!pending) return;

      setPendingActions((prev) => {
        const { [pendingId]: _, ...rest } = prev;
        return rest;
      });

      setIsTyping(true);

      try {
        const targetDate =
          pending.targetDate || new Date().toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];
        const dateText = targetDate === today ? "hôm nay" : "ngày mai";

        // Handle add action - actually add dish to database
        if (pending.type === "add") {
          try {
            let dishToAdd: Dish | undefined = pending.selectedDish;
            const dishName =
              pending.selectedDish?.ten_mon_an || pending.dishName;

            // If no selectedDish but has dishName, try to find it in database
            if (!dishToAdd && pending.dishName) {
              logger.info("No selectedDish, trying to find dish in database:", {
                dishName: pending.dishName,
              });
              const allDishes = await getDishes();
              if (allDishes && allDishes.length > 0) {
                const normalizedDishName = pending.dishName
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim();

                dishToAdd = allDishes.find((dish) => {
                  const normalizedDbDishName = dish.ten_mon_an
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .trim();

                  return (
                    normalizedDbDishName.includes(normalizedDishName) ||
                    normalizedDishName.includes(normalizedDbDishName)
                  );
                });
              }
            }

            if (!dishToAdd) {
              // Dish not found in database
              logger.warn("Dish not found in database:", { dishName });
              const errorMessage: Message = {
                id: Date.now().toString(),
                text: `Xin lỗi, mình không tìm thấy món **${dishName || "này"}** trong cơ sở dữ liệu. Vui lòng thêm món vào hệ thống trước khi thêm vào thực đơn.`,
                sender: "bot",
                timestamp: new Date(),
                type: "text",
              };
              setMessages((prev) => [...prev, errorMessage]);
              return;
            }

            logger.info("Adding dish to menu:", {
              dishId: dishToAdd.id,
              dishName: dishToAdd.ten_mon_an,
              targetDate,
            });

            // Check if dish already exists in menu
            const existingMenu = await getMenuItems(targetDate);
            const existingMenuItem = existingMenu.find(
              (item) => item.ma_mon_an === dishToAdd!.id
            );

            if (existingMenuItem) {
              // Update servings if dish already exists
              logger.info("Dish exists, updating servings:", {
                menuItemId: existingMenuItem.id,
                currentServings: existingMenuItem.boi_so,
              });
              await updateMenuItem(existingMenuItem.id, {
                boi_so: (existingMenuItem.boi_so || 1) + 1,
              });
            } else {
              // Add new dish to menu
              logger.info("Dish does not exist, adding new dish");
              await addDishToMenu(dishToAdd.id, targetDate, 1);
            }

            // No response message - just add silently
            logger.info("Dish added successfully, no response message shown");
          } catch (error) {
            logger.error("Error adding dish to menu:", error);
            // Only show error message if something goes wrong
            const dishName =
              pending.selectedDish?.ten_mon_an || pending.dishName || "này";
            const errorMessage: Message = {
              id: Date.now().toString(),
              text: `Xin lỗi, có lỗi xảy ra khi thêm món **${dishName}** vào thực đơn. Vui lòng thử lại sau.`,
              sender: "bot",
              timestamp: new Date(),
              type: "text",
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
          // No session update needed since we're not adding any messages (except errors)
        }
        // Handle remove action - actually remove dish(es) from database
        else if (pending.type === "remove") {
          try {
            const existingMenu = await getMenuItems(targetDate);

            // Handle remove all dishes
            if (pending.dishNames && pending.dishNames.length > 0) {
              logger.info("Removing all dishes:", {
                count: pending.dishNames.length,
                dishNames: pending.dishNames,
                targetDate,
              });

              // Find all menu items to remove
              const menuItemsToRemove = existingMenu.filter((item) => {
                if (!item.ten_mon_an) return false;
                return pending.dishNames!.some(
                  (name) => item.ten_mon_an === name
                );
              });

              // Delete all dishes
              await Promise.all(
                menuItemsToRemove.map((item) => deleteMenuItem(item.id))
              );

              logger.info(
                `Removed ${menuItemsToRemove.length} dishes successfully, no response message shown`
              );
            }
            // Handle remove single dish
            else if (pending.dishName) {
              logger.info("Removing single dish:", {
                dishName: pending.dishName,
                targetDate,
              });

              const menuItemToRemove = existingMenu.find(
                (item) => item.ten_mon_an === pending.dishName
              );

              if (menuItemToRemove) {
                await deleteMenuItem(menuItemToRemove.id);
                logger.info(
                  "Dish removed successfully, no response message shown"
                );
              } else {
                // Only show error if dish not found
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  text: `Không tìm thấy món **${pending.dishName}** trong thực đơn ${dateText}.`,
                  sender: "bot",
                  timestamp: new Date(),
                  type: "text",
                };
                setMessages((prev) => [...prev, errorMessage]);
              }
            }
          } catch (error) {
            logger.error("Error removing dish(es) from menu:", error);
            // Only show error message if something goes wrong
            const dishName =
              pending.dishNames?.join(", ") || pending.dishName || "món";
            const errorMessage: Message = {
              id: Date.now().toString(),
              text: `Xin lỗi, có lỗi xảy ra khi xóa món khỏi thực đơn. Vui lòng thử lại sau.`,
              sender: "bot",
              timestamp: new Date(),
              type: "text",
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
          // No session update needed since we're not adding any messages (except errors)
        } else {
          // Fallback: if no specific dish selected, just do nothing silently
          // Don't call API to avoid showing response message
          logger.info("No specific dish selected, skipping action silently");
        }
      } catch (error) {
        logger.error("Error in handleActionClick:", error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
          sender: "bot",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    if (action.startsWith("cancel:")) {
      const pendingId = action.split(":")[1];
      const pending = pendingActions[pendingId];
      setPendingActions((prev) => {
        const { [pendingId]: _, ...rest } = prev;
        return rest;
      });
      // Không hiển thị tin nhắn khi huỷ
      return;
    }

    // Execute quick actions based on type
    if (action === "add-more") {
      handleSendMessage("thêm món ngẫu nhiên vào hôm nay");
    } else if (action === "remove-more") {
      handleSendMessage("xóa món ngẫu nhiên hôm nay");
    }
    // 'cancel' (legacy) just hides the buttons, no further action needed
  };

  const handleSendMessage = async (
    messageText: string,
    options?: { skipConfirmation?: boolean }
  ) => {
    if (!messageText.trim() || initializing) return;

    try {
      // Ensure a session exists before sending message
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: "Cuộc trò chuyện mới",
          timestamp: new Date(),
          messageCount: 0,
          lastMessage: "",
        };
        // Replace existing session (each user should only have one session)
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
        sessionId = newSession.id;
        setMessages([createWelcomeMessage()]);
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: "user",
        timestamp: new Date(),
        type: "text",
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);

      // Show typing indicator while detecting intent
      setIsTyping(true);

      let pendingIntent: PendingActionIntent | null = null;
      try {
        pendingIntent = options?.skipConfirmation
          ? null
          : await detectPendingActionIntent(messageText);
        logger.info("Detected pending intent:", {
          hasIntent: !!pendingIntent,
          type: pendingIntent?.type,
          hasSelectedDish: !!pendingIntent?.selectedDish,
        });
      } catch (error) {
        logger.error("Error detecting pending intent:", error);
        // Continue without confirmation if detection fails
        pendingIntent = null;
      } finally {
        setIsTyping(false);
      }

      const newMessages: Message[] = [];

      if (pendingIntent) {
        try {
          const pendingId = `pending-${Date.now()}`;
          logger.info("Creating confirmation message:", {
            pendingId,
            prompt: pendingIntent.prompt,
            hasSelectedDish: !!pendingIntent.selectedDish,
          });

          const confirmationMessage: Message = {
            id: pendingId,
            text: pendingIntent.prompt,
            sender: "bot",
            timestamp: new Date(),
            type: "text",
            actionButtons: [
              {
                label: pendingIntent.confirmLabel,
                action: `confirm:${pendingId}`,
                variant: pendingIntent.confirmVariant,
              },
              {
                label: pendingIntent.cancelLabel,
                action: `cancel:${pendingId}`,
                variant: "secondary",
              },
            ],
            showActions: true,
          };
          newMessages.push(confirmationMessage);

          setPendingActions((prev) => ({
            ...prev,
            [pendingId]: {
              originalMessage: messageText,
              sessionId,
              type: pendingIntent!.type,
              selectedDish: pendingIntent!.selectedDish,
              dishName: pendingIntent!.dishName,
              dishNames: pendingIntent!.dishNames,
              targetDate: parseDateFromMessage(messageText),
            },
          }));

          // Add confirmation message if any
          if (newMessages.length > 0) {
            logger.info("Adding confirmation message to chat:", {
              messageId: confirmationMessage.id,
              text: confirmationMessage.text.substring(0, 50),
            });
            setMessages((prev) => [...prev, ...newMessages]);
          }

          if (sessionId) {
            const lastMessage =
              messageText.length > 50
                ? `${messageText.substring(0, 50)}...`
                : messageText;
            const titleSuggestion =
              messageText.length > 30
                ? `${messageText.substring(0, 30)}...`
                : messageText;

            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      messageCount: s.messageCount + newMessages.length,
                      lastMessage,
                      title:
                        s.title === "Cuộc trò chuyện mới"
                          ? titleSuggestion
                          : s.title,
                    }
                  : s
              )
            );
          }
          logger.info("Pending intent processed, returning without API call");
          return;
        } catch (error) {
          logger.error("Error processing pending intent:", error);
          // Fall through to call API if there's an error processing intent
        }
      } else {
        logger.info("No pending intent detected, will call API");
      }

      // If no pending intent or error occurred, call API directly
      setIsTyping(true);
      await callChatAPI(messageText, sessionId, {
        messageCountDelta: 2,
        updateLastMessage: true,
        updateTitle: true,
      });
    } catch (error) {
      logger.error("Error in handleSendMessage:", error);
      setIsTyping(false);
      // Show error message to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleFeatureRequest = async (feature: string, data?: unknown) => {
    if (initializing) return;

    // Handle special case for opening shopping page
    if (feature === "open-shopping") {
      window.open("/shopping", "_blank");
      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: feature,
          data: data || {},
        }),
      });

      const result = await response.json();

      const botMessage: Message = {
        id: Date.now().toString(),
        text: `Đây là kết quả từ tính năng ${getFeatureName(feature)}:`,
        sender: "bot",
        timestamp: new Date(),
        type: "ai-result",
        aiData: {
          type: feature,
          content: result.content,
          suggestions: result.suggestions,
          error: result.error,
        },
      };

      setMessages((prev) => [...prev, botMessage]);

      // Call the parent callback if provided
      if (onFeatureSelect) {
        onFeatureSelect(feature, result);
      }
    } catch (error) {
      logger.error("Error calling AI feature:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getFeatureName = (feature: string): string => {
    switch (feature) {
      case "suggest-dishes":
        return "Gợi ý món ăn";
      case "weekly-plan":
        return "Lập kế hoạch tuần";
      case "advanced-meal-plan":
        return "Kế hoạch bữa ăn nâng cao";
      case "seasonal-recommendations":
        return "Gợi ý món ăn theo mùa";
      case "special-occasions":
        return "Menu dịp đặc biệt";
      case "personalized-learning":
        return "Học từ sở thích cá nhân";
      case "shopping-list":
        return "Danh sách mua sắm";
      case "generate-recipe":
        return "Tạo công thức";
      case "open-shopping":
        return "Mở trang Shopping";
      default:
        return "Tính năng AI";
    }
  };

  const handleRegenerate = (messageId: string) => {
    // Find the message and regenerate its content
    const message = messages.find((m) => m.id === messageId);
    if (message && message.aiData) {
      handleFeatureRequest(message.aiData.type);
    }
  };

  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    logger.info(`Feedback ${type} for message ${messageId}`);
    // In a real app, you would send this feedback to your backend
  };

  const handleClearChatHistory = () => {
    setShowProfileMenu(false);

    // Clear all sessions and messages from localStorage
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(window.localStorage);
        keys.forEach((key) => {
          if (
            key.startsWith("planner.messages.") ||
            key === "planner.sessions" ||
            key === "planner.currentSessionId"
          ) {
            window.localStorage.removeItem(key);
          }
        });
      }

      // Reset state
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([createWelcomeMessage()]);

      logger.info("Chat history cleared successfully");
    } catch (error) {
      logger.error("Failed to clear chat history", error);
    }
  };

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      if (!supabase) {
        logger.warn("Supabase client not available");
        window.location.href = "/planner";
        return;
      }
      await supabase.auth.signOut();
      logger.info("User logged out successfully");
      // Redirect to planner page (will show login form after logout)
      window.location.href = "/planner";
    } catch (error) {
      logger.error("Failed to logout", error);
      // Even if logout fails, redirect to planner
      window.location.href = "/planner";
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
              onActionClick={(action) => handleActionClick(message.id, action)}
            />
          ))}

          {isTyping && (
            <ChatMessage
              message={{
                id: "typing",
                text: "",
                sender: "bot",
                timestamp: new Date(),
                type: "text",
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
