import { useState, useEffect } from 'react'
import './Home.css'
import Navbar from './navbar/navbar'

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

export default function Home() {
  const [items, setItems] = useState<FoundItem[]>([])
  const [selectedChat, setSelectedChat] = useState<FoundItem | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch items from backend
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`${API_BASE_URL}/items?type=found`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch items')
        }
        
        const data = await response.json()
        
        // Transform backend data to frontend format
        const transformedItems: FoundItem[] = data.items.map((item: DBItem) => ({
          ...item,
          id: item._id,
          image: item.images.length > 0 ? item.images[0].url : '',
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
    if (isChatOpen) {
      setSelectedChat(null)
    }
  }

  const handleContactButton = (item: FoundItem) => {
    setSelectedChat(item)
    setIsChatOpen(true)
  }

  const handleLogoClick = () => {
    setIsChatOpen(false)
    setSelectedChat(null)
  }

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <Navbar onMessageClick={handleMessageClick} onLogout={handleLogout} onLogoClick={handleLogoClick} isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />

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
                  >
                    Kontaktieren
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right side - Chat box */}
        {isChatOpen && (
          <div className="home-chat-section">
            {selectedChat ? (
              <div className="home-chat-box">
                <div className="home-chat-header">
                  <h3>{selectedChat.founder}</h3>
                  <p>sucht nach: {selectedChat.what}</p>
                </div>
                
                <div className="home-chat-messages">
                  {/* Empty chat area */}
                </div>

                <div className="home-chat-input-area">
                  <input 
                    type="text" 
                    placeholder="Message" 
                    className="home-chat-input"
                  />
                  <button className="home-chat-send">→</button>
                </div>
              </div>
            ) : (
              <div className="home-empty-chat">
                <p>Select a contact to start messaging</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
