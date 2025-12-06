import { useState, useEffect, useRef } from 'react'
import './ChatModal.css'
import { useChat } from '../../contexts/ChatContext'

interface ChatModalProps {
  isOpen: boolean
  recipientId: string
  recipientName: string
  onClose: () => void
}

export default function ChatModal({ isOpen, recipientId, recipientName, onClose }: ChatModalProps) {
  const { messages, sendMessage, joinChat, leaveChat, getCurrentUserId } = useChat()
  const [messageContent, setMessageContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = getCurrentUserId()

  useEffect(() => {
    if (isOpen && recipientId) {
      joinChat(recipientId, recipientName)
    }
    return () => {
      if (isOpen && recipientId) {
        leaveChat(recipientId)
      }
    }
  }, [isOpen, recipientId, recipientName, joinChat, leaveChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (messageContent.trim()) {
      sendMessage(recipientId, messageContent)
      setMessageContent('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">
        <div className="chat-modal-header">
          <h3>{recipientName}</h3>
          <button className="chat-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.senderId === currentUserId ? 'sent' : 'received'}`}
            >
              <div className="chat-message-sender">{msg.senderName}</div>
              <div className="chat-message-content">{msg.content}</div>
              <div className="chat-message-time">
                {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="chat-input"
            rows={3}
          />
          <button onClick={handleSendMessage} className="chat-send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
