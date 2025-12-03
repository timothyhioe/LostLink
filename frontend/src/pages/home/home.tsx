import { useState, useEffect } from 'react'
import './home.css'
import './liveChat/liveChat.css'
import Navbar from '../navbar/navbar'
import ItemPostForm from './itemPostForm/itemPostForm'
import { useChat } from '../../context/ChatContext'

interface ItemImage {
  url: string
  filename: string
  uploadedAt: string
}

interface ItemLocation {
  type: string
  coordinates: number[]
  buildingName: string
}

interface DBItem {
  _id: string
  userId: { _id: string; name: string; email: string } | string
  type: 'lost' | 'found'
  title: string
  description: string
  location: ItemLocation
  images: ItemImage[]
  tags: string[]
  status: string
  matchCount: number
  createdAt: string
  updatedAt: string
}

interface FoundItem extends DBItem {
  id: string
  image: string
  what: string
  where: string
  location_display: string
  when: string
  founder: string
}

const API_BASE_URL = 'http://localhost:5000/api'
const BASE_URL = 'http://localhost:5000'

export default function Home() {
  const [items, setItems] = useState<FoundItem[]>([])
  const [selectedChat, setSelectedChat] = useState<FoundItem | null>(null)
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null)
  const [selectedChatUserName, setSelectedChatUserName] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPostFormOpen, setIsPostFormOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const { messages, sendMessage, joinChat, leaveChat, isConnected, getCurrentUserId, unreadNotifications, conversations, addConversation } = useChat()

  // Fetch items from backend
  useEffect(() => {
    fetchItems()
  }, [])

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Reload to login page
    window.location.href = '/login';
  };

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleMessageClick = () => {
    setIsChatOpen(!isChatOpen)
    if (isChatOpen && selectedChat) {
      const recipientId = typeof selectedChat.userId === 'string' ? selectedChat.userId : selectedChat.userId._id
      leaveChat(recipientId)
      setSelectedChat(null)
    }
  }

  const handleContactButton = (item: FoundItem) => {
    const recipientId = typeof item.userId === 'string' ? item.userId : item.userId._id
    const recipientName = typeof item.userId === 'string' ? 'Unknown' : item.userId.name
    console.log(`[Chat] Opening chat with ${recipientName} (ID: ${recipientId})`)
    addConversation(recipientId, recipientName)
    joinChat(recipientId, recipientName)
    setSelectedChat(item)
    setIsChatOpen(true)
  }

  const handleLogoClick = () => {
    if (selectedChat) {
      const recipientId = typeof selectedChat.userId === 'string' ? selectedChat.userId : selectedChat.userId._id
      leaveChat(recipientId)
    }
    setIsChatOpen(false)
    setSelectedChat(null)
  }

  const handlePostClick = () => {
    setIsPostFormOpen(true)
  }

  const handlePostFormClose = () => {
    setIsPostFormOpen(false)
  }

  const handlePostSuccess = () => {
    // Refresh items list after posting
    fetchItems()
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/items`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }
      
      const data = await response.json()
      
      // Transform backend data to frontend format
      const transformedItems: FoundItem[] = data.items.map((item: DBItem) => ({
        ...item,
        id: item._id,
        image: item.images.length > 0 ? `${BASE_URL}${item.images[0].url}` : '',
        what: item.title,
        where: `Wo wurde gefunden: ${item.location.buildingName}`,
        location_display: `Wo zu finden ist: ${item.location.buildingName}`,
        when: `Wann wurde gefunden: ${new Date(item.createdAt).toLocaleDateString('de-DE')} ${new Date(item.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
        founder: typeof item.userId === 'string' ? 'Unknown' : item.userId.name || 'Unknown'
      }))
      
      setItems(transformedItems)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <Navbar 
        onMessageClick={handleMessageClick} 
        onLogout={handleLogout} 
        onLogoClick={handleLogoClick} 
        isDarkMode={isDarkMode} 
        onThemeToggle={handleThemeToggle}
        onPostClick={handlePostClick}
        unreadCount={unreadNotifications.size}
      />

      <ItemPostForm 
        isOpen={isPostFormOpen}
        onClose={handlePostFormClose}
        isDarkMode={isDarkMode}
        onPostSuccess={handlePostSuccess}
      />

      {/* Main content */}
      <div className={`home-main-content ${isChatOpen ? 'home-chat-open' : ''}`}>
        {/* Left side - Items list */}
        <div className="home-items-column">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>Loading items...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Error: {error}</p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>No items found</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="home-item-row">
                <div className="home-item-image">
                  {item.image ? (
                    <img src={item.image} alt={item.what} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' }}>
                      No Image
                    </div>
                  )}
                </div>
                
                <div className="home-item-details">
                  <h3 className="home-item-what">{item.what}</h3>
                  <p className="home-item-description">Description: {item.description}</p>
                  <p className="home-item-where">{item.where}</p>
                  <p className="home-item-location">{item.location_display}</p>
                  <p className="home-item-when">{item.when}</p>
                </div>

                <div className="home-item-right">
                  <p className="home-founder-label">Wer hat das gefunden:</p>
                  <p className="home-founder-name">{item.founder}</p>
                  <button 
                    className="home-contact-button"
                    onClick={() => handleContactButton(item)}
                    style={{ position: 'relative' }}
                  >
                    Kontaktieren
                    {unreadNotifications.has(typeof item.userId === 'string' ? item.userId : item.userId._id) && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        !
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right side - Chat box */}
        {isChatOpen && (
          <div className="home-chat-section">
            {!selectedChat && !selectedChatUserId && conversations.length > 0 && (
              <div className="home-chat-conversations-list">
                <h3>Chats</h3>
                {conversations.map((conv) => (
                  <div 
                    key={conv.userId} 
                    className="conversation-item"
                    onClick={() => {
                      console.log(`[Chat] Opening conversation with ${conv.userName} (ID: ${conv.userId})`)
                      setSelectedChatUserId(conv.userId)
                      setSelectedChatUserName(conv.userName)
                      joinChat(conv.userId, conv.userName)
                    }}
                  >
                    <div className="conversation-name">{conv.userName}</div>
                    {conv.lastMessage && <div className="conversation-last-message">{conv.lastMessage}</div>}
                    {conv.lastMessageTime && <div className="conversation-time">
                      {new Date(conv.lastMessageTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>}
                  </div>
                ))}
              </div>
            )}
            {!selectedChat && unreadNotifications.size > 0 && (
              <div className="home-chat-notifications-list">
                <h3>New Messages</h3>
                {Array.from(unreadNotifications.entries()).map(([senderId, notif]) => (
                  <div 
                    key={senderId} 
                    className="notification-item"
                    onClick={() => {
                      const recipientName = notif.senderName
                      console.log(`[Chat] Opening chat from notification with ${recipientName} (ID: ${senderId})`)
                      setSelectedChatUserId(senderId)
                      setSelectedChatUserName(recipientName)
                      joinChat(senderId, recipientName)
                      addConversation(senderId, recipientName)
                    }}
                  >
                    <div className="notification-sender">{notif.senderName}</div>
                    <div className="notification-content">{notif.content}</div>
                    <div className="notification-time">
                      {new Date(notif.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(selectedChat || selectedChatUserId) ? (
              <div className="home-chat-box">
                <div className="home-chat-header">
                  <h3>{selectedChat?.founder || selectedChatUserName}</h3>
                  {selectedChat && <p>sucht nach: {selectedChat.what}</p>}
                  <span className={`online-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                </div>
                
                <div className="home-chat-messages">
                  {messages.length === 0 ? (
                    <div className="empty-messages">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`message ${msg.senderId === getCurrentUserId() ? 'sent' : 'received'}`}
                      >
                        <div className="message-sender">{msg.senderName}</div>
                        <div className="message-bubble">
                          <div className="message-content">{msg.content}</div>
                          <div className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="home-chat-input-area">
                  <input 
                    type="text" 
                    placeholder="Message" 
                    className="home-chat-input"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && chatMessage.trim()) {
                        const recipientId = selectedChat 
                          ? (typeof selectedChat.userId === 'string' ? selectedChat.userId : selectedChat.userId._id)
                          : selectedChatUserId
                        if (recipientId) {
                          sendMessage(recipientId, chatMessage)
                          setChatMessage('')
                        }
                      }
                    }}
                  />
                  <button 
                    className="home-chat-send"
                    onClick={() => {
                      if (chatMessage.trim()) {
                        const recipientId = selectedChat 
                          ? (typeof selectedChat.userId === 'string' ? selectedChat.userId : selectedChat.userId._id)
                          : selectedChatUserId
                        if (recipientId) {
                          sendMessage(recipientId, chatMessage)
                          setChatMessage('')
                        }
                      }
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            ) : (
              <div className="home-empty-chat">
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
