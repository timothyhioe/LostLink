import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './NavbarChat.css'
import { useChat } from '../../contexts/ChatContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import trashIconBlack from '../../assets/Navbar/icon-trash-black.png'
import trashIconWhite from '../../assets/Navbar/icon-trash-white.png'

interface NavbarChatProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
}

export default function NavbarChat({ isOpen, onClose, isDarkMode }: NavbarChatProps) {
  const { messages, sendMessage, joinChat, leaveChat, getCurrentUserId, conversations, selectedConversationId, setSelectedConversation, deleteConversation, connectionError } = useChat()
  const [messageContent, setMessageContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [isResolved, setIsResolved] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = getCurrentUserId()
  const currentRoomRef = useRef<string | null>(null)

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.itemTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If a conversation was selected from context, use it
  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null
    const conv = conversations.find(c => c.userId === selectedConversationId)
    return conv ? { userId: selectedConversationId, userName: conv.userName, itemId: conv.itemId, itemTitle: conv.itemTitle } : null
  }, [selectedConversationId, conversations])

  useEffect(() => {
    const newRoomId = selectedConversation?.userId || null
    
    // Only join if the room has changed
    if (newRoomId !== currentRoomRef.current) {
      // Leave old room
      if (currentRoomRef.current) {
        leaveChat(currentRoomRef.current)
      }
      
      // Join new room
      if (newRoomId) {
        joinChat(newRoomId, selectedConversation!.userName)
      }
      
      currentRoomRef.current = newRoomId
    }
  }, [selectedConversation, joinChat, leaveChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  // Reset resolve state when switching conversations
  useEffect(() => {
    setIsResolved(false)
    setResolveError('')
    setIsResolving(false)
  }, [selectedConversationId])

  const handleSendMessage = () => {
    if (messageContent.trim() && selectedConversation?.userId) {
      sendMessage(selectedConversation.userId, messageContent)
      setMessageContent('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleBackClick = useCallback(() => {
    setSelectedConversation(null)
  }, [setSelectedConversation])

  // Handle phone back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedConversation) {
        handleBackClick()
      } else {
        onClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedConversation, onClose, handleBackClick])

  const handleDeleteConversation = () => {
    if (selectedConversation?.userId) {
      setShowDeleteDialog(true)
    }
  }

  const confirmDeleteConversation = () => {
    if (selectedConversation?.userId) {
      setIsDeleting(true)
      console.log('[NavbarChat] Deleting conversation with:', {
        userId: selectedConversation.userId,
        userName: selectedConversation.userName
      });
      deleteConversation(selectedConversation.userId)
      setIsDeleting(false)
      setShowDeleteDialog(false)
      handleBackClick()
    }
  }

  const handleResolveItem = async () => {
    // Log the current state
    console.log('[NavbarChat] handleResolveItem called', {
      selectedConversationId,
      selectedConversation,
      conversations
    })

    // Check if we have item info from the conversation
    if (!selectedConversation?.itemId) {
      console.error('[NavbarChat] Missing itemId:', {
        selectedConversation,
        itemId: selectedConversation?.itemId
      })
      setResolveError('To mark items as resolved, start the chat from an item page. Item linking coming soon!')
      return
    }

    setIsResolving(true)
    setResolveError('')

    try {
      const token = localStorage.getItem('authToken')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

      console.log('[NavbarChat] Resolving item:', {
        itemId: selectedConversation.itemId,
        itemTitle: selectedConversation.itemTitle,
        apiUrl,
        token: token ? 'Present' : 'Missing'
      })

      const response = await fetch(`${apiUrl}/api/items/${selectedConversation.itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      })

      console.log('[NavbarChat] API response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resolve item')
      }

      setIsResolved(true)
      console.log('[NavbarChat] Item resolved successfully')
      // Auto close and refresh after 2 seconds
      setTimeout(() => {
        handleBackClick()
        // Refresh the page to show updated resolved status
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('[NavbarChat] Error resolving item:', error)
      setResolveError(error instanceof Error ? error.message : 'Failed to resolve item')
      setIsResolving(false)
    }
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Conversation"
        message={`Delete conversation with ${selectedConversation?.userName}?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDarkMode={isDarkMode}
        onConfirm={confirmDeleteConversation}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />

      {/* Overlay */}
      {isOpen && <div className="navbar-chat-overlay" onClick={onClose} />}

      {/* Chat Panel */}
      <div className={`navbar-chat-panel ${isOpen ? 'open' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="navbar-chat-container">
          {/* Show conversation list when no conversation is selected */}
          {!selectedConversation ? (
            <>
              <div className="navbar-chat-header">
                <h3>Messages</h3>
                <button className="navbar-chat-close" onClick={onClose}>
                  ✕
                </button>
              </div>

              <div className="navbar-chat-search-container">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="navbar-chat-search-input"
                />
              </div>

              <div className="navbar-chat-conversations-scroll">
                {filteredConversations.length === 0 ? (
                  <div className="navbar-chat-empty">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.userId}
                      className="navbar-chat-conversation"
                      onClick={() => setSelectedConversation(conv.userId, conv.userName)}
                    >
                      <div className="navbar-chat-conv-avatar">
                        {getInitials(conv.userName)}
                        {conv.unreadCount > 0 && <div className="navbar-chat-conv-indicator" />}
                      </div>
                      <div className="navbar-chat-conv-content">
                        <div className="navbar-chat-conv-header">
                          <div className="navbar-chat-conv-name">{conv.userName}</div>
                          <div className="navbar-chat-conv-date">{formatDate(conv.lastMessageTime)}</div>
                        </div>
                        <div className="navbar-chat-conv-item">{conv.itemTitle}</div>
                        {conv.lastMessage && (
                          <div className="navbar-chat-conv-preview">{conv.lastMessage}</div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Show chat window when a conversation is selected */
            <>
              <div className="navbar-chat-window-header">
                <div className="navbar-chat-header-top">
                  <button 
                    className="navbar-chat-back-btn"
                    onClick={() => setSelectedConversation(null)}
                    title="Back to conversations"
                  >
                    ←
                  </button>
                  <div className="navbar-chat-header-user">
                    <div className="navbar-chat-window-avatar">
                      {getInitials(selectedConversation.userName)}
                    </div>
                    <div className="navbar-chat-header-info">
                      <h4>{selectedConversation.userName}</h4>
                      {selectedConversation?.itemTitle && (
                        <div className="navbar-chat-header-item">{selectedConversation.itemTitle}</div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="navbar-chat-delete-btn"
                    onClick={handleDeleteConversation}
                    title="Delete conversation"
                  >
                    <img 
                      src={isDarkMode ? trashIconWhite : trashIconBlack}
                      alt="Delete"
                      className="navbar-chat-delete-icon"
                    />
                  </button>
                </div>
                {selectedConversation?.itemId && (
                  <div className="navbar-chat-resolve-row">
                    {!isResolved ? (
                      <button 
                        onClick={handleResolveItem} 
                        disabled={isResolving}
                        className="navbar-chat-resolve-button-full"
                        title="Mark this item as resolved"
                      >
                        {isResolving ? 'Resolving...' : 'Resolve Item'}
                      </button>
                    ) : (
                      <div className="navbar-resolve-success-full">✓ Item Resolved</div>
                    )}
                  </div>
                )}
              </div>

              <div className="navbar-chat-messages">
                {connectionError ? (
                  <div className="navbar-chat-error">
                    <div className="navbar-chat-error-icon">⚠️</div>
                    <div className="navbar-chat-error-title">Chat Unavailable</div>
                    <div className="navbar-chat-error-message">{connectionError}</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="navbar-chat-no-messages">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg, index) => {
                    const currentDate = new Date(msg.timestamp).toLocaleDateString('de-DE');
                    const previousDate = index > 0 ? new Date(messages[index - 1].timestamp).toLocaleDateString('de-DE') : null;
                    const showDateSeparator = currentDate !== previousDate;

                    return (
                      <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="navbar-chat-date-separator">
                            {currentDate}
                          </div>
                        )}
                        <div
                          className={`navbar-chat-message ${msg.senderId === currentUserId ? 'sent' : 'received'}`}
                        >
                          <div className="navbar-chat-message-content">{msg.content}</div>
                          <div className="navbar-chat-message-time">
                            {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {resolveError && (
                <div className="navbar-resolve-error-message">{resolveError}</div>
              )}

              <div className="navbar-chat-input-area">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="navbar-chat-input"
                  rows={1}
                />
                <button onClick={handleSendMessage} className="navbar-chat-send-button">
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
