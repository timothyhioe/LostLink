import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from '../schema'

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: varchar('content', { length: 5000 }).notNull(),
    read: boolean('read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  table => ({
    senderIdIdx: index('idx_chat_messages_sender_id').on(table.senderId),
    recipientIdIdx: index('idx_chat_messages_recipient_id').on(table.recipientId),
    createdAtIdx: index('idx_chat_messages_created_at').on(table.createdAt),
    unreadIdx: index('idx_chat_messages_unread').on(table.recipientId, table.read)
  })
)

// Relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id]
  }),
  recipient: one(users, {
    fields: [chatMessages.recipientId],
    references: [users.id]
  })
}))
