import { useState, useEffect, useRef } from 'react'
import './ChatModal.css'
import { useChat } from '../../contexts/ChatContext'

interface ChatModalProps {
  isOpen: boolean
  recipientId: string
  recipientName: string
  itemId?: string
  itemTitle?: string
  onClose: () => void
}

export default function ChatModal({ isOpen, recipientId, recipientName, itemId, itemTitle, onClose }: ChatModalProps) {
  const { messages, sendMessage, joinChat, leaveChat, getCurrentUserId } = useChat()
  const [messageContent, setMessageContent] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [isResolved, setIsResolved] = useState(false)
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

  const handleResolveItem = async () => {
    if (!itemId) {
      setResolveError('Item ID not found')
      return
    }

    setIsResolving(true)
    setResolveError('')

    try {
      const token = localStorage.getItem('authToken')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

      const response = await fetch(`${apiUrl}/api/items/${itemId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resolve item')
      }

      setIsResolved(true)
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : 'Failed to resolve item')
      setIsResolving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">
        <div className="chat-modal-header">
          <div className="chat-modal-header-content">
            <h3>{recipientName}</h3>
            {itemTitle && <p className="chat-modal-item-title">Item: {itemTitle}</p>}
          </div>
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

        {itemId && (
          <div className="chat-resolve-section">
            {isResolved ? (
              <div className="resolve-success-message">
                ✓ Item marked as resolved!
              </div>
            ) : (
              <>
                <button 
                  onClick={handleResolveItem} 
                  disabled={isResolving}
                  className="chat-resolve-button"
                >
                  {isResolving ? 'Resolving...' : '✓ Mark Item as Resolved'}
                </button>
                {resolveError && (
                  <div className="resolve-error-message">{resolveError}</div>
                )}
              </>
            )}
          </div>
        )}

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
