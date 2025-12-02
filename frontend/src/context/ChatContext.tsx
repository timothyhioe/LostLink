import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import io, { type Socket } from 'socket.io-client'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  content: string
  timestamp: string
  read: boolean
}

export interface ChatRoom {
  roomId: string
  userId1: string
  userId2: string
  userName1: string
  userName2: string
}

export interface ChatConversation {
  userId: string
  userName: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

interface ChatContextType {
  socket: Socket | null
  isConnected: boolean
  messages: ChatMessage[]
  sendMessage: (recipientId: string, content: string) => void
  joinChat: (recipientId: string, recipientName: string) => void
  leaveChat: (recipientId: string) => void
  markAsRead: (roomId: string) => void
  getCurrentUserId: () => string | null
  unreadNotifications: Map<string, { senderName: string; content: string; timestamp: string }>
  conversations: ChatConversation[]
  addConversation: (userId: string, userName: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState<Map<string, { senderName: string; content: string; timestamp: string }>>(new Map())
  const [conversations, setConversations] = useState<ChatConversation[]>([])

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('chatConversations')
    if (savedConversations) {
      try {
        setConversations(JSON.parse(savedConversations))
      } catch (e) {
        console.error('[Chat] Failed to parse saved conversations')
      }
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      console.log('[Chat] No auth token or user found')
      return
    }

    const parsedUser = JSON.parse(user)
    const userId = parsedUser._id || parsedUser.id
    const userName = parsedUser.name || 'Unknown'

    console.log(`[Chat] Initializing Socket.IO - userId: ${userId}, userName: ${userName}`)

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
    console.log(`[Chat] Connecting to: ${socketUrl}`)
    
    const newSocket = io(socketUrl, {
      auth: {
        token: token,
        userId: userId,
        userName: userName
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    newSocket.on('connect', () => {
      console.log(`[Chat] Socket connected: ${newSocket.id}`)
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('[Chat] Socket disconnected')
      setIsConnected(false)
    })

    // Listen for incoming messages
    newSocket.on('receive_message', (message: ChatMessage) => {
      console.log(`[Chat] Received message from ${message.senderName}: \"${message.content}\"`)
      setMessages(prev => [...prev, message])
      
      // Update conversation list
      const senderId = message.senderId
      const senderName = message.senderName
      setConversations(prev => {
        const existingConv = prev.find(c => c.userId === senderId)
        const updated = existingConv
          ? prev.map(c =>
              c.userId === senderId
                ? { ...c, lastMessage: message.content, lastMessageTime: message.timestamp }
                : c
            )
          : [...prev, { userId: senderId, userName: senderName, lastMessage: message.content, lastMessageTime: message.timestamp, unreadCount: 0 }]
        localStorage.setItem('chatConversations', JSON.stringify(updated))
        return updated
      })
    })

    // Listen for message notifications (when recipient isn't in the room)
    newSocket.on('new_message_notification', (data: { senderId: string; senderName: string; content: string }) => {
      console.log(`[Chat] New message notification from ${data.senderName}: "${data.content}"`)
      setUnreadNotifications(prev => {
        const newMap = new Map(prev)
        newMap.set(data.senderId, {
          senderName: data.senderName,
          content: data.content,
          timestamp: new Date().toISOString()
        })
        return newMap
      })
    })

    // Listen for message history
    newSocket.on('message_history', (history: ChatMessage[]) => {
      console.log(`[Chat] Received message history: ${history.length} messages`)
      setMessages(history)
    })

    newSocket.on('user_joined', (data) => {
      console.log(`[Chat] User joined: ${data.userName}`)
    })

    newSocket.on('user_left', (data) => {
      console.log(`[Chat] User left: ${data.userName}`)
    })

    newSocket.on('error', (error: string) => {
      console.error(`[Chat] Socket error: ${error}`)
    })

    newSocket.on('connect_error', (error) => {
      console.error(`[Chat] Connection error: ${error}`)
    })

    setSocket(newSocket)

    return () => {
      console.log('[Chat] Cleaning up socket connection')
      newSocket.disconnect()
    }
  }, [])

  const sendMessage = (recipientId: string, content: string) => {
    if (!socket || !isConnected) {
      console.error('[Chat] Cannot send message - socket not connected or invalid')
      return
    }

    const user = localStorage.getItem('user')
    if (!user) {
      console.error('[Chat] Cannot send message - no user in localStorage')
      return
    }

    const parsedUser = JSON.parse(user)
    const senderId = parsedUser._id || parsedUser.id
    const senderName = parsedUser.name || 'Unknown'

    console.log(`[Chat] Sending message - to: ${recipientId}, content: "${content}"`)

    socket.emit('send_message', {
      senderId,
      senderName,
      recipientId,
      content,
      timestamp: new Date().toISOString()
    })
  }

  const getRoomId = (userId1: string, userId2: string): string => {
    return [userId1, userId2].sort().join('-')
  }

  const joinChat = (recipientId: string, recipientName: string) => {
    if (!socket || !isConnected) {
      console.error('[Chat] Cannot join chat - socket not connected')
      return
    }

    const user = localStorage.getItem('user')
    if (!user) return

    const parsedUser = JSON.parse(user)
    const userId = parsedUser._id || parsedUser.id
    const roomId = getRoomId(userId, recipientId)

    console.log(`[Chat] Joining room: ${roomId} with ${recipientName}`)
    setCurrentRoom(roomId)
    setMessages([])
    
    // Clear notification for this sender
    setUnreadNotifications(prev => {
      const newMap = new Map(prev)
      newMap.delete(recipientId)
      return newMap
    })

    socket.emit('join_chat', {
      recipientId,
      recipientName
    })
  }

  const leaveChat = (recipientId: string) => {
    if (!socket) return

    const user = localStorage.getItem('user')
    if (!user) return

    const parsedUser = JSON.parse(user)
    const userId = parsedUser._id || parsedUser.id
    const roomId = getRoomId(userId, recipientId)

    console.log(`[Chat] Leaving room: ${roomId}`)
    setCurrentRoom(null)
    setMessages([])

    socket.emit('leave_chat', {
      recipientId
    })
  }

  const addConversation = (userId: string, userName: string) => {
    console.log(`[Chat] Adding conversation with ${userName} (${userId})`)
    setConversations(prev => {
      const exists = prev.find(c => c.userId === userId)
      if (exists) return prev
      const updated = [{ userId, userName, unreadCount: 0 }, ...prev]
      localStorage.setItem('chatConversations', JSON.stringify(updated))
      return updated
    })
  }

  const markAsRead = (roomId: string) => {
    if (!socket) return
    socket.emit('mark_as_read', { roomId })
  }

  const getCurrentUserId = () => {
    const user = localStorage.getItem('user')
    if (!user) return null
    const parsedUser = JSON.parse(user)
    return parsedUser._id || parsedUser.id
  }

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
        addConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}
