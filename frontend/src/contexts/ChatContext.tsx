import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import io, { type Socket } from "socket.io-client";

/* eslint-disable react-refresh/only-export-components */

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ChatRoom {
  roomId: string;
  userId1: string;
  userId2: string;
  userName1: string;
  userName2: string;
}

export interface ChatConversation {
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  itemId?: string;
  itemTitle?: string;
}

interface ChatContextType {
  socket: Socket | null;
  isConnected: boolean;
  messages: ChatMessage[];
  sendMessage: (recipientId: string, content: string) => void;
  joinChat: (recipientId: string, recipientName: string) => void;
  leaveChat: (recipientId: string) => void;
  markAsRead: (roomId: string) => void;
  getCurrentUserId: () => string | null;
  unreadNotifications: Record<
    string,
    { senderName: string; content: string; timestamp: string }
  >;
  conversations: ChatConversation[];
  addConversation: (userId: string, userName: string) => void;
  deleteConversation: (userId: string) => void;
  currentRoom: string | null;
  selectedConversationId: string | null;
  setSelectedConversation: (userId: string | null, userName?: string) => void;
  openChatWithUser: (userId: string, userName: string, itemId?: string, itemTitle?: string) => void;
  chatOpenTrigger: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<
    Record<string, { senderName: string; content: string; timestamp: string }>
  >({});
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    // Load conversations from localStorage on initialization
    const savedConversations = localStorage.getItem("chatConversations");
    if (savedConversations) {
      try {
        return JSON.parse(savedConversations);
      } catch {
        console.error("[Chat] Failed to parse saved conversations");
        return [];
      }
    }
    return [];
  });
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [chatOpenTrigger, setChatOpenTrigger] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      return;
    }

    const parsedUser = JSON.parse(user);
    const userId = parsedUser.id || parsedUser._id;
    const userName = parsedUser.name || "Unknown";

    // Load conversations from database on startup
    const loadConversationsFromDB = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/api/chat/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(
            "[Chat] Loaded conversations from database:",
            data.conversations
          );
          
          // Get localStorage conversations to preserve itemId/itemTitle
          const localStorageConvs = (() => {
            try {
              const saved = localStorage.getItem("chatConversations");
              return saved ? JSON.parse(saved) : [];
            } catch {
              return [];
            }
          })();
          
          // Merge DB conversations with localStorage, preserving itemId/itemTitle from localStorage
          const filteredConversations = data.conversations.filter(
            (conv: ChatConversation) => conv.userId !== userId
          ).map((dbConv: ChatConversation) => {
            const localConv = localStorageConvs.find((c: ChatConversation) => c.userId === dbConv.userId);
            return {
              ...dbConv,
              itemId: localConv?.itemId,
              itemTitle: localConv?.itemTitle,
            };
          });
          
          setConversations(filteredConversations);
          localStorage.setItem("chatConversations", JSON.stringify(filteredConversations));
        }
      } catch (error) {
        console.error(
          "[Chat] Failed to load conversations from database:",
          error
        );
      }
    };

    loadConversationsFromDB();

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const newSocket = io(socketUrl, {
      auth: {
        token: token,
        userId: userId,
        userName: userName,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
      autoConnect: true,
      rejectUnauthorized: false,
    });

    newSocket.on("connect", () => {
      console.log("[Chat] Connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[Chat] Disconnected");
      setIsConnected(false);
    });

    // Listen for incoming messages
    newSocket.on("receive_message", (message: ChatMessage & { itemId?: string; itemTitle?: string }) => {
      console.log(
        `[Message] Received from ${message.senderName}: "${message.content}"`,
        { itemId: message.itemId, itemTitle: message.itemTitle }
      );
      setMessages((prev) => [...prev, message]);

      // Don't create conversation with yourself
      if (message.senderId === userId) {
        return;
      }

      // Update or create conversation
      setConversations((prev) => {
        const senderId = message.senderId;
        const existingConv = prev.find((c) => c.userId === senderId);

        if (existingConv) {
          // Update existing conversation with latest message and itemId/itemTitle if provided
          const updated = prev.map((c) =>
            c.userId === senderId
              ? {
                  ...c,
                  lastMessage: message.content,
                  lastMessageTime: message.timestamp,
                  // Update itemId/itemTitle if provided in message
                  itemId: message.itemId || c.itemId,
                  itemTitle: message.itemTitle || c.itemTitle,
                }
              : c
          );
          localStorage.setItem("chatConversations", JSON.stringify(updated));
          return updated;
        } else {
          // Create new conversation from received message
          const updated = [
            ...prev,
            {
              userId: senderId,
              userName: message.senderName,
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              unreadCount: 0,
              itemId: message.itemId,
              itemTitle: message.itemTitle,
            },
          ];
          localStorage.setItem("chatConversations", JSON.stringify(updated));
          return updated;
        }
      });
    });

    // Listen for message notifications (when recipient isn't in the room)
    newSocket.on(
      "new_message_notification",
      (data: { senderId: string; senderName: string; content: string; itemId?: string; itemTitle?: string }) => {
        console.log(`[Notification] Message from ${data.senderName}`, { itemId: data.itemId, itemTitle: data.itemTitle });

        // Don't create conversation with yourself
        if (data.senderId === userId) {
          return;
        }

        // Add to unread notifications
        setUnreadNotifications((prev) => ({
          ...prev,
          [data.senderId]: {
            senderName: data.senderName,
            content: data.content,
            timestamp: new Date().toISOString(),
          },
        }));

        // Update or create conversation
        setConversations((prev) => {
          const existingConv = prev.find((c) => c.userId === data.senderId);

          if (existingConv) {
            // Update existing conversation
            const updated = prev.map((conv) => {
              if (conv.userId === data.senderId) {
                return {
                  ...conv,
                  unreadCount: conv.unreadCount + 1,
                  lastMessage: data.content,
                  lastMessageTime: new Date().toISOString(),
                  // Update itemId/itemTitle if provided
                  itemId: data.itemId || conv.itemId,
                  itemTitle: data.itemTitle || conv.itemTitle,
                };
              }
              return conv;
            });
            localStorage.setItem("chatConversations", JSON.stringify(updated));
            return updated;
          } else {
            // Create new conversation from notification
            const updated = [
              ...prev,
              {
                userId: data.senderId,
                userName: data.senderName,
                lastMessage: data.content,
                lastMessageTime: new Date().toISOString(),
                unreadCount: 1,
                itemId: data.itemId,
                itemTitle: data.itemTitle,
              },
            ];
            localStorage.setItem("chatConversations", JSON.stringify(updated));
            return updated;
          }
        });
      }
    );

    // Listen for message history
    newSocket.on("message_history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    newSocket.on("error", (error: string) => {
      console.error(`[Chat Error] ${error}`);
    });

    newSocket.on("connect_error", (error) => {
      console.error(`[Connection Error] ${error}`);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Sync conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chatConversations", JSON.stringify(conversations));
  }, [conversations]);

  const sendMessage = (recipientId: string, content: string) => {
    if (!socket || !isConnected) {
      return;
    }

    const user = localStorage.getItem("user");
    if (!user) {
      return;
    }

    const parsedUser = JSON.parse(user);
    const senderId = parsedUser.id || parsedUser._id;
    const senderName = parsedUser.name || "Unknown";

    // Prevent self-messages
    if (senderId === recipientId) {
      console.warn("[Chat] Cannot send messages to yourself");
      return;
    }

    // Get itemId from current conversation if available
    const conversation = conversations.find(c => c.userId === recipientId);
    const itemId = conversation?.itemId;
    const itemTitle = conversation?.itemTitle;

    socket.emit("send_message", {
      senderId,
      senderName,
      recipientId,
      content,
      timestamp: new Date().toISOString(),
      itemId,
      itemTitle,
    });
  };

  const getRoomId = (userId1: string, userId2: string): string => {
    return [userId1, userId2].sort().join("-");
  };

  const joinChat = (recipientId: string, recipientName: string) => {
    if (!socket || !isConnected) {
      return;
    }

    const user = localStorage.getItem("user");
    if (!user) return;

    const parsedUser = JSON.parse(user);
    const userId = parsedUser.id || parsedUser._id;
    const roomId = getRoomId(userId, recipientId);

    setCurrentRoom(roomId);
    setMessages([]);

    // Clear notification for this sender
    setUnreadNotifications((prev) => {
      const updated = { ...prev };
      delete updated[recipientId];
      return updated;
    });

    // Reset unread count for this conversation
    setConversations((prev) => {
      return prev.map((conv) => {
        if (conv.userId === recipientId) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      });
    });

    // Mark messages as read in database
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`http://localhost:3000/api/chat/mark-read/${recipientId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) =>
        console.error("[Chat] Failed to mark messages as read:", err)
      );
    }

    socket.emit("join_chat", {
      recipientId,
      recipientName,
    });
  };

  const leaveChat = (recipientId: string) => {
    if (!socket) return;

    const user = localStorage.getItem("user");
    if (!user) return;

    setCurrentRoom(null);
    setMessages([]);

    socket.emit("leave_chat", {
      recipientId,
    });
  };

  const openChatWithUser = (userId: string, userName: string, itemId?: string, itemTitle?: string) => {
    console.log(`[Chat] Chatting with ${userName}`, { itemId, itemTitle });
    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c.userId === userId);
      if (existingIndex !== -1) {
        // Update existing conversation with item info if provided
        if (itemId || itemTitle) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            itemId: itemId || updated[existingIndex].itemId,
            itemTitle: itemTitle || updated[existingIndex].itemTitle,
          };
          localStorage.setItem("chatConversations", JSON.stringify(updated));
          return updated;
        }
        return prev;
      }
      // Create new conversation
      const updated = [{ userId, userName, unreadCount: 0, itemId, itemTitle }, ...prev];
      localStorage.setItem("chatConversations", JSON.stringify(updated));
      return updated;
    });
    // Select this conversation immediately
    setSelectedConversationId(userId);
    // Trigger chat modal to open
    setChatOpenTrigger((prev) => prev + 1);
  };

  const setSelectedConversation = (
    userId: string | null,
    userName?: string
  ) => {
    setSelectedConversationId(userId);
    if (userId && userName) {
      // Ensure conversation exists
      setConversations((prev) => {
        const exists = prev.find((c) => c.userId === userId);
        if (!exists) {
          const updated = [{ userId, userName, unreadCount: 0 }, ...prev];
          localStorage.setItem("chatConversations", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  };

  const markAsRead = (roomId: string) => {
    if (!socket) return;
    socket.emit("mark_as_read", { roomId });
  };

  const deleteConversation = (userId: string) => {
    // Delete chat history from database
    const token = localStorage.getItem("authToken");
    if (token) {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      fetch(`${apiUrl}/api/chat/conversation/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          console.log("[Chat] Successfully deleted conversation from database for user:", userId);
          return response.json();
        })
        .catch((err) =>
          console.error("[Chat] Failed to delete conversation from database:", err)
        );
    } else {
      console.warn("[Chat] No auth token available, skipping database deletion");
    }

    // Remove from conversations list
    setConversations((prev) => {
      const updated = prev.filter((c) => c.userId !== userId);
      localStorage.setItem("chatConversations", JSON.stringify(updated));
      console.log("[Chat] Removed conversation from UI for user:", userId);
      return updated;
    });
    // If this is the currently selected conversation, deselect it
    if (selectedConversationId === userId) {
      setSelectedConversationId(null);
      console.log("[Chat] Deselected conversation");
    }
  };

  const addConversation = (userId: string, userName: string) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.userId === userId);
      if (exists) return prev;
      const updated = [{ userId, userName, unreadCount: 0 }, ...prev];
      localStorage.setItem("chatConversations", JSON.stringify(updated));
      return updated;
    });
  };

  const getCurrentUserId = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    const parsedUser = JSON.parse(user);
    return parsedUser.id || parsedUser._id;
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        isConnected,
        messages,
        sendMessage,
        joinChat,
        leaveChat,
        markAsRead,
        getCurrentUserId,
        unreadNotifications,
        conversations,
        addConversation,
        deleteConversation,
        currentRoom,
        selectedConversationId,
        setSelectedConversation,
        openChatWithUser,
        chatOpenTrigger,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}

export { ChatContext };
