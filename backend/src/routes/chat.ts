import { Router, Request, Response } from 'express'
import { db } from '../config/database'
import { chatMessages } from '../db/schema/chat'
import { users } from '../db/schema'
import { and, eq, or, desc, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = Router()

// Delete all messages between two users - must be defined before other routes
router.delete('/conversation/:otherUserId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId as string
    const { otherUserId } = req.params

    logger.info(`[Chat] Delete endpoint called with userId: ${userId}, otherUserId: ${otherUserId}`)

    if (!userId || !otherUserId) {
      logger.warn(`[Chat] Missing user IDs - userId: ${userId}, otherUserId: ${otherUserId}`)
      return res.status(400).json({ error: 'Missing user IDs' })
    }

    // Delete all messages between these two users
    const result = await db
      .delete(chatMessages)
      .where(
        or(
          and(
            eq(chatMessages.senderId, userId),
            eq(chatMessages.recipientId, otherUserId)
          ),
          and(
            eq(chatMessages.senderId, otherUserId),
            eq(chatMessages.recipientId, userId)
          )
        )
      )
      .execute()

    logger.info(`[Chat] Deleted conversation between ${userId} and ${otherUserId}`)
    res.json({ message: 'Conversation deleted successfully' })
  } catch (error) {
    logger.error('[Chat] Error deleting conversation:', error)
    res.status(500).json({ error: 'Failed to delete conversation' })
  }
})

// Get all conversations for current user
router.get('/conversations', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId as string

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' })
    }

    // Get all messages where user is either sender or recipient
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          eq(chatMessages.senderId, userId),
          eq(chatMessages.recipientId, userId)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .execute()

    // Build conversation map
    const conversationMap = new Map<string, { userId: string; lastMessage: string; lastMessageTime: string }>()

    for (const msg of messages) {
      const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId
      
      // Skip self-conversations
      if (otherUserId === userId) {
        continue
      }
      
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt.toISOString()
        })
      }
    }

    // Get user names for each conversation
    const conversations = []
    for (const [otherUserId, convData] of conversationMap) {
      const userResult = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, otherUserId))
        .execute()

      if (userResult && userResult.length > 0) {
        const userName = userResult[0]?.name as string
        conversations.push({
          userId: otherUserId,
          userName: userName || 'Unknown',
          lastMessage: convData.lastMessage,
          lastMessageTime: convData.lastMessageTime,
          unreadCount: 0
        })
      }
    }

    logger.info(`[Chat] Retrieved ${conversations.length} conversations for user ${userId}`)
    res.json({ conversations })
  } catch (error) {
    logger.error('[Chat] Error retrieving conversations:', error)
    res.status(500).json({ error: 'Failed to retrieve conversations' })
  }
})

// Get chat history between two users
router.get('/history/:recipientId', authenticate, async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).user?.userId
    const { recipientId } = req.params

    if (!senderId || !recipientId) {
      return res.status(400).json({ error: 'Missing user IDs' })
    }

    // Get messages between two users (both directions)
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          and(
            eq(chatMessages.senderId, senderId),
            eq(chatMessages.recipientId, recipientId)
          ),
          and(
            eq(chatMessages.senderId, recipientId),
            eq(chatMessages.recipientId, senderId)
          )
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(100) // Latest 100 messages
      .execute()

    // Reverse to get chronological order
    const orderedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      read: msg.read
    }))

    logger.info(`[Chat] Retrieved ${orderedMessages.length} messages for user ${senderId}`)
    res.json({ messages: orderedMessages })
  } catch (error) {
    logger.error('[Chat] Error retrieving messages:', error)
    res.status(500).json({ error: 'Failed to retrieve messages' })
  }
})

// Mark messages as read
router.post('/mark-read/:senderId', authenticate, async (req: Request, res: Response) => {
  try {
    const recipientId = (req as any).user?.userId
    const { senderId } = req.params

    if (!recipientId || !senderId) {
      return res.status(400).json({ error: 'Missing user IDs' })
    }

    // Update all unread messages from sender
    await db
      .update(chatMessages)
      .set({ read: true })
      .where(
        and(
          eq(chatMessages.senderId, senderId),
          eq(chatMessages.recipientId, recipientId),
          eq(chatMessages.read, false)
        )
      )
      .execute()

    logger.info(`[Chat] Marked messages as read for user ${recipientId}`)
    res.json({ success: true })
  } catch (error) {
    logger.error('[Chat] Error marking messages as read:', error)
    res.status(500).json({ error: 'Failed to mark messages as read' })
  }
})

export default router

