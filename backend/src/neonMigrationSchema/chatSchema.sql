-- PostgreSQL Schema for Chat Messages (LostLink)
-- Add to existing Neon database

-- Chat Messages Table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(5000) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes on chat_messages table
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages(recipient_id, read) WHERE read = FALSE;

-- Update trigger for chat_messages
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
