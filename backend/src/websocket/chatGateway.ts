import type { Server, Socket } from 'socket.io'
import { logger } from '../utils/logger'
import { db } from '../config/database'
import { chatMessages } from '../db/schema/chat'
import { and, eq, or, desc } from 'drizzle-orm'

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  content: string
  timestamp: string
  read: boolean
}

// Store active connections
const userConnections: Map<string, string> = new Map()

function getRoomId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-')
}

// Load chat history from database
async function loadChatHistory(userId1: string, userId2: string): Promise<ChatMessage[]> {
  try {
    logger.info(`[Chat] Loading chat history for users: ${userId1} and ${userId2}`)
    
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          and(
            eq(chatMessages.senderId, userId1),
            eq(chatMessages.recipientId, userId2)
          ),
          and(
            eq(chatMessages.senderId, userId2),
            eq(chatMessages.recipientId, userId1)
          )
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(100)
      .execute()

    logger.info(`[Chat] Retrieved ${messages.length} messages from database`)
    
    // Reverse to get chronological order
    return messages.reverse().map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: '', // Will be filled by frontend
      recipientId: msg.recipientId,
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      read: msg.read ?? false
    }))
  } catch (error) {
    logger.error('[Chat] Error loading chat history from database:', error)
    logger.error('[Chat] Error details:', { userId1, userId2, errorMessage: error instanceof Error ? error.message : String(error) })
    return []
  }
}

// Save message to database
async function saveMessageToDatabase(message: ChatMessage): Promise<void> {
  try {
    logger.info(`[Chat] Attempting to save message: senderId=${message.senderId}, recipientId=${message.recipientId}, content="${message.content.substring(0, 50)}"`)
    
    const result = await db.insert(chatMessages).values({
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      read: message.read,
      createdAt: new Date(message.timestamp),
      updatedAt: new Date(message.timestamp)
    }).returning()
    
    logger.info(`[Chat] Message saved successfully to database:`, result)
  } catch (error) {
    logger.error('[Chat] Error saving message to database:', error)
    logger.error('[Chat] Error details:', { 
      message: error instanceof Error ? error.message : String(error),
      senderId: message.senderId,
      recipientId: message.recipientId
    })
  }
}

export function registerChatGateway(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId
    const userName = socket.handshake.auth?.userName || 'Unknown'

    logger.info(`[SOCKET.IO] New connection attempt - userId: ${userId}, socketId: ${socket.id}`)

    if (userId) {
      userConnections.set(userId, socket.id)
      logger.info(`[SOCKET.IO] User ${userId} (${userName}) connected - socketId: ${socket.id}`)
      logger.info(`[SOCKET.IO] Total active connections: ${userConnections.size}`)
    }

    // Handle user joining a chat room
    socket.on('join_chat', async (data: { recipientId: string; recipientName: string }) => {
      const { recipientId, recipientName } = data

      logger.info(`[SOCKET.IO] join_chat event - from: ${userId}, to: ${recipientId}`)

      if (!userId) {
        logger.warn(`[SOCKET.IO] join_chat failed - user not authenticated`)
        socket.emit('error', 'User not authenticated')
        return
      }

      const roomId = getRoomId(userId, recipientId)
      socket.join(roomId)

      logger.info(`[SOCKET.IO] User ${userId} joined room: ${roomId}`)

      // Load message history from database
      const history = await loadChatHistory(userId, recipientId)
      logger.info(`[SOCKET.IO] Sending message history to ${userId} - ${history.length} messages`)
      socket.emit('message_history', history)

      // Notify the other user that someone joined
      logger.info(`[SOCKET.IO] Broadcasting user_joined to room ${roomId}`)
      socket.to(roomId).emit('user_joined', {
        userId,
        userName: userName || 'Unknown'
      })
    })

    // Handle incoming messages
    socket.on('send_message', async (data: {
      senderId: string;
      senderName: string;
      recipientId: string;
      content: string;
      timestamp: string;
    }) => {
      const { senderId, senderName, recipientId, content, timestamp } = data

      logger.info(`[SOCKET.IO] send_message event - from: ${senderId}, to: ${recipientId}, content: "${content}"`)

      // Prevent self-messages
      if (senderId === recipientId) {
        logger.warn(`[SOCKET.IO] Blocked self-message attempt - senderId: ${senderId}`)
        socket.emit('error', 'Cannot send messages to yourself')
        return
      }

      if (!senderId || !content) {
        logger.warn(`[SOCKET.IO] send_message validation failed - senderId: ${senderId}, content length: ${content?.length}`)
        socket.emit('error', 'Invalid message data')
        return
      }

      const roomId = getRoomId(senderId, recipientId)

      const message: ChatMessage = {
        id: `msg-${Date.now()}`, // Temporary ID for frontend, database generates real UUID
        senderId,
        senderName,
        recipientId,
        content,
        timestamp,
        read: false
      }

      // Save message to database
      await saveMessageToDatabase(message)

      logger.info(`[SOCKET.IO] Message saved to database - roomId: ${roomId}, messageId: ${message.id}`)
      logger.info(`[SOCKET.IO] Broadcasting receive_message to room: ${roomId}`)

      // Emit to all users in the room
      io.to(roomId).emit('receive_message', message)

      // Also send a direct notification to the recipient user (not just the room)
      const recipientSocketId = userConnections.get(recipientId)
      if (recipientSocketId) {
        logger.info(`[SOCKET.IO] Sending new_message_notification to recipient ${recipientId} from ${senderName}`)
        io.to(recipientSocketId).emit('new_message_notification', {
          senderId,
          senderName,
          content,
          message
        })
      }

      logger.info(`[SOCKET.IO] Message sent from ${senderId} to ${recipientId}`)
    })

    // Handle marking messages as read
    socket.on('mark_as_read', async (data: { roomId: string }) => {
      const { roomId } = data

      logger.info(`[SOCKET.IO] mark_as_read - roomId: ${roomId}`)

      try {
        // Mark all messages sent to current user in this room as read
        await db
          .update(chatMessages)
          .set({ read: true })
          .where(eq(chatMessages.recipientId, userId))
          .execute()

        logger.info(`[SOCKET.IO] Marked messages as read in database for user: ${userId}`)
      } catch (error) {
        logger.error(`[SOCKET.IO] Error marking messages as read:`, error)
      }

      io.to(roomId).emit('messages_read', { roomId })
    })

    // Handle user leaving a chat room
    socket.on('leave_chat', (data: { recipientId: string }) => {
      const { recipientId } = data

      logger.info(`[SOCKET.IO] leave_chat - from: ${userId}, recipient: ${recipientId}`)

      if (!userId) return

      const roomId = getRoomId(userId, recipientId)
      socket.leave(roomId)

      logger.info(`[SOCKET.IO] User ${userId} left room ${roomId}`)

      socket.to(roomId).emit('user_left', {
        userId,
        userName: userName || 'Unknown'
      })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      if (userId) {
        userConnections.delete(userId)
        logger.info(`[SOCKET.IO] User ${userId} disconnected - Total connections: ${userConnections.size}`)
      }
    })

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`[SOCKET.IO] Socket error for user ${userId}:`, error)
    })
  })

  // Log active connections periodically
  setInterval(() => {
    logger.info(`[SOCKET.IO] Active connections: ${userConnections.size}`)
  }, 30000)
}

