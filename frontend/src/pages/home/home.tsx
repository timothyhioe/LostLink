import { useState, useEffect } from 'react'
import './home.css'
import Navbar from '../navbar/navbar'
import { useChat } from '../../contexts/ChatContext'

interface ItemImage {
  url: string
  filename: string
  uploadedAt: string
}

interface DBItem {
  id: string
  userId: string
  type: 'lost' | 'found'
  title: string
  description: string
  buildingName: string
  images: ItemImage[]
  tags: string[]
  status: string
  matchCount: number
  user?: {
    name: string
    email: string
  }
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
  const { openChatWithUser } = useChat()
  const [items, setItems] = useState<FoundItem[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Fetch items from backend
  useEffect(() => {
    // Get current user
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      setCurrentUserId(parsedUser.id || parsedUser._id)
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
          image: item.images.length > 0 ? `${BASE_URL}${item.images[0].url}` : '',
          what: item.title,
          where: `Wo wurde gefunden: ${item.buildingName}`,
          location_display: `Wo zu finden ist: ${item.buildingName}`,
          when: `Wann wurde gefunden: ${new Date(item.createdAt).toLocaleDateString('de-DE')} ${new Date(item.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
          founder: item.user?.name || 'Unknown'
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
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleContactButton = (item: FoundItem) => {
    if (item.userId === currentUserId) {
      alert('You cannot contact yourself!')
      return
    }
    // Open chat with this user
    openChatWithUser(item.userId, item.founder)
  }

  const handleLogoClick = () => {
    // Logo click handler
  }

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <Navbar onLogout={handleLogout} onLogoClick={handleLogoClick} isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />

      {/* Main content */}
      <div className="home-main-content">
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
                  <p className="home-item-type-label">{item.type === 'lost' ? 'Verloren' : 'Gefunden'}</p>
                  <h3 className="home-item-what">{item.what}</h3>
                  <p className="home-item-description">Description: {item.description}</p>
                  <p className="home-item-where">{item.where}</p>
                  <p className="home-item-location">{item.location_display}</p>
                  <p className="home-item-when">{item.when}</p>
                </div>

                <div className="home-item-right">
                  <p className="home-founder-label">{item.type === 'lost' ? 'Wer hat das verloren:' : 'Wer hat das gefunden:'}</p>
                  <p className="home-founder-name">{item.founder}</p>
                  <button 
                    className="home-contact-button"
                    onClick={() => handleContactButton(item)}
                    disabled={item.userId === currentUserId}
                    title={item.userId === currentUserId ? 'You cannot contact yourself' : 'Click to chat'}
                  >
                    Kontaktieren
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
