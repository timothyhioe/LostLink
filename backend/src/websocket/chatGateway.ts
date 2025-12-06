import type { Server, Socket } from 'socket.io'
import { logger } from '../utils/logger'

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
// Store chat history temporarily (in production, use database)
const messageHistory: Map<string, ChatMessage[]> = new Map()

function getRoomId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-')
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
    socket.on('join_chat', (data: { recipientId: string; recipientName: string }) => {
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

      // Send message history if it exists
      if (messageHistory.has(roomId)) {
        const history = messageHistory.get(roomId)!
        logger.info(`[SOCKET.IO] Sending message history to ${userId} - ${history.length} messages`)
        socket.emit('message_history', history)
      } else {
        logger.info(`[SOCKET.IO] No message history for room ${roomId}`)
        socket.emit('message_history', [])
      }

      // Notify the other user that someone joined
      logger.info(`[SOCKET.IO] Broadcasting user_joined to room ${roomId}`)
      socket.to(roomId).emit('user_joined', {
        userId,
        userName: userName || 'Unknown'
      })
    })

    // Handle incoming messages
    socket.on('send_message', (data: {
      senderId: string;
      senderName: string;
      recipientId: string;
      content: string;
      timestamp: string;
    }) => {
      const { senderId, senderName, recipientId, content, timestamp } = data

      logger.info(`[SOCKET.IO] send_message event - from: ${senderId}, to: ${recipientId}, content: "${content}"`)

      if (!senderId || !content) {
        logger.warn(`[SOCKET.IO] send_message validation failed - senderId: ${senderId}, content length: ${content?.length}`)
        socket.emit('error', 'Invalid message data')
        return
      }

      const roomId = getRoomId(senderId, recipientId)

      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        senderId,
        senderName,
        recipientId,
        content,
        timestamp,
        read: false
      }

      // Store message history
      if (!messageHistory.has(roomId)) {
        messageHistory.set(roomId, [])
      }
      messageHistory.get(roomId)!.push(message)

      logger.info(`[SOCKET.IO] Message stored - roomId: ${roomId}, messageId: ${message.id}`)
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
    socket.on('mark_as_read', (data: { roomId: string }) => {
      const { roomId } = data

      logger.info(`[SOCKET.IO] mark_as_read - roomId: ${roomId}`)

      if (messageHistory.has(roomId)) {
        const messages = messageHistory.get(roomId)!
        messages.forEach(msg => {
          msg.read = true
        })
        logger.info(`[SOCKET.IO] Marked ${messages.length} messages as read`)
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
    logger.info(`[SOCKET.IO] Active connections: ${userConnections.size}, Rooms: ${messageHistory.size}`)
  }, 30000)
}

