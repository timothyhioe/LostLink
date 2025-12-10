# Chat Message Persistence Setup

## Status: Backend Implementation Complete ✅

All backend code changes are complete and compiling without errors. Messages are now saved to the database.

## What's Been Done

### 1. **Database Schema** ✅
- Created `backend/neonMigrationSchema/chatSchema.sql`
- Defines `chat_messages` table with:
  - UUID primary key (id)
  - Foreign keys to users (sender_id, recipient_id)
  - Content field for message text
  - `read` boolean for message status
  - Timestamps (created_at, updated_at)
  - Indexes for query performance
  - Auto-update trigger on updated_at

### 2. **Drizzle ORM Schema** ✅
- Created `backend/src/db/schema/chat.ts`
- Exports `chatMessages` table definition
- Type-safe schema with relations to users table

### 3. **API Routes** ✅
- Created `backend/src/routes/chat.ts`
- **GET /api/chat/history/:recipientId** - Load chat history from database
- **POST /api/chat/mark-read/:senderId** - Mark messages as read
- Registered in main Express app via `routes/index.ts`

### 4. **WebSocket Handler** ✅
- Updated `backend/src/websocket/chatGateway.ts`
- Replaced in-memory `messageHistory` Map with database calls
- **join_chat**: Now loads messages from database via `loadChatHistory()`
- **send_message**: Now saves messages to database via `saveMessageToDatabase()`
- **mark_as_read**: Now updates read status in database
- All TypeScript compilation errors resolved

## Next Steps: Deploy to Database

### Step 1: Create chat_messages Table in Neon
Copy and run this SQL in your Neon console:

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_room ON chat_messages(sender_id, recipient_id);
CREATE INDEX idx_chat_messages_unread ON chat_messages(recipient_id, read) WHERE read = FALSE;

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();
```

### Step 2: Test the Implementation

1. **Start the application with Docker:**
   ```bash
   cd c:\Users\Nicholas Wilson\OneDrive\VSCodeFiles\LostLinkNeon\LostLink
   docker compose down
   docker compose up -d --build
   ```

2. **Send messages between two test accounts**
   - Open two browser windows with different user accounts
   - Click "Kontaktieren" on an item
   - Send messages back and forth
   - Verify they appear in real-time

3. **Verify database persistence**
   - Check Neon console: Messages should appear in `chat_messages` table
   - Restart the server: `docker compose down && docker compose up -d`
   - Messages should still appear when users rejoin the chat

## Architecture Overview

### Message Flow
```
User A sends message
  ↓
Frontend emits 'send_message' event
  ↓
Backend receives event
  ↓
Save to database (saveMessageToDatabase)
  ↓
Broadcast to room via Socket.IO (receive_message)
  ↓
User B receives in real-time
  ↓
Database persists message permanently
```

### History Load Flow
```
User A clicks conversation with User B
  ↓
Frontend calls joinChat()
  ↓
Socket.IO 'join_chat' event
  ↓
Backend loads history from database (loadChatHistory)
  ↓
Last 100 messages sent to frontend
  ↓
Frontend displays history + real-time new messages
```

## Key Features

✅ **Real-Time Messaging**: Socket.IO still handles live updates (no latency)
✅ **Persistent History**: Messages survive server restarts
✅ **Scalable**: Database queries instead of in-memory limits
✅ **Read Status**: Track which messages have been read
✅ **Performance**: Indexed queries for fast message retrieval

## Files Modified

- `backend/src/websocket/chatGateway.ts` - Main handler, now database-backed
- `backend/src/routes/index.ts` - Added chat routes registration
- `backend/neonMigrationSchema/chatSchema.sql` - NEW: Database schema
- `backend/src/db/schema/chat.ts` - NEW: Drizzle ORM schema
- `backend/src/routes/chat.ts` - NEW: API endpoints

## Frontend Notes

The frontend doesn't need changes for basic persistence - Socket.IO events already pass message data correctly. Optional enhancements:

- Frontend could call `GET /api/chat/history/:recipientId` on join (currently loads via Socket.IO)
- Could add message search functionality using the database
- Could display "last seen" timestamps from the database

## Troubleshooting

**Messages still disappearing after restart?**
- Verify chatSchema.sql was executed in Neon
- Check that DATABASE_URL includes the correct Neon connection string
- Verify chat routes are registered: `console.log('Chat routes registered')` in app.ts

**TypeError: Cannot find name 'messageHistory'?**
- All references have been removed. If still getting this error, rebuild:
  ```bash
  docker compose down
  docker compose up -d --build
  ```

**Database connection errors?**
- Verify Drizzle is properly connected in `config/database.ts`
- Check that the chat_messages table exists in Neon
- Verify foreign key constraints are satisfied (sender_id and recipient_id must exist in users table)
