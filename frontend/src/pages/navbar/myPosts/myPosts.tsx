import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './myPosts.css'
import Navbar from "../navbar"

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
  status: string
  matchCount: number
  user?: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface UserItem extends DBItem {
  image: string
  what: string
  where: string
  location_display: string
  when: string
  founder: string
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyItems() {
  const [items, setItems] = useState<UserItem[]>([])
  const [postLimitReached, setPostLimitReached] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMyItems()
  }, [])

  // Listen for itemPosted event to refresh items
  useEffect(() => {
    const handleItemPosted = () => {
      fetchMyItems()
    }
    window.addEventListener('itemPosted', handleItemPosted)
    return () => window.removeEventListener('itemPosted', handleItemPosted)
  }, [])

  // Sync theme with localStorage when component mounts or window gains focus
  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const shouldBeDark = savedTheme === "dark";
      if (isDarkMode !== shouldBeDark) {
        setIsDarkMode(shouldBeDark);
      }
    };

    // Sync when window gains focus (user navigates back to this page)
    const handleFocus = () => {
      syncTheme();
    };

    // Listen for custom theme change events (from Navbar)
    const handleThemeChange = () => {
      syncTheme();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("themechange", handleThemeChange as EventListener);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(
        "themechange",
        handleThemeChange as EventListener
      );
    };
  }, [isDarkMode]);

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const fetchMyItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const authToken = localStorage.getItem('authToken')
      if (!authToken) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${API_BASE_URL}/items/my`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch your items')
      }

      const data = await response.json()

      // Transform backend data to frontend format
      const transformedItems: UserItem[] = data.items.map((item: DBItem) => {
        // Only prepend BASE_URL if the image URL is not already absolute
        const imageUrl = item.images.length > 0 ? item.images[0].url : '';
        const fullImageUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
          ? imageUrl
          : `${BASE_URL}${imageUrl}`;
        
        return {
          ...item,
          image: fullImageUrl,
          what: item.title,
          where: `Where found: ${item.buildingName}`,
          location_display: `Location: ${item.buildingName}`,
          when: `When found: ${new Date(item.createdAt).toLocaleDateString('en-US')} ${new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          founder: item.user?.name || 'Unknown'
        };
      })

      setItems(transformedItems)
      setPostLimitReached(transformedItems.length >= 10)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      setDeletingId(itemId)

      const authToken = localStorage.getItem('authToken')
      if (!authToken) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      // Remove item from state
      const updatedItems = items.filter(item => item.id !== itemId)
      setItems(updatedItems)
      setPostLimitReached(updatedItems.length >= 10)

      // Dispatch event to notify navbar of deletion
      window.dispatchEvent(new Event('itemDeleted'))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error deleting item:', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`my-items-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <Navbar
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main content */}
      <div className="my-items-column">
        {postLimitReached && (
          <div style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>
            You have reached the maximum of 10 posts. Delete an item to add a new one.
          </div>
        )}
        <div className="my-items-header">
          <h2>My Posts</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading your items...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Error: {error}</p>
        ) : items.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>You haven't posted any items yet</p>
        ) : (
          items.slice(0, 10).map((item) => (
            <div key={item.id} className="my-item-row">
              <div className="my-item-image">
                {item.image ? (
                  <img src={item.image} alt={item.what} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' }}>
                    No Image
                  </div>
                )}
              </div>

              <div className="my-item-details">
                <div className="my-item-header">
                  <span className={`my-item-type-label ${item.type === 'lost' ? 'lost' : 'found'}`}>
                    {item.type === 'lost' ? 'Lost' : 'Found'}
                  </span>
                </div>
                <h3 className="my-item-what">{item.what}</h3>
                <p className="my-item-description">{item.description}</p>
                
                <div className="my-item-meta">
                  <div className="my-item-location-row">
                    <img src="src/assets/Home/location_logo.png" alt="location" className="my-item-icon" />
                    <p className="my-item-location-text">{item.buildingName}</p>
                  </div>
                  <div className="my-item-date-row">
                    <img src="src/assets/Home/date_logo.png" alt="date" className="my-item-icon" />
                    <p className="my-item-date-text">
                      {new Date(item.createdAt).toLocaleDateString('en-US')} {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-item-right">
                <button
                  className="my-item-delete-button"
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
